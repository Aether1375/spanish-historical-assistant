const VERCEL_API_URL = "https://spanish-historical-assistant.vercel.app/api/process-entry";

class EntryQueue {
  constructor(concurrency = 3) {
    this.queue = [];
    this.activeWorkers = 0;
    this.maxConcurrency = concurrency;
    this.completedCount = 0;
    this.isPaused = false;
  }

  enqueue(task) {
    this.queue.push(task);
    this.processNext();
  }

  async processNext() {
    if (this.isPaused || this.activeWorkers >= this.maxConcurrency || this.queue.length === 0) return;

    this.activeWorkers++;
    const task = this.queue.shift();

    try {
      // 1. Capture screen
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 60 });

      // 2. Query stored layout memory
      const memory = await chrome.storage.local.get(["formatPrompt", "spanishDictionary"]);

      // 3. Request vision analysis from Vercel
      const response = await fetch(VERCEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrl,
          userMemoryPrompt: memory.formatPrompt || "",
          spanishDictionary: memory.spanishDictionary || []
        })
      });

      const result = await response.json();

      // 4. Check guidance triggers: format ambiguity or <90% confidence score
      if (result.needsAssistance || result.confidenceScore < 90) {
        this.isPaused = true;
        chrome.runtime.sendMessage({ action: "PAUSE_FOR_GUIDANCE", data: result });
        return;
      }

      // 5. Inject fields into DOM
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: "FILL_ENTRY", fields: result.fields });

      this.completedCount++;
      chrome.runtime.sendMessage({ action: "UPDATE_METRICS", completed: this.completedCount });

    } catch (err) {
      console.error("Task failed:", err);
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  resume() {
    this.isPaused = false;
    this.processNext();
  }
}

const queueManager = new EntryQueue(3);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "START_BATCH") {
    msg.tasks.forEach(task => queueManager.enqueue(task));
  } else if (msg.action === "RESUME_BATCH") {
    queueManager.resume();
  }
});