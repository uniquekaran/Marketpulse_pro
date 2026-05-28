window.MPAlerts = (() => {
  function build(asset, indicators, state) {
    const previous = state.alertBaseline[asset.symbol];
    const alerts = [];
    if (state.alertPrefs.setup && previous && Math.abs(indicators.setupScore - previous.setupScore) >= 10) {
      alerts.push(`Setup score moved from ${previous.setupScore} to ${indicators.setupScore}.`);
    }
    if (state.alertPrefs.rsi && (indicators.rsi >= 70 || indicators.rsi <= 30)) {
      alerts.push(`RSI is ${indicators.rsi}, entering ${indicators.rsi >= 70 ? "overbought" : "oversold"} territory.`);
    }
    if (state.alertPrefs.ema && previous && indicators.maBullish !== previous.maBullish) {
      alerts.push(`EMA crossover changed to ${indicators.maBullish ? "bullish" : "bearish"}.`);
    }
    if (state.alertPrefs.volatility && previous && indicators.volScore - previous.volScore >= 15) {
      alerts.push(`Volatility spiked from ${previous.volScore} to ${indicators.volScore}.`);
    }
    if (!previous) alerts.push("Baseline created. Future changes will trigger alerts.");
    state.alertBaseline[asset.symbol] = {
      setupScore: indicators.setupScore,
      maBullish: indicators.maBullish,
      volScore: indicators.volScore
    };
    return alerts;
  }

  return { build };
})();
