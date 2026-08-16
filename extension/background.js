const VERCEL_API_URL = "https://spanish-historical-assistant.vercel.app/api/process-entry";
let chatHistory = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "INIT_CHAT") {
    (async () => {
      try {
        chatHistory = [];
        const dataUrl = await captureScreen();
        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: dataUrl, isInit: true })
        });

        if (!response.ok) {
          const errText = await response.text();
          return sendResponse({ error: `Vercel HTTP ${response.status}: ${errText.substring(0, 100)}` });
        }

        const data = await response.json();
        chatHistory.push({ role: "assistant", text: data.reply });
        sendResponse({ reply: data.reply });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === "CHAT_STEP") {
    (async () => {
      try {
        const dataUrl = await captureScreen();
        chatHistory.push({ role: "user", text: msg.text });

        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: dataUrl,
            chatHistory: chatHistory,
            isInit: false
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          return sendResponse({ error: `Vercel HTTP ${response.status}: ${errText.substring(0, 100)}` });
        }

        const data = await response.json();
        chatHistory.push({ role: "assistant", text: data.reply });

        if (data.shouldFill && data.fields) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            await chrome.tabs.sendMessage(tab.id, { action: "FILL_ENTRY", fields: data.fields });
          }
          sendResponse({ reply: data.reply, tookOver: true });
        } else {
          sendResponse({ reply: data.reply, tookOver: false });
        }
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }
});

function captureScreen() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 30 }, (data) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(data);
    });
  });
}