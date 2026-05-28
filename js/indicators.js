window.MPIndicators = (() => {
  const cache = new WeakMap();

  const clamp = (value) => Math.max(1, Math.min(99, value));

  function seriesFor(asset, points = 90) {
    const seed = [...asset.symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const direction = (asset.trend - 50) / 240;
    const amplitude = asset.vol / 620;
    const data = [];
    let price = asset.price * (1 - direction * 9);

    for (let index = 0; index < points; index += 1) {
      const wave = Math.sin((index + seed) / 5) * amplitude;
      const pulse = Math.cos((index + seed) / 11) * amplitude * 0.7;
      price *= 1 + direction + wave + pulse;
      data.push(Math.max(price, asset.price * 0.42));
    }
    return data;
  }

  function movingAverage(values, period) {
    if (!values.length) return 0;
    const count = Math.min(period, values.length);
    const slice = values.slice(-count);
    return slice.reduce((sum, value) => sum + value, 0) / count;
  }

  function ema(values, period) {
    if (!values.length) return 0;
    const multiplier = 2 / (period + 1);
    return values.reduce((average, value, index) => index === 0 ? value : value * multiplier + average * (1 - multiplier), values[0]);
  }

  function calculateTrend(values) {
    if (values.length < 8) return 50;
    const recent = movingAverage(values.slice(-5), 5);
    const older = movingAverage(values.slice(0, 5), 5);
    return clamp(Math.round(50 + ((recent - older) / older) * 500));
  }

  function calculateVolatility(values) {
    if (values.length < 2) return 40;
    const returns = values.slice(1).map((value, index) => Math.abs((value - values[index]) / values[index]) * 100);
    const average = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    return clamp(Math.round(average * 18));
  }

  function calculateRsi(values, period = 14) {
    if (values.length <= period) return 50;
    const changes = values.slice(1).map((value, index) => value - values[index]);
    const recent = changes.slice(-period);
    const gains = recent.filter((value) => value > 0).reduce((sum, value) => sum + value, 0) / period;
    const losses = Math.abs(recent.filter((value) => value < 0).reduce((sum, value) => sum + value, 0) / period);
    if (losses === 0) return 100;
    return Math.round(100 - 100 / (1 + gains / losses));
  }

  function calculateMacd(values) {
    const macd = ema(values, 12) - ema(values, 26);
    const tail = values.slice(-18);
    const line = tail.map((_, index) => {
      const slice = values.slice(0, values.length - tail.length + index + 1);
      return ema(slice, 12) - ema(slice, 26);
    });
    const signal = ema(line, 9);
    return { macd, signal, histogram: macd - signal };
  }

  function syntheticVolumes(asset, length) {
    return Array.from({ length }, (_, index) => {
      const base = asset.liq * 12000;
      const wave = 1 + Math.sin((index + asset.symbol.length) / 4) * 0.18;
      const trend = 1 + (asset.trend - 50) / 420;
      return Math.max(1000, Math.round(base * wave * trend));
    });
  }

  function volumeSignal(volumes) {
    if (volumes.length < 10) return { label: "Neutral", score: 50, copy: "Limited volume history" };
    const recent = movingAverage(volumes, 5);
    const base = movingAverage(volumes.slice(0, -5), 20);
    const ratio = base ? recent / base : 1;
    if (ratio >= 1.18) return { label: "Rising", score: 78, copy: "Recent participation is expanding" };
    if (ratio <= 0.86) return { label: "Falling", score: 38, copy: "Participation is cooling" };
    return { label: "Steady", score: 58, copy: "Volume is close to its baseline" };
  }

  function rsiInterpretation(rsi) {
    if (rsi >= 70) return "Overbought / momentum stretched";
    if (rsi >= 58) return "Bullish momentum";
    if (rsi >= 42) return "Neutral zone";
    if (rsi >= 30) return "Bearish momentum";
    return "Oversold / reversal watch";
  }

  function getHistory(asset) {
    const prices = asset.liveSeries || seriesFor(asset, 90);
    const volumes = asset.liveVolumes || syntheticVolumes(asset, prices.length);
    return { prices, volumes };
  }

  function calculate(asset) {
    const cached = cache.get(asset);
    if (cached && cached.version === asset.version) return cached.value;

    const { prices, volumes } = getHistory(asset);
    const rsi = calculateRsi(prices);
    const macd = calculateMacd(prices);
    const ema20 = ema(prices, 20);
    const ema50 = ema(prices, 50);
    const volScore = calculateVolatility(prices);
    const volTrend = volumeSignal(volumes);
    const trendScore = calculateTrend(prices);
    const maBullish = ema20 > ema50;
    const macdBullish = macd.histogram > 0;
    const rsiScore = rsi >= 45 && rsi <= 68 ? 78 : rsi > 68 ? 56 : rsi >= 35 ? 52 : 34;
    const maScore = maBullish ? 78 : 42;
    const macdScore = macdBullish ? 76 : 38;
    const volatilityScore = 100 - Math.min(95, volScore);
    const setupScore = clamp(Math.round(rsiScore * 0.2 + macdScore * 0.2 + maScore * 0.22 + trendScore * 0.18 + volTrend.score * 0.1 + volatilityScore * 0.1));
    const riskScore = clamp(Math.round(volScore * 0.58 + (rsi > 72 || rsi < 28 ? 22 : 8) + Math.abs(asset.change) * 4));
    const sentiment = clamp(Math.round(setupScore * 0.48 + trendScore * 0.22 + volTrend.score * 0.18 + asset.liq * 0.12));
    const value = { prices, volumes, rsi, macd, ema20, ema50, volScore, volTrend, trendScore, maBullish, macdBullish, setupScore, riskScore, sentiment };
    cache.set(asset, { version: asset.version, value });
    return value;
  }

  function timeframeFit(asset) {
    const ind = calculate(asset);
    const intraday = Math.round(ind.volScore * 0.28 + ind.volTrend.score * 0.22 + asset.liq * 0.24 + Math.abs(asset.change) * 5 + (ind.rsi >= 45 && ind.rsi <= 68 ? 10 : 0));
    const swing = Math.round(ind.trendScore * 0.28 + ind.setupScore * 0.28 + ind.volTrend.score * 0.18 + (ind.macdBullish ? 12 : 0));
    const mid = Math.round(ind.trendScore * 0.34 + ind.setupScore * 0.28 + (100 - ind.volScore) * 0.18 + (ind.maBullish ? 14 : 0));
    const long = Math.round(ind.trendScore * 0.28 + asset.liq * 0.14 + ind.sentiment * 0.24 + (100 - ind.volScore) * 0.22 + (ind.maBullish ? 10 : 0));
    return [
      { label: "Intraday", value: clamp(intraday), copy: "Fast moves, tight stops, high monitoring." },
      { label: "Swing", value: clamp(swing), copy: "Multi-day momentum with cleaner risk windows." },
      { label: "Mid-term", value: clamp(mid), copy: "Trend continuation with moderate review frequency." },
      { label: "Long-term", value: clamp(long), copy: "Stronger fit when volatility cools and trend holds." }
    ].sort((a, b) => b.value - a.value);
  }

  function signalFor(asset) {
    const ind = calculate(asset);
    if (ind.setupScore >= 76 && ind.macdBullish && ind.maBullish) return "Strong bullish";
    if (ind.setupScore >= 62) return "Bullish";
    if (ind.setupScore >= 45) return "Neutral";
    return "Weak";
  }

  function invalidate(asset) {
    asset.version = (asset.version || 0) + 1;
  }

  return { calculate, timeframeFit, signalFor, rsiInterpretation, seriesFor, syntheticVolumes, calculateTrend, calculateVolatility, invalidate, clamp };
})();
