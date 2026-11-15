document.addEventListener("DOMContentLoaded", function() {
const WORKER_URL = "https://workers.dev";
https://workers.dev";

  const chatHTML = `
  <style>
    #ai-chat-btn { position: fixed; bottom: 20px; right: 20px; background: #1e7e34; color: white; border: none; border-radius: 50px; padding: 14px 22px; font-size: 15px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.25); z-index: 9999; transition: background 0.2s; }
    #ai-chat-btn:hover { background: #155d27; }
    #ai-chat-box { display: none; position: fixed; bottom: 80px; right: 20px; width: 360px; max-width: 92vw; height: 540px; background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); flex-direction: column; overflow: hidden; font-family: "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif; z-index: 9999; border: 1px solid #ddd; }
    #ai-chat-header { background: #1e7e34; color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .header-titles { display: flex; flex-direction: column; line-height: 1.4; }
    .header-company { font-size: 15px; font-weight: bold; }
    .header-main { font-size: 11px; font-weight: normal; opacity: 0.9; }
    #ai-chat-notice { background: #f1f3f5; color: #555; font-size: 11px; line-height: 1.4; padding: 8px 14px; border-bottom: 1px solid #e0e0e0; }
    #ai-chat-messages { flex: 1; padding: 12px; overflow-y: auto; background: #f8f9fa; font-size: 14px; line-height: 1.6; }
    .msg-ai { background: white; padding: 10px 12px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #e0e0e0; color: #333; white-space: pre-wrap; }
    .msg-user { background: #1e7e34; color: white; padding: 10px 12px; border-radius: 10px; margin-bottom: 10px; margin-left: auto; max-width: 82%; white-space: pre-wrap; }
    .quick-btns { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .quick-btn { width: 100%; text-align: left; background: #ffffff; color: #1e7e34; border: 1.5px solid #1e7e34; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .quick-btn::after { content: "›"; font-size: 16px; font-weight: bold; }
    .quick-btn:hover { background: #1e7e34; color: white; }
    #ai-chat-input-area { display: flex; border-top: 1px solid #ddd; padding: 8px; background: white; }
    #ai-chat-input { flex: 1; border: 1px solid #ccc; border-radius: 20px; padding: 8px 14px; outline: none; font-size: 14px; }
    #ai-chat-send { background: #1e7e34; color: white; border: none; border-radius: 20px; padding: 8px 16px; margin-left: 6px; cursor: pointer; font-weight: bold; }
  </style>

  <button id="ai-chat-btn">💬 AIチャット</button>

  <div id="ai-chat-box">
    <div id="ai-chat-header">
      <div class="header-titles">
        <span class="header-company">モンゴル旅行専門店アルタンツアー</span>
        <span class="header-main">AIチャットアシスタント</span>
      </div>
      <span id="ai-chat-close" style="cursor:pointer; font-size:18px; padding:4px;">✕</span>
    </div>
    
    <div id="ai-chat-notice">
      ※ AIが自動で回答しています。回答内容に不安な点は、スタッフへのご連絡方法をご案内します。
    </div>

    <div id="ai-chat-messages">
      <div class="msg-ai">Hello! モンゴルAIアシスタントです。モンゴル現地ツアーについてお気軽にご質問下さい。回答内容に不明な点がある場合は専門スタッフへ連絡下さい。</div>
      <div class="quick-btns">
        <button class="quick-btn" data-q="ツアーを探す">ツアーを探す</button>
        <button class="quick-btn" data-q="モンゴルの航空券情報">モンゴルの航空券情報</button>
        <button class="quick-btn" data-q="空港送迎・専用車手配">空港送迎・専用車手配</button>
        <button class="quick-btn" data-q="モンゴル観光名所について">モンゴル観光名所について</button>
        <button class="quick-btn" data-q="お申込からご出発までの流れ">お申込からご出発までの流れ</button>
      </div>
    </div>
    
    <div id="ai-chat-input-area">
      <input type="text" id="ai-chat-input" placeholder="質問を入力してください...">
      <button id="ai-chat-send">送信</button>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML("beforeend", chatHTML);

  const btn = document.getElementById("ai-chat-btn");
  const box = document.getElementById("ai-chat-box");
  const closeBtn = document.getElementById("ai-chat-close");
  const input = document.getElementById("ai-chat-input");
  const sendBtn = document.getElementById("ai-chat-send");
  const messages = document.getElementById("ai-chat-messages");

  function toggleChat() {
    box.style.display = box.style.display === "flex" ? "none" : "flex";
  }

  btn.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", toggleChat);

  document.querySelectorAll(".quick-btn").forEach(button => {
    button.addEventListener("click", function() {
      input.value = this.getAttribute("data-q");
      sendMessage();
    });
  });

  input.addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendMessage();
  });
  sendBtn.addEventListener("click", sendMessage);

  function addMessage(text, className) {
    const div = document.createElement("div");
    const id = "msg-" + Date.now() + Math.random().toString(36).substr(2, 5);
    div.id = id;
    div.className = className;
    div.innerText = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return id;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "msg-user");
    input.value = "";
    const loadingId = addMessage("回答を作成中...", "msg-ai");

    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await response.json();
      document.getElementById(loadingId).innerText = data.reply;
    } catch (e) {
      document.getElementById(loadingId).innerText = "申し訳ありません、通信エラーが発生しました。お急ぎの場合は日本窓口（070-9181-9922）までお問い合わせください。";
    }
  }
});
