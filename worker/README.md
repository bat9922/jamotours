# AI チャットアシスタント用 Cloudflare Worker

mongoru.jp のトップページにあるチャットウィジェットの送信先です。
ブラウザ → この Worker → Claude API、という流れで動きます。

API キーをブラウザに出さないために Worker を挟んでいます。
キーは Worker の Secret に保存され、ページのソースには現れません。

---

## 設定（Secret は1つだけ）

API キーは [platform.claude.com](https://platform.claude.com) で発行します。

### wrangler を使う場合

```bash
cd worker
npx wrangler secret put ANTHROPIC_API_KEY   # 貼り付けて Enter
npx wrangler deploy
```

### Cloudflare のダッシュボードを使う場合

`worker.js` の中身をそのままエディタに貼り付けて保存します（依存パッケージなし）。
そのあと **Settings → Variables and Secrets → Add** で

| 種類 | 名前 | 値 |
|---|---|---|
| Secret | `ANTHROPIC_API_KEY` | 発行したキー |

を追加してください。**Secret**（Text ではなく）を選ぶこと。

> キーを `worker.js` に直接書かないでください。このリポジトリは公開されています。

---

## 動作確認

```bash
curl -i https://mongol.bzorig9922.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"message":"テスト"}'
```

| 返ってくるもの | 意味 |
|---|---|
| `200` + `{"reply":"..."}` | 正常 |
| `500 {"error":"server_misconfigured"}` | `ANTHROPIC_API_KEY` が未設定 |
| `502 {"error":"upstream_error","status":401}` | キーが間違っている |
| `502 {"error":"upstream_error","status":400}` | リクエスト内容の誤り（ログを確認） |
| `429` | リクエストが多すぎる |
| `502 {"error":"upstream_unreachable"}` | 送信先ホストに到達できない |

ログは `npx wrangler tail`、またはダッシュボードの **Logs** で見られます。

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

**2. `error code: 1016` が出たら**

これは Cloudflare が返す「Origin DNS error」です。Worker が fetch している
ホスト名が解決できていません。送信先が `https://api.anthropic.com/v1/messages`
になっているか確認してください。

**3. CORS**

`worker.js` の `ALLOWED_ORIGINS` に載っているオリジンからのみ受け付けます。
サイトのドメインを変えたらここも変更してください。

---

## 使っているモデル

`claude-opus-5-5`。安くしたい場合は `worker.js` の `MODEL` を
`claude-haiku-5-5` に変えてください（入力 $0.10 / 出力 $0.50 per 1M tokens）。

安全性の判定で断られたときに別モデルで自動的に再実行する
`fallbacks: "default"` を有効にしています。不要なら
`anthropic-beta` ヘッダーと `fallbacks` の行を削除してください。
