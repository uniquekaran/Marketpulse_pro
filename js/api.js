window.MPApi = (() => {
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  async function fetchJson(url, options = {}, attempts = 2) {
    let lastError;
    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          ...options,
          headers: { "Content-Type": "application/json", ...(options.headers || {}) }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(450 * (attempt + 1));
      }
    }
    throw lastError;
  }

  function applyHistory(asset, values, source, volumes = []) {
    const cleanPrices = values.filter((value) => Number.isFinite(value) && value > 0);
    if (!cleanPrices.length) throw new Error("Provider returned no usable prices");

    const previous = cleanPrices.length > 1 ? cleanPrices[cleanPrices.length - 2] : cleanPrices[0];
    const latest = cleanPrices[cleanPrices.length - 1];
    asset.price = latest;
    asset.change = Number((((latest - previous) / previous) * 100).toFixed(2));
    asset.trend = window.MPIndicators.calculateTrend(cleanPrices);
    asset.vol = window.MPIndicators.calculateVolatility(cleanPrices);
    asset.liveSeries = cleanPrices;
    asset.liveVolumes = volumes.length ? volumes.filter((value) => Number.isFinite(value)) : window.MPIndicators.syntheticVolumes(asset, cleanPrices.length);
    asset.source = source;
    asset.updatedAt = new Date();
    asset.stale = false;
    asset.lastError = "";
    window.MPIndicators.invalidate(asset);
  }

  async function loadYahooAsset(asset) {
    const symbol = encodeURIComponent(asset.yahoo);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`;
    const payload = await fetchJson(url);
    const quote = payload.chart?.result?.[0]?.indicators?.quote?.[0];
    const closes = quote?.close || [];
    const volumes = quote?.volume || [];
    applyHistory(asset, closes, "Yahoo free chart", volumes);
  }

  async function loadCoinGeckoAsset(asset) {
    const url = `https://api.coingecko.com/api/v3/coins/${asset.coingecko}/market_chart?vs_currency=inr&days=30&interval=daily`;
    const payload = await fetchJson(url);
    const prices = (payload.prices || []).map((item) => item[1]);
    const volumes = (payload.total_volumes || []).map((item) => item[1]);
    applyHistory(asset, prices, "CoinGecko free", volumes);
  }

  async function refreshAsset(asset) {
    if (!asset) return;
    window.MPLogger?.info("Market data refresh started", { symbol: asset.symbol });
    if (asset.coingecko) return loadCoinGeckoAsset(asset);
    if (asset.yahoo) return loadYahooAsset(asset);
    throw new Error("No free provider configured");
  }

  async function startOtpLogin(user, password) {
    const payload = await fetchJson(`${window.MPConfig?.apiUrl || ""}/api/auth/send-otp`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ name: user.name, email: user.email, password })
    }, 0);
    return payload;
  }

  async function verifyOtpLogin(user, otp) {
    const payload = await fetchJson(`${window.MPConfig?.apiUrl || ""}/api/auth/verify-otp`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ email: user.email, otp })
    }, 0);
    return payload;
  }

  async function getCurrentUser() {
    return fetchJson(`${window.MPConfig?.apiUrl || ""}/api/auth/me`, {
      method: "GET",
      credentials: "include"
    }, 0);
  }

  async function logout() {
    return fetchJson(`${window.MPConfig?.apiUrl || ""}/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    }, 0);
  }

  function markStale(asset, error) {
    asset.stale = true;
    asset.lastError = error?.message || "Data refresh failed";
    asset.source = asset.source || "Simulated fallback";
    window.MPLogger?.warn("Market data marked stale", { symbol: asset.symbol, error: asset.lastError });
    window.MPAnalytics?.track("api_failure", { symbol: asset.symbol, error: asset.lastError });
  }

  return { refreshAsset, markStale, startOtpLogin, verifyOtpLogin, getCurrentUser, logout };
})();
