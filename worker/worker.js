/**
 * mongoru.jp - AI チャットアシスタント用 Cloudflare Worker
 *
 * 送信先: Google Gemini API（Interactions エンドポイント）
 * 依存パッケージなし。Cloudflare のダッシュボードに貼り付けても、
 * wrangler で deploy しても、そのまま動きます。
 *
 * 必要な設定（1つだけ）:
 *   Settings → Variables and Secrets → Secret: GEMINI_API_KEY
 *
 * 注意: API キーは必ず Secret として保存してください。
 *       このファイルに直接書き込まないこと（このリポジトリは公開されています）。
 */

const API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
const MODEL = "gemini-3.5-flash-lite";
const MAX_OUTPUT_TOKENS = 800;

/** このオリジンからのリクエストだけ受け付ける */
const ALLOWED_ORIGINS = new Set([
  "https://mongoru.jp",
  "https://www.mongoru.jp",
]);

/* ========================================================================
   ツアー情報（mongoru.jp の実在ページのみ。ここにないツアーは案内しない）
   ======================================================================== */
const TOUR_CATALOG = `
■ 乗馬
テレルジ 亀岩・アリヤバル寺院・文化体験付き 1泊2日 /terelj-horse-riding-2-day/
チンギスハーン騎馬像と奥テレルジ 2泊3日 /chinggiskhaan-complex-terelj-3-day/
チンギスハーン騎馬像・13世紀村・遊牧民宅滞在 3泊4日 /chinggis-13th-century-home-stay-4-day/
テレルジ国立公園 乗馬 3泊4日 /mongolia-horse-tour/terelj-3n4d.html
テレルジ トメンハーンリゾート 文化体験付き 4泊5日 /terelj-horse-riding-5-day/
ホスタイ国立公園（野生馬タヒ）とブルド砂丘 4泊5日 /khustai-takhi-bulgan-dunes-horse-5-day/
遊牧民ショー付き ノマディックキャンプ 4泊5日 /terelj-nomadic-show-horse-5-day/
テレルジ 亀岩・寺院観光と遊牧民宅泊 5泊6日 /terelj-horse-riding-6-day/
テレルジとブルド砂丘 ラクダ乗り体験付き 6泊7日 /terelj-horse-riding-7-day/
乗馬ツアー一覧 /mongolia-horse-tour/

■ ゴビ砂漠・大草原・砂丘
モンゴル ゴビ砂漠 6日間 /gobi-tours-6-days/
ブルド砂丘と遊牧民ショー観戦 /burd-sand-and-mongol-nomadic-tours/
大草原ツアー（メネン平原ほか）全4コース /steppe-tour-site/
メネン平原の旅 6泊7日 /steppe-tour-site/menen-steppe-dornod-tour-6n7d.html

■ 歴史・世界遺産・仏教
歴史・遺跡めぐり（カラコルム、エルデネゾー）5日間 /kharkhorin-5-day-tour/
歴史・遺跡ツアー一覧 /history-tour-site/
カラコルム・エルデネゾー・ホショーツァイダム 4泊5日 /history-tour-site/kharkorum-erdene-zuu-khoshoo-tsaidam-4n5d.html
世界遺産ツアー 全8コース /world-heritage-tour-site/
オルホン渓谷の文化的景観 5泊6日 /world-heritage-tour-site/orkhon-valley-world-heritage-tour-5n6d.html
仏教ツアー 全4コース /buddhism-tour-site/
世界遺産エルデネゾー寺院を訪ねる旅 4泊5日 /buddhism-tour-site/erdene-zuu-monastery-buddhist-tour-4n5d.html

■ 自然・ハイキング・国立公園
フラワーハイキング一覧（6〜8月）/flower-hiking-site/
テレルジ フラワーハイキング 5日間 /terelj-flower-hiking-5-days/
ボグド山国立公園 フラワーハイキング 4泊5日 /flower-hiking-site/bogd-flower-hiking-4n5d.html
国立公園ツアー 全4コース /national-park-tour-site/
ボグド山・テレルジとチンギスハーン騎馬像 3泊4日 /national-park-tour-site/bogd-khan-terelj-national-park-tour-3n4d.html
登山ツアー 全6コース /mountain-tour-site/
フイテン峰（4,374m）登頂 9泊10日 /mountain-tour-site/khuiten-peak-altai-tavan-bogd-9n10d.html

■ 生きもの・釣り
野鳥観察ツアー 全6コース /birdwatching-tour-site/
トーラ川・テレルジ バードウォッチング 4泊5日 /birdwatching-tour-site/tuul-river-terelj-birdwatching-4n5d.html
昆虫採集ツアー 全10コース（30年の実績）/insect-collecting-tour-site/
テレルジ国立公園周辺で昆虫採集 7泊8日 /insect-collecting-tour-site/terelj-national-park-insect-collecting-tour-7n8d.html
ツェンケル温泉とテレルジで昆虫採集 7泊8日 /insect-collecting-tour-site/tsenkher-hot-spring-terelj-insect-collecting-tour-7n8d.html
バヤンチャンドマンとテレルジで昆虫採集 7泊8日 /insect-collecting-tour-site/bayanchandmani-terelj-insect-collecting-tour-7n8d.html
ヘンテイ県ハンガル湖で昆虫採集 7泊8日 /insect-collecting-tour-site/khentii-khangal-lake-insect-collecting-tour-7n8d.html
セレンゲ県（ロシア国境付近）で昆虫採集 7泊8日 /insect-collecting-tour-site/selenge-russian-border-insect-collecting-tour-7n8d.html
トンボ採集ツアー 7泊8日 /insect-collecting-tour-site/mongolia-dragonfly-collecting-tour-7n8d.html
ウブス県ハルヒラー山で昆虫採集 8泊9日 /insect-collecting-tour-site/uvs-kharkhiraa-mountain-insect-collecting-tour-8n9d.html
フブスグル湖北部で昆虫採集 9泊10日 /insect-collecting-tour-site/khuvsgul-lake-insect-collecting-tour-9n10d.html
アルタイ山脈 中国国境付近で昆虫採集 9泊10日 /insect-collecting-tour-site/altai-mountains-insect-collecting-tour-9n10d.html
モンゴル一周 昆虫採集 1か月 /insect-collecting-tour-site/mongolia-round-trip-insect-collecting-tour-30days.html
イトウ釣りツアー /taimen-fishing-site/
オノン・バルジ川 イトウ釣り 7泊8日 /taimen-fishing-site/onon-balj-taimen-fishing-7n8d.html
ハンティング撮影ツアー 全4コース /hunting-tour-site/
オオカミ ハンティング撮影 7泊8日 /hunting-tour-site/wolf-hunting-photo-tour-7n8d.html

■ 文化・体験・遊牧民
遊牧民ホームステイ 5日間 /nomadic-home-stay-5-days/
オプショナルツアー 全12コース（日帰り〜2泊3日）/optional-tour-site/
モンゴル伝統料理を作って味わう旅 1泊2日 /optional-tour-site/mongolian-cooking-experience-terelj-1n2d.html
シャーマン（ボー信仰）ツアー 全4コース /shaman-tour-site/
シャーマン体験ツアー 4泊5日 /shaman-tour-site/mongolia-shaman-experience-tour-4n5d.html
モンゴル相撲力士が同行する旅 全4コース /sumo-wrestler-tour-site/
力士と一緒に1日市内観光 /sumo-wrestler-tour-site/ulaanbaatar-city-tour-with-mongolian-wrestler-1day.html
星空観察ツアー 全4コース /stargazing-tour-site/
テレルジ 星空観察 3泊4日 /stargazing-tour-site/terelj-stargazing-tour-3n4d.html

■ 乗りもの
シベリア鉄道の旅 全4コース /railway-tour-site/
スフバートル・ロシア国境の旅 4泊5日 /railway-tour-site/sukhbaatar-russian-border-railway-4n5d.html
オフロードバイクツアー 全4コース /offroad-bike-tour-site/
テレルジ オフロードバイク 4泊5日 /offroad-bike-tour-site/terelj-offroad-motorcycle-tour-4n5d.html
テレルジ オフロードバイク 5日間 /bike-tours-5-days/

■ イベント・特別企画
祭り・イベント一覧（ナーダム、ツァガーンサル、イーグルフェスティバル）/festival-event-tour-site/
国際マラソンツアー 全4コース /marathon-tour-site/
ウランバートル国際マラソン参加 2泊3日 /marathon-tour-site/ulaanbaatar-international-marathon-2n3d.html
VIVANTロケ地めぐり 全4コース /vivant-location-tour-site/
VIVANTロケ地 テレルジ 3泊4日 /vivant-location-tour-site/vivant-terelj-nalaikh-tour-3n4d.html

■ 法人・教育
社員旅行・企業視察 全4コース /company-trip-business-tour-site/
モンゴル企業を訪問する旅 2泊3日 /company-trip-business-tour-site/mongolia-company-visit-business-tour-2n3d.html
修学旅行・教育旅行 全4コース /education-tour-site/
ウランバートル学校訪問 3泊4日 /education-tour-site/ulaanbaatar-school-visit-tour-3n4d.html
業務渡航・出張手配 /モンゴル業務渡航について/
旅行会社・法人・団体のお客様へ /travel-company/

■ 手配（ツアー以外）
オーダーメイドツアー /ordermade/
航空券・時刻表・手荷物 /ticket-info-2/
鉄道・列車切符 /ticket-info-2/railway/
ビザ・入国 /ticket-info-2/visa/
ホテル予約とタリフ /hotel-info/
空港送迎・専用車（ドライバー付き）/private-car/
日本語ガイド /japanese-guide/

■ 情報ページ
モンゴルを知る（気候・通貨・食事・お土産など）/mongolia-info/
観光名所 /mongolia-info/sightseeing/
博物館情報 /mongolia-info/museums/
よくあるご質問 /q-and-a/
お申込みから出発までの流れ /guide-flow/
リピーター割引 /guide-repeater/
会社案内 /company-info/
`;

const SYSTEM_INSTRUCTION = `あなたはモンゴル現地旅行社アルタンツアー（https://mongoru.jp）の
日本語コンシェルジュです。25年の経験を持つ現地旅行社の相談員として振る舞ってください。

# 相談員としての考え方

単に質問に答えるのではなく、お客様の旅を一緒に組み立ててください。

1. まず相手の状況を理解する。不足している情報があれば、一度に1〜2個だけ質問する。
   聞くべきこと: 時期（何月か）、日数、人数と年齢構成、興味（乗馬・砂漠・自然・文化・写真など）、
   体力や移動の希望。すべてを一度に尋ねないこと。
2. 分かった範囲で必ず具体的なツアーを1〜3件挙げる。「いろいろあります」で終わらせない。
   挙げるときは必ずツアー名・日数・ページのURLをセットで示す。
3. なぜそれを勧めるのかを一言添える。季節、体力、同行者、興味との対応を説明する。
4. 最後に次の一歩を示す。見積りフォームか電話。

# 季節の知識（相談の土台）

- 6〜8月: ベストシーズン。草原が緑、花も多い。ナーダム祭りは7月中旬。
- 5月・9月: 観光客が少なく静か。朝晩は冷える。
- 7〜8月: フラワーハイキング、昆虫採集、野鳥観察の適期。
- 冬（11〜2月）: 氷点下20〜30度。イーグルフェスティバルや冬の特別企画向き。
- ゴビ砂漠は日中暑く夜は冷える。寒暖差への備えが必要。

# 回答の形式

- 必ず日本語。300字程度まで。長い説明より、具体的な提案を優先する。
- マークダウン記法（**、#、-）は使わない。チャット欄で崩れる。
- URLは https://mongoru.jp を付けた完全な形で書く。例: https://mongoru.jp/gobi-tours-6-days/
- 箇条書きが必要なときは「・」を使い、3項目まで。

# 守ること

- 料金・空席・催行可否は絶対に断定しない。「お見積りが必要です」と伝える。
- 下のツアー一覧にないツアーを作らない。該当がなければオーダーメイドを案内する。
- 分からないこと、確信が持てないことは推測しない。スタッフへの連絡を案内する。
- 航空券の値段、ビザの最新要件、天候の予測は変動するため断定しない。

# 案内先

- お問い合わせ・無料見積もり: https://mongoru.jp/booking/
- 日本窓口: 070-9181-9922
- ウランバートル本社: 976-8510-9922
- オーダーメイドツアー: https://mongoru.jp/ordermade/

# 取り扱いツアー一覧（これ以外は案内しない）
${TOUR_CATALOG}`;

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

    // 会話の継続: クライアントが前回の conversationId を送り返すと、
    // Gemini 側が履歴を保持しているので前のやり取りを踏まえて答えます。
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
      // 会話IDが期限切れ等で使えない場合は、履歴なしで一度だけやり直す
      if (previousId && (upstream.status === 400 || upstream.status === 404)) {
        console.warn("retrying without previous_interaction_id", upstream.status);
        delete payload.previous_interaction_id;
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
          console.error("retry fetch failed:", err);
          return json({ error: "upstream_unreachable" }, 502, cors);
        }
        if (!upstream.ok) {
          const t = await upstream.text();
          console.error("retry failed", upstream.status, t.slice(0, 500));
          return json({ error: "upstream_error", status: upstream.status }, 502, cors);
        }
        const retryRaw = await upstream.text();
        return finish(retryRaw, cors);
      }

      console.error("upstream error", upstream.status, raw.slice(0, 500));
      const status = upstream.status === 429 ? 429 : 502;
      return json({ error: "upstream_error", status: upstream.status }, status, cors);
    }

    return finish(raw, cors);

    function finish(text, cors) {
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("upstream returned non-JSON:", text.slice(0, 500));
        return json({ error: "upstream_bad_payload" }, 502, cors);
      }

      if (data.status === "failed" || data.status === "cancelled") {
        console.error("interaction", data.status, text.slice(0, 500));
        return json({ error: "generation_failed", status: data.status }, 502, cors);
      }

      const reply = extractText(data);

      if (!reply) {
        // 安全性フィルタで止められた場合もここに来ます
        console.error("empty reply, status:", data.status, text.slice(0, 500));
        return json(
          {
            reply:
              "恐れ入りますが、その内容にはお答えできませんでした。お手数ですが日本窓口（070-9181-9922）またはお問い合わせフォームよりご連絡ください。",
          },
          200,
          cors,
        );
      }

      return json(
        {
          reply,
          conversationId: typeof data.id === "string" ? data.id : null,
          truncated: data.status === "incomplete",
        },
        200,
        cors,
      );
    }
  },
};
