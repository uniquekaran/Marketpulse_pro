window.MPState = {
  state: {
    symbol: "NIFTY50",
    riskMode: "balanced",
    filter: "all",
    watchlist: ["NIFTY50", "BANKNIFTY", "RELIANCE", "BTC"],
    freeData: true,
    loadingSymbol: "",
    chartKey: "",
    user: null,
    session: {
      active: false,
      issuedAt: 0,
      expiresAt: 0,
      mode: "none"
    },
    comparisonSort: "setup",
    educationalMode: false,
    demoMode: false,
    onboardingSeen: false,
    alertPrefs: { setup: true, rsi: true, ema: true, volatility: true },
    alertBaseline: {},
    savedPlan: null,
    otp: {
      pendingUser: null,
      code: "",
      expiresAt: 0,
      attempts: 0,
      maxAttempts: 5,
      resendAvailableAt: 0,
      resendCooldownSeconds: 30
    },
    lastError: ""
  },
  currentAsset() {
    return window.MPData.markets.find((item) => item.symbol === this.state.symbol) || window.MPData.markets[0];
  }
};
