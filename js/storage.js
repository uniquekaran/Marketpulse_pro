window.MPStorage = (() => {
  const key = "marketpulse-pro-state";

  function load(state) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      if (saved.user) state.user = saved.user;
      if (saved.session) state.session = { ...state.session, ...saved.session };
      if (Array.isArray(saved.watchlist) && saved.watchlist.length) state.watchlist = saved.watchlist;
      if (saved.symbol) state.symbol = saved.symbol;
      if (saved.riskMode) state.riskMode = saved.riskMode;
      if (typeof saved.educationalMode === "boolean") state.educationalMode = saved.educationalMode;
      if (typeof saved.demoMode === "boolean") state.demoMode = saved.demoMode;
      if (typeof saved.onboardingSeen === "boolean") state.onboardingSeen = saved.onboardingSeen;
      if (saved.alertPrefs) state.alertPrefs = { ...state.alertPrefs, ...saved.alertPrefs };
      if (saved.savedPlan) state.savedPlan = saved.savedPlan;
      state.otp = { pendingUser: null, code: "", expiresAt: 0, attempts: 0, maxAttempts: state.otp?.maxAttempts || 5, resendAvailableAt: 0, resendCooldownSeconds: 30 };
    } catch (error) {
      localStorage.removeItem(key);
    }
  }

  function save(state) {
    localStorage.setItem(key, JSON.stringify({
      user: state.user,
      session: state.session,
      watchlist: state.watchlist,
      symbol: state.symbol,
      riskMode: state.riskMode,
      educationalMode: state.educationalMode,
      demoMode: state.demoMode,
      onboardingSeen: state.onboardingSeen,
      alertPrefs: state.alertPrefs,
      savedPlan: state.savedPlan
    }));
  }

  return { load, save };
})();
