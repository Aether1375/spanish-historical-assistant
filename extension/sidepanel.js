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

// Step 1: Analyze & Teach First Entry
document.getElementById("btnTeachEntry").addEventListener("click", async () => {
  const preview = document.getElementById("extractedPreview");
  const reviewBox = document.getElementById("teachingReview");
  preview.innerText = "Scanning page and testing extraction...";
  reviewBox.classList.remove("hidden");

  chrome.runtime.sendMessage({ action: "TEACH_ENTRY" }, (response) => {
    if (response && response.fields) {
      preview.innerText = JSON.stringify(response.fields, null, 2);
    } else {
      preview.innerText = "Error: " + (response?.error || "Could not extract fields.");
    }
  });
});

// Step 2: Approve Rules & Enable Batch Control
document.getElementById("btnApproveTakeover").addEventListener("click", async () => {
  const customRules = document.getElementById("layoutPrompt").value;
  
  await chrome.storage.local.set({ formatPrompt: customRules });
  
  alert("Rules saved! Automation batch control is now authorized.");
  document.getElementById("btnStartBatch").classList.remove("hidden");
});

// Step 3: Run Authorized Batch Processing
document.getElementById("btnStartBatch").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "START_BATCH", tasks: [{}, {}, {}] });
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
    const chatLog = document.getElementById("chatLog");
    if (chatLog.lastChild) {
      chatLog.removeChild(chatLog.lastChild);
    }

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