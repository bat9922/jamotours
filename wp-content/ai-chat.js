/*
 * AIチャットウィジェット（全ページ共通）
 *
 * 各ページの </body> の直前で
 *   <script src="/wp-content/ai-chat.js" defer></script>
 * と読み込むだけで、ボタン・チャット画面・通信処理がすべて入ります。
 *
 * 直すときはこの1ファイルだけを直してください。
 * 送信先の Worker は repo の worker/ にあります（worker/README.md 参照）。
 *
 * AIの回答に出てきた URL は本文から抜き出し、回答の下に
 * 「参考リンク」としてツアー名付きのリンクで並べます。
 */
(function () {
  "use strict";

  if (window.__aiChatLoaded) { return; }   // 二重読み込みの保険
  window.__aiChatLoaded = true;

  var WORKER_URL = "https://mongol.bzorig9922.workers.dev";
  var TURNSTILE_SITE_KEY = window.MONGORU_TURNSTILE_SITE_KEY || "";
  var turnstileWidgetId = null;
  var turnstileToken = "";
  var sending = false;
  var TEL = "070-9181-9922";
  var MAX_REFS = 6;               // 参考リンクの最大表示数


  var GREETING = "Hello! モンゴルAIアシスタントです。モンゴル現地ツアーについてお気軽にご質問下さい。回答内容に不明な点がある場合は専門スタッフへ連絡下さい。";
  var NOTICE   = "※ AIが自動で回答しています。回答内容に不安な点は、スタッフへのご連絡方法をご案内します。";
  var QUICK    = [
    "ツアーを探す",
    "モンゴルの航空券情報",
    "空港送迎・専用車手配",
    "モンゴル観光名所について",
    "お申込からご出発までの流れ"
  ];

  /* URLからリンクの見出しを引くための表。
     下の TOUR-MAP は worker/worker.js の TOUR_CATALOG から自動生成しています。
     ツアーを増減したら worker.js を直したうえで、この表も作り直してください。 */
  /* TOUR-MAP-START */
  var TOURS = {
    "/terelj-horse-riding-2-day/": "テレルジ 亀岩・アリヤバル寺院・文化体験付き 1泊2日",
    "/chinggiskhaan-complex-terelj-3-day/": "チンギスハーン騎馬像と奥テレルジ 2泊3日",
    "/chinggis-13th-century-home-stay-4-day/": "チンギスハーン騎馬像・13世紀村・遊牧民宅滞在 3泊4日",
    "/mongolia-horse-tour/terelj-3n4d.html": "テレルジ国立公園 乗馬 3泊4日",
    "/terelj-horse-riding-5-day/": "テレルジ トメンハーンリゾート 文化体験付き 4泊5日",
    "/khustai-takhi-bulgan-dunes-horse-5-day/": "ホスタイ国立公園（野生馬タヒ）とブルド砂丘 4泊5日",
    "/terelj-nomadic-show-horse-5-day/": "遊牧民ショー付き ノマディックキャンプ 4泊5日",
    "/terelj-horse-riding-6-day/": "テレルジ 亀岩・寺院観光と遊牧民宅泊 5泊6日",
    "/terelj-horse-riding-7-day/": "テレルジとブルド砂丘 ラクダ乗り体験付き 6泊7日",
    "/mongolia-horse-tour/": "乗馬ツアー一覧",
    "/gobi-tours-6-days/": "モンゴル ゴビ砂漠 6日間",
    "/burd-sand-and-mongol-nomadic-tours/": "ブルド砂丘と遊牧民ショー観戦",
    "/steppe-tour-site/": "大草原ツアー（メネン平原ほか）全4コース",
    "/steppe-tour-site/menen-steppe-dornod-tour-6n7d.html": "メネン平原の旅 6泊7日",
    "/kharkhorin-5-day-tour/": "歴史・遺跡めぐり（カラコルム、エルデネゾー）5日間",
    "/history-tour-site/": "歴史・遺跡ツアー一覧",
    "/history-tour-site/kharkorum-erdene-zuu-khoshoo-tsaidam-4n5d.html": "カラコルム・エルデネゾー・ホショーツァイダム 4泊5日",
    "/world-heritage-tour-site/": "世界遺産ツアー 全8コース",
    "/world-heritage-tour-site/orkhon-valley-world-heritage-tour-5n6d.html": "オルホン渓谷の文化的景観 5泊6日",
    "/buddhism-tour-site/": "仏教ツアー 全4コース",
    "/buddhism-tour-site/erdene-zuu-monastery-buddhist-tour-4n5d.html": "世界遺産エルデネゾー寺院を訪ねる旅 4泊5日",
    "/flower-hiking-site/": "フラワーハイキング一覧（6〜8月）",
    "/terelj-flower-hiking-5-days/": "テレルジ フラワーハイキング 5日間",
    "/flower-hiking-site/bogd-flower-hiking-4n5d.html": "ボグド山国立公園 フラワーハイキング 4泊5日",
    "/national-park-tour-site/": "国立公園ツアー 全4コース",
    "/national-park-tour-site/bogd-khan-terelj-national-park-tour-3n4d.html": "ボグド山・テレルジとチンギスハーン騎馬像 3泊4日",
    "/mountain-tour-site/": "登山ツアー 全6コース",
    "/mountain-tour-site/khuiten-peak-altai-tavan-bogd-9n10d.html": "フイテン峰（4,374m）登頂 9泊10日",
    "/birdwatching-tour-site/": "野鳥観察ツアー 全6コース",
    "/birdwatching-tour-site/tuul-river-terelj-birdwatching-4n5d.html": "トーラ川・テレルジ バードウォッチング 4泊5日",
    "/insect-collecting-tour-site/": "昆虫採集ツアー 全10コース（30年の実績）",
    "/insect-collecting-tour-site/terelj-national-park-insect-collecting-tour-7n8d.html": "テレルジ国立公園周辺で昆虫採集 7泊8日",
    "/insect-collecting-tour-site/tsenkher-hot-spring-terelj-insect-collecting-tour-7n8d.html": "ツェンケル温泉とテレルジで昆虫採集 7泊8日",
    "/insect-collecting-tour-site/bayanchandmani-terelj-insect-collecting-tour-7n8d.html": "バヤンチャンドマンとテレルジで昆虫採集 7泊8日",
    "/insect-collecting-tour-site/khentii-khangal-lake-insect-collecting-tour-7n8d.html": "ヘンテイ県ハンガル湖で昆虫採集 7泊8日",
    "/insect-collecting-tour-site/selenge-russian-border-insect-collecting-tour-7n8d.html": "セレンゲ県（ロシア国境付近）で昆虫採集 7泊8日",
    "/insect-collecting-tour-site/mongolia-dragonfly-collecting-tour-7n8d.html": "トンボ採集ツアー 7泊8日",
    "/insect-collecting-tour-site/uvs-kharkhiraa-mountain-insect-collecting-tour-8n9d.html": "ウブス県ハルヒラー山で昆虫採集 8泊9日",
    "/insect-collecting-tour-site/khuvsgul-lake-insect-collecting-tour-9n10d.html": "フブスグル湖北部で昆虫採集 9泊10日",
    "/insect-collecting-tour-site/altai-mountains-insect-collecting-tour-9n10d.html": "アルタイ山脈 中国国境付近で昆虫採集 9泊10日",
    "/insect-collecting-tour-site/mongolia-round-trip-insect-collecting-tour-30days.html": "モンゴル一周 昆虫採集 1か月",
    "/taimen-fishing-site/": "イトウ釣りツアー",
    "/taimen-fishing-site/onon-balj-taimen-fishing-7n8d.html": "オノン・バルジ川 イトウ釣り 7泊8日",
    "/hunting-tour-site/": "ハンティング撮影ツアー 全4コース",
    "/hunting-tour-site/wolf-hunting-photo-tour-7n8d.html": "オオカミ ハンティング撮影 7泊8日",
    "/nomadic-home-stay-5-days/": "遊牧民ホームステイ 5日間",
    "/optional-tour-site/": "オプショナルツアー 全12コース（日帰り〜2泊3日）",
    "/optional-tour-site/mongolian-cooking-experience-terelj-1n2d.html": "モンゴル伝統料理を作って味わう旅 1泊2日",
    "/shaman-tour-site/": "シャーマン（ボー信仰）ツアー 全4コース",
    "/shaman-tour-site/mongolia-shaman-experience-tour-4n5d.html": "シャーマン体験ツアー 4泊5日",
    "/sumo-wrestler-tour-site/": "モンゴル相撲力士が同行する旅 全4コース",
    "/sumo-wrestler-tour-site/ulaanbaatar-city-tour-with-mongolian-wrestler-1day.html": "力士と一緒に1日市内観光",
    "/stargazing-tour-site/": "星空観察ツアー 全4コース",
    "/stargazing-tour-site/terelj-stargazing-tour-3n4d.html": "テレルジ 星空観察 3泊4日",
    "/railway-tour-site/": "シベリア鉄道の旅 全4コース",
    "/railway-tour-site/sukhbaatar-russian-border-railway-4n5d.html": "スフバートル・ロシア国境の旅 4泊5日",
    "/offroad-bike-tour-site/": "オフロードバイクツアー 全4コース",
    "/offroad-bike-tour-site/terelj-offroad-motorcycle-tour-4n5d.html": "テレルジ オフロードバイク 4泊5日",
    "/bike-tours-5-days/": "テレルジ オフロードバイク 5日間",
    "/festival-event-tour-site/": "祭り・イベント一覧（ナーダム、ツァガーンサル、イーグルフェスティバル）",
    "/marathon-tour-site/": "国際マラソンツアー 全4コース",
    "/marathon-tour-site/ulaanbaatar-international-marathon-2n3d.html": "ウランバートル国際マラソン参加 2泊3日",
    "/vivant-location-tour-site/": "VIVANTロケ地めぐり 全4コース",
    "/vivant-location-tour-site/vivant-terelj-nalaikh-tour-3n4d.html": "VIVANTロケ地 テレルジ 3泊4日",
    "/company-trip-business-tour-site/": "社員旅行・企業視察 全4コース",
    "/company-trip-business-tour-site/mongolia-company-visit-business-tour-2n3d.html": "モンゴル企業を訪問する旅 2泊3日",
    "/education-tour-site/": "修学旅行・教育旅行 全4コース",
    "/education-tour-site/ulaanbaatar-school-visit-tour-3n4d.html": "ウランバートル学校訪問 3泊4日",
    "/モンゴル業務渡航について/": "業務渡航・出張手配",
    "/travel-company/": "旅行会社・法人・団体のお客様へ",
    "/ordermade/": "オーダーメイドツアー",
    "/ticket-info-2/": "航空券・時刻表・手荷物",
    "/ticket-info-2/railway/": "鉄道・列車切符",
    "/ticket-info-2/visa/": "ビザ・入国",
    "/hotel-info/": "ホテル予約とタリフ",
    "/private-car/": "空港送迎・専用車（ドライバー付き）",
    "/japanese-guide/": "日本語ガイド",
    "/mongolia-info/": "モンゴルを知る（気候・通貨・食事・お土産など）",
    "/mongolia-info/sightseeing/": "観光名所",
    "/mongolia-info/museums/": "博物館情報",
    "/q-and-a/": "よくあるご質問",
    "/guide-flow/": "お申込みから出発までの流れ",
    "/guide-repeater/": "リピーター割引",
    "/company-info/": "会社案内"
  };
  /* TOUR-MAP-END */

  /* ツアー一覧に載っていない案内先 */
  TOURS["/"] = "ホーム";
  TOURS["/booking/"] = "お問い合わせ・無料見積もり";
  TOURS["/contact/"] = "連絡先";
  TOURS["/tours-list/"] = "ツアー一覧";

  /* ------------------------------------------------------------------
     スタイル。セレクタは必ず #ai-chat-btn / #ai-chat-box の内側に限定する。
     ページ側の CSS と名前がぶつかっても影響し合わないようにするため。
     ------------------------------------------------------------------ */
  var CSS = [
    '#ai-chat-btn{position:fixed;bottom:20px;right:20px;background:#1e7e34;color:#fff;border:none;border-radius:50px;padding:14px 22px;font-size:15px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.25);z-index:9999;transition:background .2s;font-family:"Hiragino Kaku Gothic ProN","Meiryo",sans-serif;line-height:1.2}',
    '#ai-chat-btn:hover{background:#155d27}',
    '#ai-chat-box{display:none;position:fixed;bottom:80px;right:20px;width:360px;max-width:92vw;height:540px;max-height:calc(100vh - 110px);background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.25);flex-direction:column;overflow:hidden;font-family:"Hiragino Kaku Gothic ProN","Meiryo",sans-serif;z-index:9999;border:1px solid #ddd;box-sizing:border-box;text-align:left}',
    '#ai-chat-box.is-open{display:flex}',
    '#ai-chat-box *{box-sizing:border-box}',
    '#ai-chat-header{background:#1e7e34;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex:0 0 auto}',
    '#ai-chat-box .ai-chat-titles{display:flex;flex-direction:column;line-height:1.4}',
    '#ai-chat-box .ai-chat-company{font-size:15px;font-weight:bold;color:#fff}',
    '#ai-chat-box .ai-chat-sub{font-size:11px;font-weight:normal;opacity:.9;color:#fff}',
    '#ai-chat-box .ai-chat-close{cursor:pointer;font-size:18px;padding:4px;color:#fff;background:none;border:none;line-height:1}',
    '#ai-chat-notice{background:#f1f3f5;color:#555;font-size:11px;line-height:1.4;padding:8px 14px;border-bottom:1px solid #e0e0e0;flex:0 0 auto}',
    '#ai-chat-messages{flex:1 1 auto;padding:12px;overflow-y:auto;background:#f8f9fa;font-size:14px;line-height:1.6;color:#333}',
    '#ai-chat-box .msg-ai{background:#fff;padding:10px 12px;border-radius:10px;margin:0 0 10px;border:1px solid #e0e0e0;color:#333;white-space:pre-wrap;word-break:break-word}',
    '#ai-chat-box .msg-user{background:#1e7e34;color:#fff;padding:10px 12px;border-radius:10px;margin:0 0 10px auto;max-width:82%;white-space:pre-wrap;word-break:break-word}',
    /* :not(.ai-chat-ref) を外すと、この行が下の参考リンクの色と下線を上書きしてしまう */
    '#ai-chat-box .msg-ai a:not(.ai-chat-ref){color:#1e7e34;text-decoration:underline;word-break:break-all}',
    '#ai-chat-box .quick-btns{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}',
    '#ai-chat-box .quick-btn{width:100%;text-align:left;background:#fff;color:#1e7e34;border:1.5px solid #1e7e34;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.06);font-family:inherit}',
    '#ai-chat-box .quick-btn::after{content:"\\203A";font-size:16px;font-weight:bold}',
    '#ai-chat-box .quick-btn:hover{background:#1e7e34;color:#fff}',
    '#ai-chat-box .ai-chat-refs{white-space:normal;margin-top:11px;padding-top:9px;border-top:1px dashed #cdd9d3}',
    '#ai-chat-box .ai-chat-refs-title{font-size:11px;font-weight:bold;color:#1e7e34;letter-spacing:.06em;margin-bottom:6px}',
    '#ai-chat-box .ai-chat-ref{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 11px;margin-bottom:5px;background:#f3f8f5;border:1px solid #d7e5dd;border-radius:7px;color:#1a6b2d;text-decoration:none;font-size:12.5px;font-weight:500;line-height:1.45}',
    '#ai-chat-box .ai-chat-ref:last-child{margin-bottom:0}',
    '#ai-chat-box .ai-chat-ref:hover{background:#1e7e34;border-color:#1e7e34;color:#fff}',
    '#ai-chat-box .ai-chat-ref::after{content:"\\203A";font-size:16px;font-weight:bold;flex:0 0 auto}',
    '#ai-chat-input-area{display:flex;border-top:1px solid #ddd;padding:8px;background:#fff;flex:0 0 auto}',
    '#ai-chat-input{flex:1 1 auto;min-width:0;border:1px solid #ccc;border-radius:20px;padding:8px 14px;outline:none;font-size:14px;font-family:inherit;background:#fff;color:#333}',
    '#ai-chat-send{background:#1e7e34;color:#fff;border:none;border-radius:20px;padding:8px 16px;margin-left:6px;cursor:pointer;font-weight:bold;font-size:14px;font-family:inherit;flex:0 0 auto}',
    '@media (max-width:480px){#ai-chat-box{right:4vw;left:4vw;width:auto;max-width:none;bottom:74px}#ai-chat-btn{padding:12px 18px;font-size:14px}}'
  ].join("\n");

  var box, messages, input;

  function el(tag, props) {
    var n = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (Object.prototype.hasOwnProperty.call(props, k)) { n[k] = props[k]; }
      }
    }
    return n;
  }

  /* ------------------------------------------------------------------
     回答本文の組み立て
     ------------------------------------------------------------------ */

  function urlRe() { return /https?:\/\/[^\s<>"']+/g; }

  /* 文末の句読点や閉じ括弧はURLに含めない */
  function trimUrl(u) {
    return String(u).replace(/[\s。、，．,.;:!?！？)）\]】」』>"']+$/, "");
  }

  /* リンクの見出し。ツアー表 → 直前の「・ツアー名」 → パス、の順に探す */
  function labelFor(href, fallback) {
    var u;
    try { u = new URL(href, "https://mongoru.jp/"); } catch (e) { return fallback || href; }
    if (u.hostname !== "mongoru.jp" && u.hostname !== "www.mongoru.jp") { return u.hostname; }
    var path = u.pathname;
    try { path = decodeURIComponent(path); } catch (e2) {}
    if (TOURS[path]) { return TOURS[path]; }
    if (fallback) { return fallback; }
    return path;
  }

  function isSafeSiteUrl(href) {
    try {
      var u = new URL(href);
      return u.protocol === "https:" && (u.hostname === "mongoru.jp" || u.hostname === "www.mongoru.jp");
    } catch (e) {
      return false;
    }
  }

  /* 1行ぶんを組み立てる。URLは <a> にし、見つけたURLは addRef に渡す */
  function linkify(line, addRef) {
    var frag = document.createDocumentFragment();
    var re = urlRe();
    var last = 0;
    var m;
    while ((m = re.exec(line)) !== null) {
      var raw = m[0];
      var href = trimUrl(raw);
      if (!href) { continue; }
      if (m.index > last) {
        frag.appendChild(document.createTextNode(line.slice(last, m.index)));
      }
      if (!isSafeSiteUrl(href)) {
        frag.appendChild(document.createTextNode(raw));
        last = m.index + raw.length;
        continue;
      }
      var a = el("a", { href: href, target: "_blank", rel: "noopener noreferrer", textContent: href });
      frag.appendChild(a);
      addRef(href, "");
      if (raw.length > href.length) {
        frag.appendChild(document.createTextNode(raw.slice(href.length)));
      }
      last = m.index + raw.length;
    }
    if (last < line.length) {
      frag.appendChild(document.createTextNode(line.slice(last)));
    }
    return frag;
  }

  function renderReply(bubble, text) {
    while (bubble.firstChild) { bubble.removeChild(bubble.firstChild); }

    var refs = [];
    var seen = {};
    function addRef(href, fallback) {
      href = trimUrl(href);
      if (!href || !isSafeSiteUrl(href) || seen[href]) { return; }
      seen[href] = true;
      refs.push({ href: href, label: labelFor(href, fallback) });
    }

    var lines = String(text).split("\n");
    var kept = [];          // { blank: bool, frag: DocumentFragment }
    var lastName = "";

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();
      var hits = t.match(urlRe());

      /* URLだけの行は本文から外し、参考リンクに回す */
      if (hits && hits.length === 1 && isSafeSiteUrl(trimUrl(t)) && trimUrl(hits[0]) === trimUrl(t)) {
        addRef(t, lastName);
        continue;
      }

      if (t.charAt(0) === "・") {           /* 「・ツアー名」の行 */
        lastName = t.replace(/^・\s*/, "");
      } else if (t) {
        lastName = "";
      }

      kept.push({ blank: !t, frag: linkify(line, addRef) });
    }

    /* 行を外したせいで空行が続いたところを1行にまとめ、前後の空行を落とす */
    var clean = [];
    for (var j = 0; j < kept.length; j++) {
      if (kept[j].blank && clean.length && clean[clean.length - 1].blank) { continue; }
      clean.push(kept[j]);
    }
    while (clean.length && clean[0].blank) { clean.shift(); }
    while (clean.length && clean[clean.length - 1].blank) { clean.pop(); }

    for (var k = 0; k < clean.length; k++) {
      bubble.appendChild(clean[k].frag);
      if (k < clean.length - 1) { bubble.appendChild(document.createTextNode("\n")); }
    }

    if (refs.length) {
      var wrap = el("div", { className: "ai-chat-refs" });
      wrap.appendChild(el("div", { className: "ai-chat-refs-title", textContent: "参考リンク" }));
      refs.slice(0, MAX_REFS).forEach(function (r) {
        var a = el("a", {
          className: "ai-chat-ref",
          href: r.href,
          target: "_blank",
          rel: "noopener noreferrer"
        });
        a.appendChild(el("span", { textContent: r.label }));
        wrap.appendChild(a);
      });
      bubble.appendChild(wrap);
    }
  }

  /* ------------------------------------------------------------------
     画面の操作
     ------------------------------------------------------------------ */

  function toggleChat() {
    var open = box.classList.toggle("is-open");
    if (open) { input.focus(); }
  }

  /* 本文は textContent で入れる。AIの返答をHTMLとして解釈させないため。 */
  function addMessage(text, className) {
    var div = el("div", { className: className, textContent: text });
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function initialiseTurnstile(container) {
    if (!TURNSTILE_SITE_KEY) {
      container.textContent = "Security verification is not configured.";
      return;
    }

    function render() {
      if (!window.turnstile || turnstileWidgetId !== null) { return; }
      turnstileWidgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        action: "ai_chat",
        theme: "light",
        size: "compact",
        callback: function (token) { turnstileToken = token; },
        "expired-callback": function () { turnstileToken = ""; },
        "error-callback": function () { turnstileToken = ""; }
      });
    }

    if (window.turnstile) { render(); return; }
    var script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = function () { container.textContent = "Security verification could not be loaded."; };
    document.head.appendChild(script);
  }

  function sendQuick(text) {
    input.value = text;
    sendMessage();
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text || sending) { return; }
    if (!turnstileToken) {
      addMessage("Please complete the security check before sending a message.", "msg-ai");
      return;
    }

    sending = true;
    addMessage(text, "msg-user");
    input.value = "";
    var loading = addMessage("回答を作成中...", "msg-ai");

    fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, turnstileToken: turnstileToken })
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      if (data.reply) {
        renderReply(loading, data.reply);
      } else {
        loading.textContent = "恐れ入りますが、うまくお答えできませんでした。お手数ですが日本窓口（" + TEL + "）までお問い合わせください。";
      }
      messages.scrollTop = messages.scrollHeight;
    })["catch"](function () {
      loading.textContent = "申し訳ありません、通信エラーが発生しました。お急ぎの場合は日本窓口（" + TEL + "）までお問い合わせください。";
      messages.scrollTop = messages.scrollHeight;
    }).then(function () {
      sending = false;
      turnstileToken = "";
      if (window.turnstile && turnstileWidgetId !== null) { window.turnstile.reset(turnstileWidgetId); }
    });
  }

  function build() {
    if (document.getElementById("ai-chat-box")) { return; }   // 既に手書きで入っているページ

    var style = el("style", { id: "ai-chat-style", type: "text/css" });
    style.appendChild(document.createTextNode(CSS));
    document.head.appendChild(style);

    /* 開くボタン */
    var btn = el("button", { id: "ai-chat-btn", type: "button", textContent: "💬 AIチャット" });
    btn.setAttribute("aria-label", "AIチャットを開く");
    btn.addEventListener("click", toggleChat);
    document.body.appendChild(btn);

    /* チャット本体 */
    box = el("div", { id: "ai-chat-box" });

    var header = el("div", { id: "ai-chat-header" });
    var titles = el("div", { className: "ai-chat-titles" });
    titles.appendChild(el("span", { className: "ai-chat-company", textContent: "モンゴル旅行専門店アルタンツアー" }));
    titles.appendChild(el("span", { className: "ai-chat-sub", textContent: "AIチャットアシスタント" }));
    var close = el("button", { className: "ai-chat-close", type: "button", textContent: "✕" });
    close.setAttribute("aria-label", "閉じる");
    close.addEventListener("click", toggleChat);
    header.appendChild(titles);
    header.appendChild(close);
    box.appendChild(header);

    box.appendChild(el("div", { id: "ai-chat-notice", textContent: NOTICE }));

    messages = el("div", { id: "ai-chat-messages" });
    messages.appendChild(el("div", { className: "msg-ai", textContent: GREETING }));
    var quick = el("div", { className: "quick-btns" });
    QUICK.forEach(function (label) {
      var q = el("button", { className: "quick-btn", type: "button", textContent: label });
      q.addEventListener("click", function () { sendQuick(label); });
      quick.appendChild(q);
    });
    messages.appendChild(quick);
    box.appendChild(messages);

    var verification = el("div", { id: "ai-chat-turnstile" });
    box.appendChild(verification);
    initialiseTurnstile(verification);

    var area = el("div", { id: "ai-chat-input-area" });
    input = el("input", { id: "ai-chat-input", type: "text", placeholder: "質問を入力してください..." });
    input.setAttribute("autocomplete", "off");
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
    });
    var send = el("button", { id: "ai-chat-send", type: "button", textContent: "送信" });
    send.addEventListener("click", sendMessage);
    area.appendChild(input);
    area.appendChild(send);
    box.appendChild(area);

    document.body.appendChild(box);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
