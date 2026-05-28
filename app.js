(() => {
  const { state } = window.MPState;
  const ui = window.MPUI;
  const storage = window.MPStorage;
  const onboardingSteps = [
    {
      title: "Start with a market",
      copy: "Use the Market dropdown to switch between NIFTY, BANKNIFTY, crypto, stocks, and commodities."
    },
    {
      title: "Read the setup, not a prediction",
      copy: "The setup score is rule-based. Open How score is calculated to see the exact indicator mix."
    },
    {
      title: "Save and test workflows",
      copy: "Add markets to the watchlist, save alert rules, and use Demo mode when presenting stable sample data."
    }
  ];
  let onboardingIndex = 0;
  let resendTimer = 0;

  function save() {
    storage.save(state);
  }

  function currentAsset() {
    return window.MPState.currentAsset();
  }

  function updateControls() {
    ui.$("#liveToggle").textContent = `Free data: ${state.freeData ? "On" : "Off"}`;
    ui.$("#demoToggle").textContent = state.demoMode ? "Demo: On" : "Demo mode";
    ui.$("#symbolSearch").value = state.symbol;
  }

  function activeViewId() {
    return ui.$(".view.active")?.id || "dashboard";
  }

  async function refreshData(asset, quiet = false) {
    if (!state.freeData || !asset) return;
    state.loadingSymbol = asset.symbol;
    ui.setLoading(asset, true);
    try {
      await window.MPApi.refreshAsset(asset);
      state.lastError = "";
      if (!quiet) ui.toast(`${asset.symbol} refreshed`);
    } catch (error) {
      window.MPApi.markStale(asset, error);
      state.lastError = error.message;
      if (!quiet) ui.toast(`Free data unavailable. Showing stale/fallback analysis.`);
    } finally {
      state.loadingSymbol = "";
      ui.setLoading(asset, false);
      renderAll(false);
    }
  }

  function renderAll(fetchData = true) {
    const asset = currentAsset();
    const view = activeViewId();

    // Always update top-level UI affordances that exist across views.
    updateControls();
    ui.renderAccount(state);

    if (view === "dashboard") ui.renderDashboard(asset, state);
    if (view === "scanner") ui.renderScanner(state);
    if (view === "portfolio") ui.renderWatchlist(state);
    if (view === "strategy") ui.renderPlan();
    if (view === "alerts") ui.renderDashboard(asset, state);
    if (view === "billing") ui.renderDashboard(asset, state);

    if (fetchData && state.freeData && !asset.liveSeries && state.loadingSymbol !== asset.symbol) {
      refreshData(asset, true);
    }
  }

  function showView(id) {
    ui.showView(id);
    renderAll(false);
  }

  function selectSymbol(symbol, { jumpToView = "", toast = true } = {}) {
    if (!symbol || !window.MPData.markets.some((asset) => asset.symbol === symbol)) return;
    state.symbol = symbol;
    ui.$("#symbolSearch").value = state.symbol;
    save();
    renderAll();
    window.MPAnalytics.marketViewed(state.symbol);
    if (toast) ui.toast(`${state.symbol} analysis loaded`);
    if (jumpToView) showView(jumpToView);
  }

  function showAuthError(message, fieldId = "") {
    const errorBox = ui.$("#authError");
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.focus();
    if (fieldId) ui.$(`#${fieldId}`)?.setAttribute("aria-invalid", "true");
  }

  function clearAuthError() {
    const errorBox = ui.$("#authError");
    errorBox.textContent = "";
    errorBox.hidden = true;
    ["authName", "authEmail", "authPassword"].forEach((id) => ui.$(`#${id}`)?.removeAttribute("aria-invalid"));
  }

  function validateAuth(name, email, password) {
    const cleanName = name.trim().slice(0, 60);
    const cleanEmail = email.trim().toLowerCase().slice(0, 120);
    const cleanPassword = password.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!cleanName) return { error: "Name is required.", field: "authName" };
    if (!emailOk) return { error: "Enter a valid email address.", field: "authEmail" };
    if (cleanPassword.length < 8) return { error: "Password must be at least 8 characters for this demo form.", field: "authPassword" };
    return { name: cleanName, email: cleanEmail };
  }

  function createSession(mode = "backend-cookie", session = {}) {
    const issuedAt = session.issuedAt || Date.now();
    state.session = {
      active: true,
      issuedAt,
      expiresAt: session.expiresAt || issuedAt + 24 * 60 * 60 * 1000,
      mode
    };
  }

  function clearSession() {
    state.session = { active: false, issuedAt: 0, expiresAt: 0, mode: "none" };
  }

  async function restoreSession() {
    try {
      const result = await window.MPApi.getCurrentUser();
      if (result.authenticated && result.user) {
        state.user = result.user;
        createSession("backend-cookie", result.session);
        save();
        return;
      }
    } catch (error) {
      if (state.session?.active || state.user) window.MPLogger.warn("Session restore failed", { message: error.message });
    }
    if (state.session?.active || state.user) {
      state.user = null;
      clearSession();
      save();
    }
  }

  function updateResendButton() {
    const button = ui.$("#resendOtpButton");
    if (!button) return;
    const remainingMs = Math.max(0, state.otp.resendAvailableAt - Date.now());
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    button.disabled = remainingSeconds > 0;
    button.textContent = remainingSeconds > 0 ? `Resend in ${remainingSeconds}s` : "Resend code";
    if (remainingSeconds > 0) {
      window.clearTimeout(resendTimer);
      resendTimer = window.setTimeout(updateResendButton, 1000);
    }
  }

  function maskEmail(email) {
    const [name, domain] = email.split("@");
    if (!domain) return email;
    const visible = name.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
  }

  async function startOtpChallenge(user, password, { resent = false } = {}) {
    try {
      await window.MPApi.startOtpLogin(user, password);
    } catch (error) {
      showAuthError("Unable to send a one-time code right now. Please try again.", "authEmail");
      window.MPLogger.warn("OTP start failed", { message: error.message });
      return false;
    }
    state.otp = {
      pendingUser: user,
      code: "",
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      maxAttempts: 5,
      resendAvailableAt: Date.now() + 30 * 1000,
      resendCooldownSeconds: 30
    };
    ui.$("#otpHint").textContent = `Code ${resent ? "resent" : "sent"} to ${maskEmail(user.email)}. Enter the 6-digit code from your email.`;
    ui.$("#otpSection").hidden = false;
    ui.$("#sendOtpButton").disabled = true;
    ui.$("#authPassword").disabled = true;
    ui.$("#authOtp").value = "";
    updateResendButton();
    window.setTimeout(() => ui.$("#authOtp").focus(), 0);
    window.MPAnalytics.track("otp_challenge_started", { emailDomain: user.email.split("@")[1] || "unknown" });
    return true;
  }

  function resetOtpChallenge() {
    window.clearTimeout(resendTimer);
    state.otp = { pendingUser: null, code: "", expiresAt: 0, attempts: 0, maxAttempts: 5, resendAvailableAt: 0, resendCooldownSeconds: 30 };
    ui.$("#otpSection").hidden = true;
    ui.$("#sendOtpButton").disabled = false;
    ui.$("#authPassword").disabled = false;
    ui.$("#resendOtpButton").disabled = false;
    ui.$("#resendOtpButton").textContent = "Resend code";
    ui.$("#authOtp").value = "";
  }

  async function verifyOtp() {
    clearAuthError();
    const code = ui.$("#authOtp").value.trim();
    if (!state.otp.pendingUser) {
      showAuthError("Start login first so we can send a one-time code.", "authEmail");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showAuthError("Enter the 6-digit one-time code.", "authOtp");
      return;
    }
    if (Date.now() > state.otp.expiresAt) {
      showAuthError("That code has expired. Please resend a new code.", "authOtp");
      return;
    }
    state.otp.attempts += 1;
    if (state.otp.attempts > state.otp.maxAttempts) {
      resetOtpChallenge();
      showAuthError("Too many incorrect attempts. Start login again.", "authEmail");
      return;
    }
    try {
      const result = await window.MPApi.verifyOtpLogin(state.otp.pendingUser, code);
      if (result.verified === false) {
        showAuthError("That code is incorrect or expired. Please try again.", "authOtp");
        return;
      }
      state.user = result.user || state.otp.pendingUser;
      createSession("backend-cookie");
    } catch (error) {
      showAuthError("That code is incorrect or expired. Please try again.", "authOtp");
      window.MPLogger.warn("OTP verification failed", { message: error.message });
      return;
    }
    resetOtpChallenge();
    save();
    ui.renderAccount(state);
    ui.$("#authPassword").value = "";
    ui.toast("OTP verified. Backend session active.");
    window.MPAnalytics.track("otp_verified");
  }

  function showOnboarding() {
    const step = onboardingSteps[onboardingIndex];
    ui.$("#onboardingTitle").textContent = step.title;
    ui.$("#onboardingCopy").textContent = step.copy;
    ui.$("#nextOnboarding").textContent = onboardingIndex === onboardingSteps.length - 1 ? "Finish" : "Next";
    ui.$("#onboarding").hidden = false;
  }

  function closeOnboarding() {
    state.onboardingSeen = true;
    save();
    ui.$("#onboarding").hidden = true;
  }

  function showHelperMessage(message) {
    const box = ui.$("#aiHelpMessages");
    if (!box) return;
    box.textContent = message;
  }

  function toggleHelper(open) {
    const panel = ui.$("#aiHelpPanel");
    const toggle = ui.$("#aiHelpToggle");
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      window.MPAnalytics.track("ai_helper_opened");
      window.setTimeout(() => ui.$("#aiHelpInput")?.focus(), 0);
    }
  }

  function askHelper(rawQuery) {
    const response = window.MPHelper.answer(rawQuery);
    showHelperMessage(response);
    window.MPAnalytics.track("ai_helper_topic", { queryType: window.MPHelper.redact(rawQuery).slice(0, 32) || "quick-topic" });
  }

  function bindEvents() {
    ui.$$(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    ui.$$("[data-view-jump]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewJump)));

    ui.$$(".segment[data-risk]").forEach((button) => button.addEventListener("click", () => {
      state.riskMode = button.dataset.risk;
      ui.$$(".segment[data-risk]").forEach((item) => item.classList.toggle("active", item === button));
      save();
      renderAll(false);
    }));

    ui.$$(".filters .segment").forEach((button) => button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      ui.$$(".filters .segment").forEach((item) => item.classList.toggle("active", item === button));
      ui.renderScanner(state);
    }));

    ui.$("#symbolSearch").addEventListener("change", (event) => {
      selectSymbol(event.target.value);
    });

    ui.$("#scannerTable").addEventListener("click", (event) => {
      const button = event.target.closest(".select-market");
      if (!button) return;
      selectSymbol(button.dataset.symbol, { jumpToView: "dashboard", toast: false });
    });

    ui.$("#comparisonTable").addEventListener("click", (event) => {
      const row = event.target.closest(".comparison-row");
      if (!row) return;
      selectSymbol(row.dataset.symbol, { toast: false });
    });

    ui.$("#comparisonSort").addEventListener("change", (event) => {
      state.comparisonSort = event.target.value;
      ui.renderComparison(state);
    });

    ["capitalInput", "riskInput", "entryInput", "stopInput"].forEach((id) => {
      ui.$(`#${id}`).addEventListener("input", () => ui.updatePosition(state));
    });
    ["styleSelect", "marketSelect", "tradeCount", "drawdownInput"].forEach((id) => {
      ui.$(`#${id}`).addEventListener("input", ui.renderPlan);
    });

    ui.$("#refreshAnalysis").addEventListener("click", () => {
      const asset = currentAsset();
      if (state.freeData) refreshData(asset);
      else {
        asset.change = Number((asset.change + (Math.random() - 0.45)).toFixed(2));
        asset.trend = window.MPIndicators.clamp(asset.trend + Math.round((Math.random() - 0.45) * 8));
        asset.vol = window.MPIndicators.clamp(asset.vol + Math.round((Math.random() - 0.5) * 6));
        window.MPIndicators.invalidate(asset);
        renderAll(false);
        ui.toast("Fallback analysis refreshed");
      }
    });

    ui.$("#dismissErrorBoundary")?.addEventListener("click", () => {
      const box = ui.$("#errorBoundary");
      if (box) box.hidden = true;
    });

    ui.$("#addCurrent").addEventListener("click", () => {
      if (!state.watchlist.includes(state.symbol)) state.watchlist.push(state.symbol);
      save();
      ui.renderWatchlist(state);
      window.MPAnalytics.watchlistChanged("add", state.symbol);
      ui.toast(`${state.symbol} added to watchlist`);
    });

    ui.$("#watchlist").addEventListener("click", (event) => {
      const button = event.target.closest(".remove-watch");
      if (!button) return;
      state.watchlist = state.watchlist.filter((symbol) => symbol !== button.dataset.symbol);
      save();
      ui.renderWatchlist(state);
      window.MPAnalytics.watchlistChanged("remove", button.dataset.symbol);
    });

    ui.$("#authForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      clearAuthError();
      const result = validateAuth(ui.$("#authName").value, ui.$("#authEmail").value, ui.$("#authPassword").value);
      if (result.error) {
        showAuthError(result.error, result.field);
        return;
      }
      const started = await startOtpChallenge(result, ui.$("#authPassword").value);
      if (started) ui.toast("OTP step ready");
    });

    ui.$("#verifyOtpButton").addEventListener("click", verifyOtp);

    ui.$("#authOtp").addEventListener("input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
    });

    ui.$("#authOtp").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        verifyOtp();
      }
    });

    ui.$("#resendOtpButton").addEventListener("click", async () => {
      if (!state.otp.pendingUser) {
        showAuthError("Start login first before resending a code.", "authEmail");
        return;
      }
      if (Date.now() < state.otp.resendAvailableAt) {
        showAuthError("Please wait before requesting another code.", "authOtp");
        return;
      }
      const started = await startOtpChallenge(state.otp.pendingUser, ui.$("#authPassword").value, { resent: true });
      if (started) ui.toast("OTP code resent");
    });

    ui.$("#logoutButton").addEventListener("click", async () => {
      try {
        await window.MPApi.logout();
      } catch (error) {
        window.MPLogger.warn("Backend logout failed", { message: error.message });
      }
      state.user = null;
      clearSession();
      resetOtpChallenge();
      save();
      ui.renderAccount(state);
      clearAuthError();
      ui.toast("Logged out locally");
    });

    ui.$("#aiHelpToggle")?.addEventListener("click", () => {
      toggleHelper(ui.$("#aiHelpPanel").hidden);
    });

    ui.$("#aiHelpClose")?.addEventListener("click", () => toggleHelper(false));

    ui.$$("[data-help-topic]").forEach((button) => button.addEventListener("click", () => {
      const topic = button.dataset.helpTopic;
      showHelperMessage(window.MPHelper.topics[topic] || window.MPHelper.answer(topic));
      window.MPAnalytics.track("ai_helper_topic", { topic });
    }));

    ui.$("#aiHelpAsk")?.addEventListener("click", () => {
      askHelper(ui.$("#aiHelpInput").value);
    });

    ui.$("#aiHelpInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        askHelper(event.target.value);
      }
    });

    ui.$("#saveAlertPrefs").addEventListener("click", () => {
      state.alertPrefs = {
        setup: ui.$("#alertSetup").checked,
        rsi: ui.$("#alertRsi").checked,
        ema: ui.$("#alertEma").checked,
        volatility: ui.$("#alertVolatility").checked
      };
      save();
      renderAll(false);
      Object.entries(state.alertPrefs).forEach(([rule, enabled]) => {
        if (enabled) window.MPAnalytics.alertUsed(rule);
      });
      ui.toast("Alert rules saved");
    });

    ui.$("#liveToggle").addEventListener("click", () => {
      state.freeData = !state.freeData;
      state.demoMode = false;
      updateControls();
      if (state.freeData) refreshData(currentAsset());
      else renderAll(false);
    });

    ui.$("#demoToggle").addEventListener("click", () => {
      window.MPDemo.apply(state);
      save();
      updateControls();
      renderAll(false);
      ui.toast("Demo mode loaded with stable sample data");
    });

    ui.$("#savePlan")?.addEventListener("click", () => {
      state.savedPlan = {
        style: ui.$("#styleSelect")?.value || "Intraday",
        market: ui.$("#marketSelect")?.value || "Indian indices",
        trades: Number(ui.$("#tradeCount")?.value || 2),
        drawdown: Number(ui.$("#drawdownInput")?.value || 6),
        savedAt: new Date().toISOString()
      };
      save();
      ui.toast("Plan saved locally");
    });

    ui.$("#educationToggle").addEventListener("click", () => {
      state.educationalMode = !state.educationalMode;
      save();
      renderAll(false);
    });

    ui.$("#themeToggle").addEventListener("click", () => {
      document.documentElement.classList.toggle("light");
      state.chartKey = "";
      renderAll(false);
    });

    window.addEventListener("resize", () => {
      if (activeViewId() === "portfolio") {
        window.requestAnimationFrame(() => ui.renderWatchlist(state));
      }
    });

    ui.$("#skipOnboarding").addEventListener("click", closeOnboarding);
    ui.$("#nextOnboarding").addEventListener("click", () => {
      if (onboardingIndex >= onboardingSteps.length - 1) {
        closeOnboarding();
        return;
      }
      onboardingIndex += 1;
      showOnboarding();
    });
  }

  async function init() {
    window.MPLogger.installGlobalHandlers();
    const errorBoundary = ui.$("#errorBoundary");
    if (errorBoundary) errorBoundary.hidden = true;
    storage.load(state);
    await restoreSession();
    if (window.MPConfig.demoMode || state.demoMode) {
      window.MPDemo.apply(state);
    }

    // Populate market selector without using innerHTML.
    const selector = ui.$("#symbolSearch");
    selector.textContent = "";
    window.MPData.markets.forEach((asset) => {
      const option = document.createElement("option");
      option.value = asset.symbol;
      option.textContent = `${asset.symbol} - ${asset.name}`;
      selector.append(option);
    });

    if (state.savedPlan) {
      const { style, market, trades, drawdown } = state.savedPlan;
      if (style && ui.$("#styleSelect")) ui.$("#styleSelect").value = style;
      if (market && ui.$("#marketSelect")) ui.$("#marketSelect").value = market;
      if (Number.isFinite(trades) && ui.$("#tradeCount")) ui.$("#tradeCount").value = String(trades);
      if (Number.isFinite(drawdown) && ui.$("#drawdownInput")) ui.$("#drawdownInput").value = String(drawdown);
    }

    updateControls();
    ui.$("#alertSetup").checked = state.alertPrefs.setup;
    ui.$("#alertRsi").checked = state.alertPrefs.rsi;
    ui.$("#alertEma").checked = state.alertPrefs.ema;
    ui.$("#alertVolatility").checked = state.alertPrefs.volatility;
    bindEvents();
    renderAll();
    window.MPAnalytics.retentionSeen();
    window.MPAnalytics.marketViewed(state.symbol);
    if (!state.onboardingSeen) showOnboarding();
  }

  init();
})();
