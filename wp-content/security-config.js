/*
 * Public browser configuration. The Turnstile site key is public by design;
 * never place TURNSTILE_SECRET or any other server secret in this file.
 *
 * Replace the empty value after creating a Turnstile widget restricted to
 * mongoru.jp and www.mongoru.jp. The Worker must receive the matching secret
 * as TURNSTILE_SECRET before this is deployed.
 */
window.MONGORU_TURNSTILE_SITE_KEY = "";
