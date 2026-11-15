# AI チャットアシスタント用 Cloudflare Worker

mongoru.jp のトップページにあるチャットウィジェットの送信先です。
ブラウザ → この Worker → Google Gemini API、という流れで動きます。

API キーをブラウザに出さないために Worker を挟んでいます。
キーは Worker の Secret に保存され、ページのソースには現れません。

---

## 設定（Secret は1つだけ）

API キーは [Google AI Studio](https://aistudio.google.com) で発行します。

### wrangler を使う場合

```bash
cd worker
npx wrangler secret put GEMINI_API_KEY   # 貼り付けて Enter
npx wrangler deploy
```

### Cloudflare のダッシュボードを使う場合

`worker.js` の中身をそのままエディタに貼り付けて保存します（依存パッケージなし）。
そのあと **Settings → Variables and Secrets → Add** で

| 種類 | 名前 | 値 |
|---|---|---|
| Secret | `GEMINI_API_KEY` | 発行したキー |

を追加してください。**Secret**（Text ではなく）を選ぶこと。

> キーを `worker.js` に直接書かないでください。このリポジトリは公開されています。

---

## 動作確認

```bash
curl -i https://mongol.bzorig9922.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"message":"テレルジのツアーはありますか"}'
```

| 返ってくるもの | 意味 |
|---|---|
| `200 {"reply":"...","conversationId":"...","truncated":false}` | 正常 |
| `500 {"error":"server_misconfigured"}` | `GEMINI_API_KEY` が未設定 |
| `502 {"error":"upstream_error","status":400}` | キーが無効、またはリクエスト内容の誤り |
| `502 {"error":"upstream_error","status":403}` | キーの権限不足 |
| `429` | 無料枠のレート上限 |
| `502 {"error":"upstream_unreachable"}` | 送信先ホストに到達できない |

ログは `npx wrangler tail`、またはダッシュボードの **Logs** で見られます。
上流のエラー本文はログに出るので、原因はそこで分かります。

---

## API について

| | |
|---|---|
| エンドポイント | `POST https://generativelanguage.googleapis.com/v1beta/interactions` |
| 認証 | ヘッダー `x-goog-api-key` |
| 版の固定 | ヘッダー `Api-Revision: 2026-05-20` |
| モデル | `gemini-3.5-flash-lite`（最も速く、最も安い系列） |
| 出力上限 | `generation_config.max_output_tokens = 500` |

返答の本文は `steps[]` のうち `type: "model_output"` のもの、その中の
`content[]` の `type: "text"` にあります。複数に分かれることがあるので
`worker.js` では全部つなげています。

`status` が `incomplete` のときは出力が上限で切れているので、
レスポンスに `truncated: true` を付けて返します。

### 会話の継続（実装済み）

このエンドポイントは Gemini 側が会話履歴を持ちます。
レスポンスの `conversationId` を次のリクエストに送り返すと、
前のやり取りを踏まえた返答になります。履歴を自分で組み立てる必要はありません。

`index.html` のチャットは実装済みです。

```js
let conversationId = null;                                  // ページを開いた時点では空
body: JSON.stringify({ message: text, conversationId })      // 送る
if (data.conversationId) conversationId = data.conversationId; // 覚える
```

ページを再読み込みすると会話は最初からになります。

会話IDが古くなって使えなくなった場合、Worker は履歴なしで一度だけ
自動的にやり直します（会話は続かないが、エラーにはならない）。

---

## ツアー情報の更新

`worker.js` の `TOUR_CATALOG` に、サイトに実在するツアーの
「名前 ・ 日数 ・ URL」を一覧で持たせています。AIはこの一覧にあるツアーだけを
案内し、ここにないものは「オーダーメイド」として案内します。

**ツアーページを追加・削除・改名したら、この一覧も直してください。**
直さないと、AIが存在しないページを案内したり、新しいツアーを知らないままになります。

---

## つまずきやすい点

**1. `WORKER_URL` から `https://` を落とさない**

`index.html` の

```js
const WORKER_URL = "https://mongol.bzorig9922.workers.dev";
```

から `https://` を外すと、ブラウザは相対パスとして扱い
`https://mongoru.jp/mongol.bzorig9922.workers.dev` を取りにいきます。
返ってくるのは GitHub Pages の 404 ページなので `response.json()` が失敗し、
チャットには「通信エラー」とだけ表示されます。
過去に何度もここで止まっています。チャットが動かないときは最初にここを見てください。

**2. `error code: 1016` が出たら**

Cloudflare が返す「Origin DNS error」です。Worker が fetch している
ホスト名が解決できていません。送信先が
`https://generativelanguage.googleapis.com/v1beta/interactions`
になっているか確認してください。

**3. CORS**

`worker.js` の `ALLOWED_ORIGINS` に載っているオリジンからのみ受け付けます。
サイトのドメインを変えたらここも変更してください。

---

## 費用とデータの扱い

`gemini-3.5-flash-lite` は無料枠があります（有料は入力 $0.30 / 出力 $2.50 per 1M tokens）。

ただし **無料枠で送った内容は Google が製品改善に利用する場合があります**。
お客様の問い合わせ内容を扱うため、気になる場合は有料枠への切り替えをご検討ください。

無料枠のレート上限（1分あたり / 1日あたりの回数）は公開ドキュメントに
数値が載っていません。実際の上限は
[Google AI Studio のレート上限ページ](https://aistudio.google.com/rate-limit)
で確認できます。
