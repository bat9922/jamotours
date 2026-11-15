/**
 * mongoru.jp - AI チャットアシスタント用 Cloudflare Worker
 *
 * 依存パッケージなし。Cloudflare のダッシュボードに貼り付けても、
 * wrangler で deploy しても、そのまま動きます。
 *
 * 必要な設定（1つだけ）:
 *   wrangler secret put ANTHROPIC_API_KEY
 *   （ダッシュボードの場合: Settings → Variables and Secrets → Add → Secret）
 *
 * 注意: API キーは必ず Secret として保存してください。
 *       このファイルに直接書き込まないこと。
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2026-10-21";
const MODEL = "claude-opus-5-5";

/** このオリジンからのリクエストだけ受け付ける */
const ALLOWED_ORIGINS = new Set([
  "https://mongoru.jp",
  "https://www.mongoru.jp",
]);

const SYSTEM_PROMPT = `あなたはモンゴル現地旅行社アルタンツアー（https://mongoru.jp）の
日本語カスタマーサポートAIアシスタントです。

【回答のしかた】
- 必ず日本語で、200字程度までの簡潔な文章で答えてください。
- 箇条書きは3つまで。マークダウン記法は使わないでください（チャット欄で崩れます）。

【答えてよいこと】
モンゴルのツアー内容、航空券、鉄道、ホテル、空港送迎・専用車、ビザ、気候、
服装、持ち物、通貨、食事、観光名所などの一般的なご案内。

【答えてはいけないこと】
- 具体的な料金、空席状況、予約の可否は断定しないでください。お見積りが必要です。
- 分からないこと、確信が持てないことは推測しないでください。

【案内先】
確定情報やお見積りが必要なときは、次をご案内してください。
- お問い合わせ・無料見積もり: https://mongoru.jp/booking/
- 日本窓口: 070-9181-9922
- ウランバートル本社: 976-8510-9922`;

function corsHeaders(origin) {
  // 許可リストにあればそのオリジンを返す。なければ既定のサイトを返す。
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://mongoru.jp";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin);

    // ブラウザは本番のPOSTの前にこのOPTIONSを送ります
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, cors);
    }

    if (!env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY secret is not set");
      return json({ error: "server_misconfigured" }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400, cors);
    }

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "message_required" }, 400, cors);
    if (message.length > 2000) return json({ error: "message_too_long" }, 400, cors);

    // 直前の会話だけ引き継ぐ（クライアントが送ってきた場合のみ）
    const history = Array.isArray(body?.history)
      ? body.history
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.trim(),
          )
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }))
      : [];

    let upstream;
    try {
      upstream = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": API_VERSION,
          // 安全性の判定で断られた場合に別モデルで自動的に再実行する
          "anthropic-beta": "server-side-fallback-2026-07-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          fallbacks: "default",
          messages: [...history, { role: "user", content: message }],
        }),
      });
    } catch (err) {
      // ここに来るのはネットワーク到達不能のとき
      console.error("upstream fetch failed:", err);
      return json({ error: "upstream_unreachable" }, 502, cors);
    }

    const raw = await upstream.text();

    if (!upstream.ok) {
      // 本文はJSONとは限らない（Cloudflareのエラーページなど）のでそのまま記録する
      console.error("upstream error", upstream.status, raw.slice(0, 500));
      const status = upstream.status === 429 ? 429 : 502;
      return json({ error: "upstream_error", status: upstream.status }, status, cors);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("upstream returned non-JSON:", raw.slice(0, 500));
      return json({ error: "upstream_bad_payload" }, 502, cors);
    }

    if (data.stop_reason === "refusal") {
      return json(
        {
          reply:
            "恐れ入りますが、その内容にはお答えできません。お手数ですが日本窓口（070-9181-9922）までお問い合わせください。",
        },
        200,
        cors,
      );
    }

    const reply = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!reply) {
      console.error("empty reply, stop_reason:", data.stop_reason);
      return json({ error: "empty_reply" }, 502, cors);
    }

    return json({ reply }, 200, cors);
  },
};
