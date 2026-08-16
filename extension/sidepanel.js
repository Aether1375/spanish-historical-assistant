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

document.getElementById("btnSaveAndResume").addEventListener("click", async () => {
  const explanation = document.getElementById("formatExplanation").value;
  const newWord = document.getElementById("dictCorrection").value;

  // Retrieve current memory and append new rules
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

document.getElementById("btnStartBatch").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "START_BATCH", tasks: [{}, {}, {}] });
});