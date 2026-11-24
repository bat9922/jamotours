# Security deployment checklist

The code changes in this repository fail closed: the AI chat will reject a
request unless the Cloudflare Turnstile secret and rate-limit binding are
configured. Do these steps before deploying.

## 1. Configure Turnstile

1. In Cloudflare Dashboard, create a Turnstile widget named `mongoru-ai-chat`.
2. Restrict its hostnames to `mongoru.jp` and `www.mongoru.jp` only.
3. Put the **public site key** in `wp-content/security-config.js`.
4. Store the matching secret outside the repository:

   ```powershell
   cd worker
   npx wrangler secret put TURNSTILE_SECRET
   ```

5. Deploy the Worker with Wrangler 4.36.0 or newer. The rate-limit binding in
   `worker/wrangler.toml` permits six chat requests per IP address per minute.
   If the account already uses namespace `2026112401`, replace it with another
   unused positive integer before deployment.

   ```powershell
   npx wrangler deploy
   ```

`GEMINI_API_KEY` remains a Worker secret and must never be added to a file or
Git history. Turnstile tokens are validated server-side, bound to the expected
action (`ai_chat`) and hostname, and are single-use.

## 2. Protect the GitHub Pages site at Cloudflare

GitHub Pages does not apply custom response headers from this repository. Put
`mongoru.jp` behind Cloudflare's proxy, then set these **Response Header
Transform Rules** for `mongoru.jp/*` and `www.mongoru.jp/*`:

| Header | Value |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), geolocation=(), microphone=(), payment=(), usb=()` |

Start the Content Security Policy in **Report-Only** mode first, because this
static WordPress export contains inline scripts. Monitor violations, remove
unused scripts, then enforce a policy that permits only the specific first- and
third-party origins actually used. Do not use `*` in `script-src`.

Add a Cloudflare WAF rate-limiting rule for the Worker route: block or
Managed Challenge a client that exceeds **10 requests in 60 seconds**. The
Worker's per-IP limit remains the second layer and protects the paid Gemini
upstream even if WAF settings are changed.

## 3. Protect the contact forms

The booking and contact forms now require Web3Forms hCaptcha. In the
Web3Forms dashboard, enable **hCaptcha** for access key
`e2b0a2c1-488e-473e-a9d4-4d3fa86a1021` before publishing these changes.

If the account is upgraded to Web3Forms Pro, also enable **Domain Restriction**
for `mongoru.jp` and `www.mongoru.jp`; then configure its Cloudflare Turnstile
option with a separate widget. Do not place any captcha secret in the browser
or this repository.

## 4. Verify after deployment

1. Open an AI chat on `https://mongoru.jp` and confirm a Turnstile challenge
   must complete before a response is returned.
2. Confirm a direct Worker request without a valid `Origin` and Turnstile
   token returns `403`.
3. Send one booking and one contact-form test. Both must reject an incomplete
   hCaptcha response.
4. Inspect response headers for the five headers in the table above.
5. Check Cloudflare Analytics and Google/Gemini billing alerts weekly.
