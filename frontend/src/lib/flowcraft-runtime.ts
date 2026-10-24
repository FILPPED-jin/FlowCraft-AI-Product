const FLOWCRAFT_RUNTIME_MARKER = "data-flowcraft-runtime";

const FLOWCRAFT_RUNTIME_SCRIPT = `
<script ${FLOWCRAFT_RUNTIME_MARKER}="true">
(function () {
  if (window.__flowCraftRuntimeInstalled) return;
  window.__flowCraftRuntimeInstalled = true;

  var style = document.createElement("style");
  style.textContent = [
    ".fc-selected{outline:2px solid #60a5fa!important;outline-offset:4px!important;box-shadow:0 0 0 8px rgba(96,165,250,.18)!important}",
    ".fc-pressed{background:rgba(59,130,246,.24)!important;border-color:rgba(147,197,253,.7)!important}",
    ".fc-toast-wrap{position:fixed;right:18px;bottom:18px;z-index:999999;display:grid;gap:10px;max-width:min(360px,calc(100vw - 36px))}",
    ".fc-toast{border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 12px;background:rgba(12,18,32,.92);color:#fff;font:500 13px/1.35 Inter,system-ui,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.25);backdrop-filter:blur(12px)}"
  ].join("");
  document.head.appendChild(style);

  function toast(message) {
    var wrap = document.querySelector(".fc-toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "fc-toast-wrap";
      document.body.appendChild(wrap);
    }
    var item = document.createElement("div");
    item.className = "fc-toast";
    item.textContent = message;
    wrap.appendChild(item);
    window.setTimeout(function () {
      item.style.opacity = "0";
      item.style.transform = "translateY(6px)";
      item.style.transition = "opacity .18s ease, transform .18s ease";
      window.setTimeout(function () { item.remove(); }, 220);
    }, 1800);
  }

  function getLabel(element) {
    return ((element.getAttribute("aria-label") || element.textContent || "").replace(/\\s+/g, " ").trim());
  }

  function updateBuildButtons() {
    var text = Array.from(document.querySelectorAll("textarea,input[type=text],input:not([type])"))
      .some(function (input) { return input.value && input.value.trim().length > 0; });
    document.querySelectorAll("button,a").forEach(function (button) {
      var label = getLabel(button).toLowerCase();
      if (/build|generate|create|submit|send|开始|生成|创建|提交|发送/.test(label)) {
        if ("disabled" in button) button.disabled = !text;
        button.setAttribute("aria-disabled", text ? "false" : "true");
      }
    });
  }

  document.addEventListener("input", updateBuildButtons, true);
  updateBuildButtons();

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest && event.target.closest("button,a,[role=button],[data-type]");
    if (!target) return;
    if (target.tagName === "A" && target.getAttribute("href") && target.getAttribute("href") !== "#") return;
    if (target.closest("[contenteditable=true]")) return;

    var label = getLabel(target);
    var lower = label.toLowerCase();

    if (target.matches("[data-type], .option-card") || target.parentElement) {
      var siblings = Array.from(target.parentElement ? target.parentElement.children : []);
      var selectableSiblings = siblings.filter(function (item) {
        return item.matches && item.matches("button,[role=button],[data-type],.option-card");
      });
      if (selectableSiblings.length > 1) {
        selectableSiblings.forEach(function (item) { item.classList.remove("fc-selected"); });
        target.classList.add("fc-selected");
        if (label) toast("Selected: " + label);
      }
    }

    if (/plan|toggle|mode|模式|计划/.test(lower)) {
      var pressed = target.getAttribute("aria-pressed") === "true";
      target.setAttribute("aria-pressed", pressed ? "false" : "true");
      target.classList.toggle("fc-pressed", !pressed);
      toast((label || "Option") + (!pressed ? " on" : " off"));
    }

    if (/build|generate|create|submit|send|开始|生成|创建|提交|发送/.test(lower)) {
      event.preventDefault();
      var original = target.textContent;
      if ("disabled" in target) target.disabled = true;
      target.setAttribute("aria-busy", "true");
      target.textContent = /生成|创建|提交|发送/.test(label) ? "处理中..." : "Working...";
      toast("Interaction started");
      window.setTimeout(function () {
        target.textContent = original;
        if ("disabled" in target) target.disabled = false;
        target.setAttribute("aria-busy", "false");
        toast("Prototype state updated");
      }, 900);
    }
  }, true);
})();
</script>`;

export function enhanceFlowCraftPrototype(code: string) {
  if (!code.trim() || code.includes(FLOWCRAFT_RUNTIME_MARKER)) return code;

  if (/<\/body>/i.test(code)) {
    return code.replace(/<\/body>/i, `${FLOWCRAFT_RUNTIME_SCRIPT}\n</body>`);
  }

  return `${code}\n${FLOWCRAFT_RUNTIME_SCRIPT}`;
}
