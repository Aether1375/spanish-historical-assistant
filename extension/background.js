const VERCEL_API_URL = "https://spanish-historical-assistant.vercel.app/api/process-entry";
let chatHistory = [];

// Fallback 1x1 pixel image if screen capture is unavailable
const BLANK_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "INIT_CHAT") {
    (async () => {
      try {
        chatHistory = [];
        const dataUrl = await safeCaptureScreen();
        
        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: dataUrl, isInit: true })
        });

        if (!response.ok) {
          const errText = await response.text();
          return sendResponse({ error: `Server HTTP ${response.status}: ${errText.substring(0, 80)}` });
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
        const dataUrl = await safeCaptureScreen();
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
          return sendResponse({ error: `Server HTTP ${response.status}: ${errText.substring(0, 80)}` });
        }

        const data = await response.json();
        chatHistory.push({ role: "assistant", text: data.reply });

        if (data.shouldFill && data.fields) {
          const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { action: "FILL_ENTRY", fields: data.fields }, () => {
              // Ignore missing listener errors quietly
              if (chrome.runtime.lastError) console.warn("Content script idle.");
            });
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

async function safeCaptureScreen() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
      return BLANK_IMAGE;
    }

    return new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 30 }, (data) => {
        if (chrome.runtime.lastError || !data) {
          resolve(BLANK_IMAGE);
        } else {
          resolve(data);
        }
      });
    });
  } catch (e) {
    return BLANK_IMAGE;
  }
}