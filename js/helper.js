window.MPHelper = (() => {
  const topics = {
    otp: "If the code has not arrived, check spam, confirm the email address, then use Resend after the timer finishes. Codes expire quickly, so use the latest one.",
    wrongCode: "Enter only the newest 6-digit code. If you tried several times or the code expired, resend a fresh code and use that one.",
    session: "This local demo keeps a lightweight session on this browser after OTP verification. Production should use an HttpOnly, Secure, SameSite cookie from the backend.",
    security: "Never share your password or one-time code. This helper runs locally and redacts emails, codes, and password-like text before responding.",
    data: "If market data fails, the dashboard keeps the last known or fallback data visible and marks it clearly so you know it is not fresh."
  };

  function redact(text) {
    return String(text || "")
      .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
      .replace(/\b\d{6}\b/g, "[code]")
      .replace(/\b(password|pass|pwd)\s*[:=]\s*\S+/gi, "$1=[redacted]")
      .slice(0, 160);
  }

  function answer(rawQuery) {
    const query = redact(rawQuery).toLowerCase();
    if (!query.trim()) return "Ask about OTP delivery, wrong code, session refresh, security, or data fallback.";
    if (query.includes("spam") || query.includes("otp") || query.includes("code") || query.includes("email")) {
      if (query.includes("wrong") || query.includes("invalid") || query.includes("expired")) return topics.wrongCode;
      return topics.otp;
    }
    if (query.includes("refresh") || query.includes("session") || query.includes("login again") || query.includes("reload")) return topics.session;
    if (query.includes("safe") || query.includes("privacy") || query.includes("password") || query.includes("secure")) return topics.security;
    if (query.includes("data") || query.includes("fallback") || query.includes("real")) return topics.data;
    return "For this demo, I can help with OTP, login sessions, privacy, and stale market data. I will not ask for your password or code.";
  }

  return { topics, redact, answer };
})();
