window.MPConfig = (() => {
  const runtime = window.MP_RUNTIME_CONFIG || {};
  const params = new URLSearchParams(window.location.search);

  return {
    appEnv: runtime.APP_ENV || "demo",
    apiUrl: runtime.API_URL || "",
    telemetryEndpoint: runtime.TELEMETRY_ENDPOINT || "",
    demoMode: params.get("demo") === "1" || runtime.DEMO_MODE === true,
    analyticsEnabled: runtime.ANALYTICS_ENABLED !== false
  };
})();
