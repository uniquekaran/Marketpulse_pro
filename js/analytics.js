window.MPAnalytics = (() => {
  const key = "marketpulse-analytics";
  const maxRetries = 1;
  const requestTimeoutMs = 2500;

  function read() {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (error) {
      localStorage.removeItem(key);
      return {};
    }
  }

  function write(data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  function bump(bucket, id, amount = 1) {
    const data = read();
    data[bucket] = data[bucket] || {};
    data[bucket][id] = (data[bucket][id] || 0) + amount;
    data.lastSeenAt = new Date().toISOString();
    data.firstSeenAt = data.firstSeenAt || data.lastSeenAt;
    write(data);
  }

  function track(event, payload = {}) {
    if (!window.MPConfig?.analyticsEnabled) return;
    const data = read();
    data.events = data.events || [];
    data.events.push({ event, payload, timestamp: new Date().toISOString() });
    data.events = data.events.slice(-80);
    data.lastSeenAt = new Date().toISOString();
    data.firstSeenAt = data.firstSeenAt || data.lastSeenAt;
    write(data);

    if (window.MPConfig?.telemetryEndpoint) {
      deliver(window.MPConfig.telemetryEndpoint, { event, payload });
    }
  }

  async function postJsonWithTimeout(url, body) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), requestTimeoutMs) : 0;
    try {
      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller?.signal
      });
    } finally {
      if (controller) window.clearTimeout(timer);
    }
  }

  async function deliver(url, body) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await postJsonWithTimeout(url, body);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return;
      } catch (error) {
        if (attempt >= maxRetries) {
          window.MPLogger?.warn("Telemetry delivery failed", { message: error?.message || String(error) });
          return;
        }
        const backoff = 400 * (attempt + 1) + Math.round(Math.random() * 250);
        await new Promise((resolve) => window.setTimeout(resolve, backoff));
      } finally {
        attempt += 1;
      }
    }
  }

  return {
    track,
    marketViewed: (symbol) => {
      bump("marketViews", symbol);
      track("market_viewed", { symbol });
    },
    alertUsed: (ruleType) => {
      bump("alertUsage", ruleType);
      track("alert_rule_saved", { ruleType });
    },
    watchlistChanged: (action, symbol) => {
      bump("watchlistBehavior", action);
      track("watchlist_changed", { action, symbol });
    },
    retentionSeen: () => {
      bump("retention", new Date().toISOString().slice(0, 10));
      track("session_seen");
    },
    snapshot: read
  };
})();
