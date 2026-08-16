const VERCEL_API_URL = "https://spanish-historical-assistant.vercel.app/api/process-entry";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.action === "SAVE_EXEMPLAR") {
    (async () => {
      try {
        const dataUrl = await captureScreen();
        const storage = await chrome.storage.local.get(["exemplars"]);
        const exemplars = storage.exemplars || [];

        exemplars.push({
          image: dataUrl,
          fields: msg.verifiedFields
        });

        await chrome.storage.local.set({ exemplars });
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === "TEACH_ENTRY" || msg.action === "START_BATCH") {
    (async () => {
      try {
        const dataUrl = await captureScreen();
        const storage = await chrome.storage.local.get(["exemplars"]);

        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: dataUrl,
            exemplars: storage.exemplars || []
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          return sendResponse({ error: `Vercel HTTP ${response.status}: ${errText.substring(0, 100)}` });
        }

        const data = await response.json();

        if (msg.action === "START_BATCH" && data.fields) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            await chrome.tabs.sendMessage(tab.id, { action: "FILL_ENTRY", fields: data.fields });
          }
        }

        sendResponse(data);
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();
    return true;
  }

  if (msg.action === "CHAT_QUERY") {
    (async () => {
      try {
        const dataUrl = await captureScreen();
        const response = await fetch(VERCEL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: dataUrl,
            prompt: msg.query
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          return sendResponse({ error: `Vercel HTTP ${response.status}: ${errText.substring(0, 100)}` });
        }

        const data = await response.json();
        sendResponse({ result: data.result });
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