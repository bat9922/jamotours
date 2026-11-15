/**
 * mongoru.jp - AI チャットアシスタント用 Cloudflare Worker
 *
 * 送信先: Google Gemini API（Interactions エンドポイント）
 * 依存パッケージなし。Cloudflare のダッシュボードに貼り付けても、
 * wrangler で deploy しても、そのまま動きます。
 *
 * 必要な設定（1つだけ）:
 *   wrangler secret put GEMINI_API_KEY
 *   （ダッシュボードの場合: Settings → Variables and Secrets → Add → Secret）
 *
 * 注意: API キーは必ず Secret として保存してください。
 *       このファイルに直接書き込まないこと（このリポジトリは公開されています）。
 */

const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
const MODEL = "gemini-3.5-flash-lite";
const MAX_OUTPUT_TOKENS = 500;

/** このオリジンからのリクエストだけ受け付ける */
const ALLOWED_ORIGINS = new Set([
  "https://mongoru.jp",
  "https://www.mongoru.jp",
]);

const SYSTEM_INSTRUCTION = `あなたはモンゴル現地旅行社アルタンツアー（https://mongoru.jp）の
日本語カスタマーサポートAIアシスタントです。

【回答のしかた】
- 必ず日本語で、200字程度までの簡潔な文章で答えてください。
- 箇条書きは3つまで。マークダウン記法（**や#）は使わないでください。チャット欄で崩れます。

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

/**
 * 返答の本文は steps[] の中の model_output、その content[] の中の text。
 * 複数に分かれている場合があるので全部つなげる。
 */
function extractText(data) {
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const parts = [];
  for (const step of steps) {
    if (step?.type !== "model_output") continue;
    const content = Array.isArray(step.content) ? step.content : [];
    for (const block of content) {
      if (block?.type === "text" && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }
  return parts.join("").trim();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin);

    // ブラウザは本番の POST の前にこの OPTIONS を送ります
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, cors);
    }

    if (!env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY secret is not set");
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

    // 会話を続ける場合、クライアントは前回の conversationId を送り返します。
    // Gemini 側が履歴を保持するので、こちらで会話を組み立てる必要はありません。
    const previousId =
      typeof body?.conversationId === "string" && body.conversationId.trim()
        ? body.conversationId.trim()
        : null;

    const payload = {
      model: MODEL,
      system_instruction: SYSTEM_INSTRUCTION,
      input: message,
      generation_config: { max_output_tokens: MAX_OUTPUT_TOKENS },
    };
    if (previousId) payload.previous_interaction_id = previousId;

    let upstream;
    try {
      upstream = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
          "Api-Revision": API_REVISION,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // ここに来るのは送信先に到達できなかったとき（DNS、ネットワーク）
      console.error("upstream fetch failed:", err);
      return json({ error: "upstream_unreachable" }, 502, cors);
    }

    const raw = await upstream.text();

    if (!upstream.ok) {
      // 本文が JSON とは限らない（エラーページが返ることがある）のでそのまま記録する
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

    if (data.status === "failed" || data.status === "cancelled") {
      console.error("interaction", data.status, raw.slice(0, 500));
      return json({ error: "generation_failed", status: data.status }, 502, cors);
    }

    const reply = extractText(data);

    if (!reply) {
      // 安全性フィルタで止められた場合もここに来ます
      console.error("empty reply, status:", data.status, raw.slice(0, 500));
      return json(
        {
          reply:
            "恐れ入りますが、その内容にはお答えできませんでした。お手数ですが日本窓口（070-9181-9922）またはお問い合わせフォームよりご連絡ください。",
        },
        200,
        cors,
      );
    }

    // status が incomplete のときは max_output_tokens で切れています
    const truncated = data.status === "incomplete";

    return json(
      {
        reply,
        conversationId: typeof data.id === "string" ? data.id : null,
        truncated,
      },
      200,
      cors,
    );
  },
};
