chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "UPDATE_METRICS") {
    document.getElementById("metricCompleted").textContent = msg.completed;
  }

  if (msg.action === "PAUSE_FOR_GUIDANCE") {
    const modal = document.getElementById("guidanceModal");
    modal.classList.remove("hidden");
    
    const reasonText = msg.data.confidenceScore < 90 
      ? `Low confidence score: ${msg.data.confidenceScore}%. Unrecognized words: ${(msg.data.unrecognizedWords || []).join(", ")}`
      : "Unrecognized image format detected.";
    
    document.getElementById("guidanceReason").textContent = reasonText;
  }
});

// Resume Batch Event
document.getElementById("btnSaveAndResume").addEventListener("click", async () => {
  const explanation = document.getElementById("formatExplanation").value;
  const newWord = document.getElementById("dictCorrection").value;

  const storage = await chrome.storage.local.get(["spanishDictionary"]);
  const currentDict = storage.spanishDictionary || [];

  if (newWord) currentDict.push(newWord.trim());

  await chrome.storage.local.set({
    formatPrompt: explanation,
    spanishDictionary: currentDict
  });

  document.getElementById("guidanceModal").classList.add("hidden");
  chrome.runtime.sendMessage({ action: "RESUME_BATCH" });
});

// Start Batch Event
document.getElementById("btnStartBatch").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "START_BATCH", tasks: [{}, {}, {}] });
});

// Chat Event Handlers
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

  appendMessage("Assistant", "Analyzing document...", "chat-ai");

  chrome.runtime.sendMessage({ action: "CHAT_QUERY", query: text }, (response) => {
    // Remove "Analyzing document..." loading placeholder
    const chatLog = document.getElementById("chatLog");
    chatLog.removeChild(chatLog.lastChild);

    if (response && response.result) {
      appendMessage("Assistant", response.result, "chat-ai");
    } else {
      appendMessage("Assistant", "Error: " + (response?.error || "Could not process request."), "chat-ai");
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