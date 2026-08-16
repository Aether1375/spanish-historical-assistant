const chatContainer = document.getElementById("chatContainer");
const chatInput = document.getElementById("chatInput");
const btnSend = document.getElementById("btnSend");

btnSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  chatInput.value = "";

  const loadingDiv = appendMessage("ai", "Analyzing screen image...");

  chrome.runtime.sendMessage({ action: "CHAT_STEP", text }, (response) => {
    loadingDiv.remove();

    if (response && response.reply) {
      appendMessage("ai", response.reply);
      if (response.tookOver) {
        appendMessage("system", "Form fields auto-filled successfully!");
      }
    } else {
      appendMessage("ai", "Error: " + (response?.error || "Unable to reach assistant server."));
    }
  });
}

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg msg-${role}`;
  div.textContent = text;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return div;
}