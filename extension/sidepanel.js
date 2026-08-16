// Load memory count on open
updateExampleCount();

async function updateExampleCount() {
  const memory = await chrome.storage.local.get(["exemplars"]);
  const exemplars = memory.exemplars || [];
  document.getElementById("exampleCount").textContent = exemplars.length;
}

// 1. Analyze Screen for Teaching
document.getElementById("btnCaptureExample").addEventListener("click", () => {
  const jsonArea = document.getElementById("exampleFieldsJson");
  const box = document.getElementById("learningBox");
  jsonArea.value = "Analyzing image with Gemini Vision LLM...";
  box.classList.remove("hidden");

  chrome.runtime.sendMessage({ action: "TEACH_ENTRY" }, (response) => {
    if (response && response.fields) {
      jsonArea.value = JSON.stringify(response.fields, null, 2);
    } else {
      jsonArea.value = "Error: " + (response?.error || "Failed to parse document.");
    }
  });
});

// 2. Save Corrected Example to Memory
document.getElementById("btnSaveExample").addEventListener("click", async () => {
  const jsonText = document.getElementById("exampleFieldsJson").value;
  try {
    const verifiedFields = JSON.parse(jsonText);
    
    // Capture current screen image for few-shot pair
    chrome.runtime.sendMessage({ action: "SAVE_EXEMPLAR", verifiedFields }, async (res) => {
      if (res.success) {
        alert("Example saved! The LLM will now use this entry as context for future records.");
        document.getElementById("learningBox").classList.add("hidden");
        updateExampleCount();
      }
    });
  } catch (e) {
    alert("Invalid JSON format. Please format as {\"field_name\": \"value\"}");
  }
});

// Run Auto Pilot
document.getElementById("btnStartAuto").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "START_BATCH", tasks: [{}] });
});

// Clear Memory
document.getElementById("btnClearMemory").addEventListener("click", async () => {
  await chrome.storage.local.set({ exemplars: [] });
  updateExampleCount();
  alert("Memory cleared.");
});

// Chat handlers
document.getElementById("btnSendChat").addEventListener("click", sendChatMessage);
document.getElementById("chatInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  appendMessage("User", text, "chat-user");
  input.value = "";
  appendMessage("Assistant", "Thinking...", "chat-ai");

  chrome.runtime.sendMessage({ action: "CHAT_QUERY", query: text }, (response) => {
    const chatLog = document.getElementById("chatLog");
    if (chatLog.lastChild) chatLog.removeChild(chatLog.lastChild);

    if (response && response.result) {
      appendMessage("Assistant", response.result, "chat-ai");
    } else {
      appendMessage("Assistant", "Error: " + (response?.error || "Failed request."), "chat-ai");
    }
  });
}

function appendMessage(sender, text, className) {
  const chatLog = document.getElementById("chatLog");
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${className}`;
  msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}