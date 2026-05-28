window.MPLogger = (() => {
  const queue = [];

  function serializeError(error) {
    return {
      message: error?.message || String(error),
      stack: error?.stack || "",
      name: error?.name || "Error"
    };
  }

  function showBoundary(message) {
    const box = document.querySelector("#errorBoundary");
    if (!box) return;
    box.querySelector("span").textContent = message;
    box.hidden = false;
  }

  function log(level, message, context = {}) {
    const entry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString()
    };
    queue.push(entry);
    if (queue.length > 100) queue.shift();
    if (level === "error") console.error("[MarketPulse]", message, context);
    else if (level === "warn") console.warn("[MarketPulse]", message, context);
    else console.info("[MarketPulse]", message, context);
    return entry;
  }

  function error(message, errorValue, context = {}) {
    const entry = log("error", message, { ...context, error: serializeError(errorValue) });
    showBoundary("Something went wrong. The dashboard is still available with fallback data.");
    return entry;
  }

  function installGlobalHandlers() {
    window.addEventListener("error", (event) => {
      const source = event.filename || event.target?.src || event.target?.href || "";
      const isResourceError = event.target && event.target !== window && !event.error;
      const isThirdPartyNoise = source && !source.includes(location.pathname.replace(/\/[^/]*$/, "")) && /tradingview|googleapis|gstatic|extension/i.test(source);
      const isOpaqueScriptError = event.message === "Script error." && !event.error;

      if (isResourceError || isThirdPartyNoise || isOpaqueScriptError) {
        log("warn", "Ignored external/resource error", { source, message: event.message || "resource failed" });
        return;
      }

      error("Unhandled frontend error", event.error || event.message, { source: event.filename, line: event.lineno });
    });
    window.addEventListener("unhandledrejection", (event) => {
      const message = event.reason?.message || String(event.reason || "");
      const stack = event.reason?.stack || "";
      const looksExternal = /extension|tradingview|googleapis|gstatic/i.test(message + stack);
      const looksLikeNetworkNoise = /failed to fetch|networkerror|load failed|fetch/i.test(message);

      if (looksExternal || looksLikeNetworkNoise) {
        log("warn", "Ignored external/network promise rejection", { message });
        return;
      }

      error("Unhandled promise rejection", event.reason);
    });
  }

  return {
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error,
    installGlobalHandlers,
    entries: () => [...queue]
  };
})();
