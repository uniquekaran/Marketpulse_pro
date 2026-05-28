window.MPDemo = (() => {
  function stableSeries(start, drift, length = 90) {
    return Array.from({ length }, (_, index) => {
      const wave = Math.sin(index / 5) * start * 0.012;
      return Math.max(1, start + drift * index + wave);
    });
  }

  function apply(state) {
    const profiles = {
      NIFTY50: [22120, 8.4],
      BANKNIFTY: [47450, 15.2],
      RELIANCE: [2860, 1.8],
      BTC: [5260000, 2200],
      NVDA: [88000, 140]
    };

    window.MPData.markets.forEach((asset) => {
      const profile = profiles[asset.symbol] || [asset.price * 0.96, asset.price * 0.0008];
      asset.liveSeries = stableSeries(profile[0], profile[1]);
      asset.liveVolumes = window.MPIndicators.syntheticVolumes(asset, asset.liveSeries.length);
      asset.price = asset.liveSeries[asset.liveSeries.length - 1];
      asset.change = 0.72;
      asset.source = "Demo stable data";
      asset.updatedAt = new Date("2026-05-07T09:30:00+05:30");
      asset.stale = false;
      window.MPIndicators.invalidate(asset);
    });

    state.demoMode = true;
    state.freeData = false;
    state.symbol = "NIFTY50";
    state.watchlist = ["NIFTY50", "BANKNIFTY", "RELIANCE", "BTC", "NVDA"];
    state.alertPrefs = { setup: true, rsi: true, ema: true, volatility: true };
    window.MPLogger?.info("Demo mode applied");
    window.MPAnalytics?.track("demo_mode_enabled");
  }

  return { apply };
})();
