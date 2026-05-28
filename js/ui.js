window.MPUI = (() => {
  const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
  const rupee = (value) => `Rs ${fmt.format(value || 0)}`;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let renderTimer = 0;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toast(message) {
    const box = $("#toast");
    box.textContent = message;
    box.classList.add("show");
    window.setTimeout(() => box.classList.remove("show"), 2200);
  }

  function setLoading(asset, isLoading) {
    document.body.classList.toggle("is-loading", isLoading);
    $("#marketStatus").textContent = isLoading ? `Loading free data for ${asset.symbol}` : statusText(asset);
    $("#refreshAnalysis").disabled = isLoading;
  }

  function statusText(asset) {
    if (asset.stale) return `${asset.source || "Fallback"} - stale`;
    return asset.source || "Rule-based fallback model";
  }

  function timeframeProbability(fits) {
    const total = fits.reduce((sum, fit) => sum + fit.value, 0) || 1;
    return fits.map((fit) => ({ ...fit, probability: Math.round((fit.value / total) * 100) }));
  }

  function renderTradingView(asset, state) {
    const theme = document.documentElement.classList.contains("light") ? "light" : "dark";
    const symbol = encodeURIComponent(asset.tv || "NSE:NIFTY");
    const key = `${symbol}-${theme}`;
    if (state.chartKey === key) return;
    state.chartKey = key;
    $("#tradingViewChart").innerHTML = `
      <iframe
        title="TradingView chart for ${escapeHtml(asset.symbol)}"
        src="https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=151a22&studies=RSI@tv-basicstudies%1FMACD@tv-basicstudies&theme=${theme}&style=1&timezone=Asia%2FKolkata&withdateranges=1&hideideas=1"
        loading="lazy"
        referrerpolicy="origin">
      </iframe>
    `;
  }

  function drawMiniChart(canvas, values) {
    if (!canvas || !values.length) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.scale(dpr, dpr);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = "#19c37d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = (index / (values.length - 1)) * rect.width;
      const y = (1 - (value - min) / span) * rect.height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function renderAdvisor(fits) {
    $("#advisorCards").innerHTML = fits.map((fit, index) => `
      <article class="advisor-card">
        <div class="score-ring" style="--value:${fit.value}%">${fit.value}</div>
        <div>
          <h3>${escapeHtml(fit.label)}</h3>
          <p>${escapeHtml(fit.copy)}</p>
        </div>
        <span class="badge">${index === 0 ? "Best" : "Alt"}</span>
      </article>
    `).join("");
  }

  function renderProbability(fits) {
    $("#probabilityBars").innerHTML = timeframeProbability(fits).map((fit) => `
      <div class="probability-row">
        <div><strong>${escapeHtml(fit.label)}</strong><span>${fit.probability}% model weight</span></div>
        <div class="bar"><span style="width:${fit.probability}%"></span></div>
      </div>
    `).join("");
  }

  function renderExplanation(asset, indicators, best, state) {
    const signal = window.MPIndicators.signalFor(asset).toLowerCase();
    const maText = indicators.maBullish ? "EMA 20 is above EMA 50" : "EMA 20 is below EMA 50";
    const macdText = indicators.macdBullish ? "MACD momentum is positive" : "MACD momentum is negative";
    $("#aiExplanation").textContent = `${asset.symbol} is reading ${signal}. The strongest fit is ${best.label} because ${maText}, ${macdText}, RSI is ${indicators.rsi}, and volume is ${indicators.volTrend.label.toLowerCase()}. This is rules-based analysis, not a prediction.`;
    $("#whySignal").innerHTML = [
      `Setup score is ${indicators.setupScore}/100 from RSI, MACD, EMA crossover, volatility, trend, and volume.`,
      `${maText}, which affects trend quality.`,
      `${macdText}, which affects momentum timing.`,
      `RSI is ${indicators.rsi}, interpreted as ${window.MPIndicators.rsiInterpretation(indicators.rsi)}.`,
      `Volatility score is ${indicators.volScore}; higher readings increase risk and favor smaller size.`,
      `Volume trend is ${indicators.volTrend.label}: ${indicators.volTrend.copy}.`
    ].map((item) => `<li>${item}</li>`).join("");
    $("#educationPanel").hidden = !state.educationalMode;
  }

  function renderSectors(asset, indicators) {
    const rows = window.MPData.sectors
      .map((sector, index) => ({ ...sector, score: window.MPIndicators.clamp(Math.round(sector.strength + (asset.region === "India" ? indicators.sentiment / 16 : 0) - index * 1.8)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    $("#sectorList").innerHTML = rows.map((sector) => `
      <div class="sector-row">
        <div><strong>${escapeHtml(sector.name)}</strong><span class="${sector.change >= 0 ? "up" : "down"}">${sector.change >= 0 ? "+" : ""}${sector.change}%</span></div>
        <div class="bar"><span style="width:${sector.score}%"></span></div>
      </div>
    `).join("");
  }

  function renderValidation(asset, indicators) {
    const stats = window.MPValidation.similarSetups(asset, indicators);
    const rate = stats.samples ? Math.round((stats.favorable / stats.samples) * 100) : 0;
    $("#validationStats").innerHTML = `
      <div><span>Similar samples</span><strong>${stats.samples}</strong></div>
      <div><span>Favorable after 5 bars</span><strong>${stats.samples ? `${rate}%` : "N/A"}</strong></div>
      <div><span>Average 5-bar move</span><strong>${stats.samples ? `${stats.averageMove.toFixed(2)}%` : "N/A"}</strong></div>
      <div><span>Worst interim drawdown</span><strong>${stats.samples ? `${stats.maxDrawdown.toFixed(2)}%` : "N/A"}</strong></div>
    `;
  }

  function renderComparison(state) {
    const metric = state.comparisonSort;
    const scored = window.MPData.markets.map((asset) => ({ asset, ind: window.MPIndicators.calculate(asset) }));
    const ranked = scored.sort((a, b) => {
      if (metric === "trend") return b.ind.trendScore - a.ind.trendScore;
      if (metric === "volatility") return b.ind.volScore - a.ind.volScore;
      return b.ind.setupScore - a.ind.setupScore;
    }).slice(0, 8);
    $("#comparisonTable").innerHTML = ranked.map(({ asset, ind }) => {
      return `
        <button class="comparison-row" data-symbol="${asset.symbol}">
          <span><strong>${escapeHtml(asset.symbol)}</strong><small>${escapeHtml(asset.type)}</small></span>
          <span>Setup <strong>${ind.setupScore}</strong></span>
          <span>Trend <strong>${ind.trendScore}</strong></span>
          <span>Vol <strong>${ind.volScore}</strong></span>
        </button>
      `;
    }).join("");
  }

  function renderAlerts(asset, indicators, state) {
    const alerts = window.MPAlerts.build(asset, indicators, state);
    $("#alertCount").textContent = `${alerts.length} active`;
    const list = $("#alertList");
    list.textContent = "";
    alerts.forEach((alert) => {
      const row = document.createElement("div");
      row.className = "alert-item";
      row.textContent = alert;
      list.append(row);
    });
  }

  function renderAccount(state) {
    const label = state.user ? state.user.name : "Guest";
    const sessionLabel = state.session?.active
      ? "Backend session"
      : "Guest workspace";
    $("#userMini").textContent = label;
    $("#accountStatus").textContent = state.user ? `${state.user.name} - ${sessionLabel}` : "Guest workspace";
    $("#authName").value = state.user?.name || "";
    $("#authEmail").value = state.user?.email || "";
    if ($("#authPassword")) $("#authPassword").value = "";
    if ($("#otpSection")) $("#otpSection").hidden = !state.otp?.pendingUser;
    if ($("#authOtp") && !state.otp?.pendingUser) $("#authOtp").value = "";
    $("#educationToggle").textContent = `Education: ${state.educationalMode ? "On" : "Off"}`;
  }

  function renderPosition(state, asset, indicators) {
    $("#entryInput").value = asset.price.toFixed(2);
    $("#stopInput").value = (asset.price * (indicators.volScore >= 60 ? 0.972 : 0.985)).toFixed(2);
    updatePosition(state);
  }

  function updatePosition(state) {
    const capital = Math.max(0, Number($("#capitalInput").value) || 0);
    const riskPercent = Math.min(5, Math.max(0, Number($("#riskInput").value) || 0));
    const entry = Math.max(0, Number($("#entryInput").value) || 0);
    const stop = Math.max(0, Number($("#stopInput").value) || 0);
    $("#riskInput").value = riskPercent;
    const riskAmount = capital * (riskPercent / 100);
    const perUnitRisk = Math.abs(entry - stop);
    const qty = perUnitRisk > 0 ? Math.floor(riskAmount / perUnitRisk) : 0;
    const target = entry + perUnitRisk * (state.riskMode === "aggressive" ? 2.4 : 1.8);
    $("#capitalMini").textContent = rupee(capital);
    $("#riskAmount").textContent = rupee(riskAmount);
    $("#quantityText").textContent = fmt.format(qty);
    $("#targetText").textContent = rupee(target || 0);
    $("#positionBadge").textContent = state.riskMode === "aggressive" ? "Aggressive" : "Balanced";
  }

  function renderWatchlist(state) {
    if (!state.watchlist.length) {
      $("#watchlist").innerHTML = `<div class="empty-state">No markets saved yet. Open a market and use Add selected to build a watchlist.</div>`;
      return;
    }
    $("#watchlist").innerHTML = state.watchlist.map((symbol, index) => {
      const asset = window.MPData.markets.find((item) => item.symbol === symbol);
      if (!asset) return "";
      const ind = window.MPIndicators.calculate(asset);
      return `
        <article class="watch-card">
          <div class="panel-head">
            <div class="symbol-cell"><strong>${escapeHtml(asset.symbol)}</strong><span>${escapeHtml(asset.name)}</span></div>
            <button class="icon-button remove-watch" data-symbol="${escapeHtml(asset.symbol)}" aria-label="Remove ${escapeHtml(asset.symbol)}">x</button>
          </div>
          <canvas id="watch-${index}"></canvas>
          <div class="hero-metrics">
            <div><span>Setup</span><strong>${ind.setupScore}</strong></div>
            <div><span>Fit</span><strong>${window.MPIndicators.timeframeFit(asset)[0].label}</strong></div>
            <div><span>Move</span><strong class="${asset.change >= 0 ? "up" : "down"}">${asset.change}%</strong></div>
          </div>
        </article>
      `;
    }).join("");
    // Draw charts only when the canvases have measurable size (e.g. not inside a hidden view).
    const firstCanvas = $(`#watch-0`);
    const canDraw = firstCanvas && firstCanvas.getBoundingClientRect().width > 0;
    if (canDraw) {
      state.watchlist.forEach((symbol, index) => {
        const asset = window.MPData.markets.find((item) => item.symbol === symbol);
        if (asset) drawMiniChart($(`#watch-${index}`), window.MPIndicators.calculate(asset).prices.slice(-36));
      });
    }
  }

  function renderScanner(state) {
    const rows = window.MPData.markets
      .filter((asset) => state.filter === "all" || asset.type === state.filter || asset.region.toLowerCase() === state.filter)
      .sort((a, b) => window.MPIndicators.calculate(b).setupScore - window.MPIndicators.calculate(a).setupScore);
    if (!rows.length) {
      $("#scannerTable").innerHTML = `<div class="empty-state">No markets match this filter.</div>`;
      return;
    }
    $("#scannerTable").innerHTML = `
      <div class="table-row header">
        <span>Market</span><span>Price</span><span>Change</span><span>Setup</span><span>Best style</span><span></span>
      </div>
      ${rows.map((asset) => {
        const ind = window.MPIndicators.calculate(asset);
        const fit = window.MPIndicators.timeframeFit(asset)[0];
        return `
          <div class="table-row">
            <div class="symbol-cell"><strong>${escapeHtml(asset.symbol)}</strong><span>${escapeHtml(asset.name)}</span></div>
            <strong>${rupee(asset.price)}</strong>
            <strong class="${asset.change >= 0 ? "up" : "down"}">${asset.change >= 0 ? "+" : ""}${asset.change}%</strong>
            <span class="badge">${ind.setupScore}</span>
            <span>${fit.label} / ${fit.value}%<br><small>${asset.stale ? "Stale fallback" : asset.source || "Rule model"}</small></span>
            <button class="ghost-button select-market" data-symbol="${asset.symbol}">Open</button>
          </div>
        `;
      }).join("")}
    `;
  }

  function renderPlan() {
    const style = $("#styleSelect").value;
    const market = $("#marketSelect").value;
    const trades = Math.max(1, Math.min(12, Number($("#tradeCount").value) || 1));
    const drawdown = Math.max(1, Math.min(30, Number($("#drawdownInput").value) || 1));
    const plan = {
      Intraday: ["Trade only high-liquidity sessions", "Use hard stops and avoid averaging down", "Close weak setups before session end"],
      Swing: ["Confirm trend on daily chart", "Scale entries near pullbacks", "Review open risk after major news"],
      "Mid-term": ["Prioritize earnings, sector strength, and trend durability", "Use wider stops with smaller size", "Rebalance weekly"],
      "Long-term": ["Build in tranches", "Use valuation and macro confirmation", "Review thesis monthly"]
    }[style];
    $("#planOutput").innerHTML = `<p>${style} plan for ${market}, capped at ${trades} trades per day and ${drawdown}% drawdown.</p><ul>${plan.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  }

  function renderDashboard(asset, state) {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(() => {
      const indicators = window.MPIndicators.calculate(asset);
      const fits = window.MPIndicators.timeframeFit(asset);
      const best = fits[0];
      $("#assetTitle").textContent = asset.name;
      $("#assetSummary").textContent = `${asset.region} ${asset.type} with ${indicators.maBullish ? "positive" : "cautious"} EMA structure, ${indicators.macdBullish ? "rising" : "soft"} MACD momentum, and ${indicators.volScore >= 65 ? "high" : "controlled"} volatility.`;
      $("#marketStatus").textContent = statusText(asset);
      $("#signalText").textContent = window.MPIndicators.signalFor(asset);
      $("#timeframeText").textContent = best.label;
      $("#setupScoreText").textContent = `${indicators.setupScore}/100`;
      $("#chartSymbol").textContent = asset.symbol;
      $("#chartPrice").textContent = rupee(asset.price);
      $("#rsiValue").textContent = indicators.rsi;
      $("#rsiCopy").textContent = window.MPIndicators.rsiInterpretation(indicators.rsi);
      $("#macdValue").textContent = indicators.macdBullish ? "Bullish" : "Bearish";
      $("#macdCopy").textContent = `Histogram ${indicators.macd.histogram.toFixed(2)}`;
      $("#volumeTrend").textContent = indicators.volTrend.label;
      $("#volumeCopy").textContent = indicators.volTrend.copy;
      $("#maStatus").textContent = indicators.maBullish ? "Bullish" : "Bearish";
      $("#maCopy").textContent = `EMA20 ${rupee(indicators.ema20)} vs EMA50 ${rupee(indicators.ema50)}`;
      $("#volatilityScore").textContent = indicators.volScore;
      $("#volatilityCopy").textContent = indicators.volScore >= 65 ? "Wide range, reduce size" : indicators.volScore >= 40 ? "Tradable range" : "Compressed range";
      $("#riskMeter").style.width = `${indicators.riskScore}%`;
      $("#riskCopy").textContent = indicators.riskScore >= 70 ? "High risk, size down" : indicators.riskScore >= 45 ? "Moderate risk" : "Lower risk structure";
      $("#sentimentGauge").style.setProperty("--value", `${indicators.sentiment}%`);
      $("#sentimentGauge strong").textContent = indicators.sentiment;
      $("#sentimentCopy").textContent = indicators.sentiment >= 65 ? "Positive breadth model" : indicators.sentiment >= 45 ? "Mixed breadth model" : "Defensive breadth model";
      $("#dataSource").textContent = asset.source || "Rule model";
      $("#dataFreshness").textContent = asset.updatedAt ? `Updated ${asset.updatedAt.toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}` : "Not refreshed yet";
      $("#scoreFormula").textContent = "Setup score = RSI 20% + MACD 20% + EMA crossover 22% + trend 18% + volume 10% + volatility control 10%.";
      renderAdvisor(fits);
      renderProbability(fits);
      renderExplanation(asset, indicators, best, state);
      renderSectors(asset, indicators);
      renderValidation(asset, indicators);
      renderComparison(state);
      renderAlerts(asset, indicators, state);
      renderAccount(state);
      renderPosition(state, asset, indicators);
      renderTradingView(asset, state);
    }, 0);
  }

  function showView(id) {
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === id));
    $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === id));
  }

  return { $, $$, toast, setLoading, renderDashboard, renderScanner, renderWatchlist, renderPlan, renderComparison, updatePosition, renderAccount, showView };
})();
