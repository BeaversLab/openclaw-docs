(function () {
  var TAG = "v2026.4.25-beta.11";
  var UPDATED_AT = "2026-04-27";
  var COMMIT = "94c1e10643ea8f3140924572539df72438a8352c";
  var SHORT_COMMIT = COMMIT.slice(0, 7);
  var META_ID = "openclaw-version-meta";
  var STYLE_ID = "openclaw-version-style";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" +
      META_ID +
      " {" +
      " display: inline-flex; align-items: center; gap: 8px;" +
      " font-size: 12px; color: rgb(107 114 128);" +
      " padding: 4px 8px; border-radius: 10px;" +
      " background: rgba(15, 23, 42, 0.04);" +
      " }" +
      "#" +
      META_ID +
      " .meta-label {" +
      " font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;" +
      " color: rgba(107, 114, 128, 0.9);" +
      " }" +
      "#" +
      META_ID +
      " .meta-value {" +
      " font-variant-numeric: tabular-nums;" +
      " }" +
      "#" +
      META_ID +
      " .meta-sep {" +
      " color: rgba(107, 114, 128, 0.6);" +
      " }" +
      "#" +
      META_ID +
      " .meta-link {" +
      " color: rgb(59 130 246); text-decoration: none;" +
      " border-bottom: 1px dotted rgba(59, 130, 246, 0.6);" +
      " }" +
      "#" +
      META_ID +
      " .meta-link:hover {" +
      " color: rgb(37 99 235); border-bottom-color: rgba(37, 99, 235, 0.6);" +
      " }" +
      "@media (prefers-color-scheme: dark) {" +
      " #" +
      META_ID +
      " {" +
      " color: rgb(156 163 175); background: rgba(148, 163, 184, 0.08);" +
      " }" +
      " #" +
      META_ID +
      " .meta-link {" +
      " color: rgb(125 211 252); border-bottom-color: rgba(125, 211, 252, 0.55);" +
      " }" +
      " #" +
      META_ID +
      " .meta-link:hover {" +
      " color: rgb(56 189 248); border-bottom-color: rgba(56, 189, 248, 0.65);" +
      " }" +
      " }";
    document.head.appendChild(style);
  }

  function buildMetaNode() {
    var isZh = (location.pathname || "").toLowerCase().startsWith("/zh");
    var versionText = isZh ? "版本" : "Version";
    var updatedText = isZh ? "更新" : "Updated";
    var tagUrl = TAG
      ? "https://github.com/openclaw/openclaw/releases/tag/" + TAG
      : "";

    var wrapper = document.createElement("div");
    wrapper.id = META_ID;
    wrapper.setAttribute("aria-label", "Documentation build metadata");

    var versionLabel = document.createElement("span");
    versionLabel.className = "meta-label";
    versionLabel.textContent = versionText;

    var versionNode;
    if (TAG && tagUrl) {
      versionNode = document.createElement("a");
      versionNode.className = "meta-link";
      versionNode.href = tagUrl;
      versionNode.textContent = TAG + " (" + SHORT_COMMIT + ")";
    } else {
      versionNode = document.createElement("span");
      versionNode.className = "meta-value";
      versionNode.textContent = "dev (" + SHORT_COMMIT + ")";
    }

    var sep1 = document.createElement("span");
    sep1.className = "meta-sep";
    sep1.textContent = "·";

    var updatedLabel = document.createElement("span");
    updatedLabel.className = "meta-label";
    updatedLabel.textContent = updatedText;

    var updatedValue = document.createElement("time");
    updatedValue.className = "meta-value";
    updatedValue.setAttribute("datetime", UPDATED_AT);
    updatedValue.textContent = UPDATED_AT;

    wrapper.appendChild(versionLabel);
    wrapper.appendChild(versionNode);
    wrapper.appendChild(sep1);
    wrapper.appendChild(updatedLabel);
    wrapper.appendChild(updatedValue);
    return wrapper;
  }

  function insertMeta() {
    if (document.getElementById(META_ID)) return;
    if (document.querySelector("[data-doc-version-meta]")) return;

    var trigger = document.getElementById("localization-select-trigger");
    if (!trigger) return;

    var container = trigger.parentElement;
    if (!container) return;

    ensureStyles();

    var metaNode = buildMetaNode();
    container.appendChild(metaNode);
  }

  function startObserver() {
    insertMeta();
    var observer = new MutationObserver(function () {
      insertMeta();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
})();
