window.MPValidation = (() => {
  const cache = new WeakMap();

  function keyFor(asset, indicators) {
    const version = asset.version || 0;
    const rsi = Math.round(Number(indicators?.rsi || 0));
    const ma = indicators?.maBullish ? 1 : 0;
    const macd = indicators?.macdBullish ? 1 : 0;
    return `${version}:${rsi}:${ma}:${macd}`;
  }

  function similarSetups(asset, indicators) {
    const existing = cache.get(asset);
    const signature = keyFor(asset, indicators);
    if (existing && existing.signature === signature) return existing.value;

    const { prices } = window.MPIndicators.calculate(asset);
    if (prices.length < 35) {
      const value = { samples: 0, favorable: 0, averageMove: 0, maxDrawdown: 0 };
      cache.set(asset, { signature, value });
      return value;
    }

    const outcomes = [];
    for (let index = 26; index < prices.length - 5; index += 1) {
      const sampleAsset = {
        ...asset,
        liveSeries: prices.slice(0, index + 1),
        liveVolumes: window.MPIndicators.syntheticVolumes(asset, index + 1),
        version: index
      };
      const sample = window.MPIndicators.calculate(sampleAsset);
      const similar = Math.abs(sample.rsi - indicators.rsi) <= 8 && sample.maBullish === indicators.maBullish && sample.macdBullish === indicators.macdBullish;
      if (!similar) continue;
      const entry = prices[index];
      const exit = prices[index + 5];
      const windowPrices = prices.slice(index + 1, index + 6);
      outcomes.push({
        move: ((exit - entry) / entry) * 100,
        drawdown: Math.min(...windowPrices.map((value) => ((value - entry) / entry) * 100))
      });
    }

    if (!outcomes.length) {
      const value = { samples: 0, favorable: 0, averageMove: 0, maxDrawdown: 0 };
      cache.set(asset, { signature, value });
      return value;
    }

    const value = {
      samples: outcomes.length,
      favorable: outcomes.filter((item) => item.move > 0).length,
      averageMove: outcomes.reduce((sum, item) => sum + item.move, 0) / outcomes.length,
      maxDrawdown: Math.min(...outcomes.map((item) => item.drawdown))
    };
    cache.set(asset, { signature, value });
    return value;
  }

  return { similarSetups };
})();
