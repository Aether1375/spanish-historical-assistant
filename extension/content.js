// Register exact hotkeys: F5-F8, Alt+/, Alt+., Alt+,
document.addEventListener("keydown", (e) => {
  if (["F5", "F6", "F7", "F8"].includes(e.key)) {
    // Intercept default browser actions like page refresh
    e.preventDefault();
  }

  if (e.key === "F5") dispatchSyntheticKey("F5", 116);
  if (e.key === "F6") dispatchSyntheticKey("F6", 117);
  if (e.key === "F7") dispatchSyntheticKey("F7", 118);
  if (e.key === "F8") dispatchSyntheticKey("F8", 119);

  if (e.altKey && e.key === "/") {
    e.preventDefault();
    dispatchSyntheticKey("/", 191, { altKey: true }); // Preview Next Image
  }
  if (e.altKey && e.key === ".") {
    e.preventDefault();
    dispatchSyntheticKey(".", 190, { altKey: true }); // Return to Current Entry Image
  }
  if (e.altKey && e.key === ",") {
    e.preventDefault();
    dispatchSyntheticKey(",", 188, { altKey: true }); // Preview Previous Image
  }
});

function dispatchSyntheticKey(key, keyCode, modifiers = {}) {
  const event = new KeyboardEvent("keydown", {
    key: key,
    code: key,
    keyCode: keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    altKey: !!modifiers.altKey
  });
  document.dispatchEvent(event);
}

// Fast DOM Field Injector
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FILL_ENTRY") {
    const fields = msg.fields;

    Object.entries(fields).forEach(([key, val]) => {
      const input = document.querySelector(`input[name*="${key}" i], input[id*="${key}" i]`);
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, val);

        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true }));
      }
    });

    sendResponse({ status: "SUCCESS" });
  }
});