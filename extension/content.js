// 1. Prevent infinite recursion on synthetic shortcut dispatching
document.addEventListener("keydown", (e) => {
  if (!e.isTrusted) return; // Ignore synthetic events created by extension

  if (["F5", "F6", "F7", "F8"].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "F5") dispatchSyntheticKey("F5", 116);
  if (e.key === "F6") dispatchSyntheticKey("F6", 117);
  if (e.key === "F7") dispatchSyntheticKey("F7", 118);
  if (e.key === "F8") dispatchSyntheticKey("F8", 119);

  if (e.altKey && e.key === "/") {
    e.preventDefault();
    dispatchSyntheticKey("/", 191, { altKey: true });
  }
  if (e.altKey && e.key === ".") {
    e.preventDefault();
    dispatchSyntheticKey(".", 190, { altKey: true });
  }
  if (e.altKey && e.key === ",") {
    e.preventDefault();
    dispatchSyntheticKey(",", 188, { altKey: true });
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

// 2. Safe multi-framework auto-filler for indexing forms
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FILL_ENTRY") {
    const fields = msg.fields || {};
    let filledCount = 0;

    const elements = Array.from(
      document.querySelectorAll("input:not([type='hidden']), textarea, select")
    );

    Object.entries(fields).forEach(([rawKey, val]) => {
      if (val === null || val === undefined) return;

      const target = findMatchingElement(elements, rawKey);
      if (target) {
        setNativeValue(target, String(val));
        filledCount++;
      }
    });

    sendResponse({ status: "SUCCESS", filledCount });
  }
  return true;
});

// Normalized matching for name, id, placeholder, aria-label, and <label> text
function findMatchingElement(elements, rawKey) {
  const normKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!normKey) return null;

  return elements.find((el) => {
    const id = (el.id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = (el.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const placeholder = (el.placeholder || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    
    let labelText = "";
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) labelText = lbl.textContent.toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    return (
      id.includes(normKey) ||
      (id.length > 2 && normKey.includes(id)) ||
      name.includes(normKey) ||
      (name.length > 2 && normKey.includes(name)) ||
      placeholder.includes(normKey) ||
      ariaLabel.includes(normKey) ||
      labelText.includes(normKey)
    );
  });
}

// Prototype value injector compatible with React, Angular, and vanilla web forms
function setNativeValue(element, value) {
  let prototype = window.HTMLInputElement.prototype;
  if (element instanceof HTMLTextAreaElement) {
    prototype = window.HTMLTextAreaElement.prototype;
  } else if (element instanceof HTMLSelectElement) {
    prototype = window.HTMLSelectElement.prototype;
  }

  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("focus", { bubbles: true }));
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}