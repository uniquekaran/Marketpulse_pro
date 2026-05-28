const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const otpChallenges = new Map();
const sessions = new Map();

loadEnv(path.join(root, ".env"));

const config = {
  port: Number(process.env.PORT || 3000),
  resendApiKey: process.env.RESEND_API_KEY || "",
  fromEmail: process.env.FROM_EMAIL || "onboarding@resend.dev",
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  otpTtlMs: 5 * 60 * 1000,
  resendCooldownMs: 30 * 1000,
  maxAttempts: 5,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  cookieName: "mp_session"
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

function json(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase().slice(0, 120);
}

function sanitizeName(name) {
  return String(name || "").trim().slice(0, 60);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashOtp(email, otp, nonce) {
  return crypto
    .createHmac("sha256", config.sessionSecret)
    .update(`${email}:${otp}:${nonce}`)
    .digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const index = part.indexOf("=");
      return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
    }));
}

function sessionCookie(value, maxAgeSeconds) {
  const parts = [
    `${config.cookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

function getSession(req) {
  const id = parseCookies(req)[config.cookieName];
  if (!id) return null;
  const session = sessions.get(id);
  if (!session || Date.now() > session.expiresAt) {
    sessions.delete(id);
    return null;
  }
  return { id, ...session };
}

function createSession(user) {
  const id = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  sessions.set(id, {
    user,
    issuedAt: now,
    expiresAt: now + config.sessionTtlMs
  });
  return id;
}

async function sendOtpEmail(email, otp) {
  if (!config.resendApiKey) throw new Error("RESEND_API_KEY is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.fromEmail,
      to: email,
      subject: "Your MarketPulse login code",
      text: `Your MarketPulse login code is ${otp}. It expires in 5 minutes.`,
      html: `<p>Your MarketPulse login code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`
    })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${message.slice(0, 160)}`);
  }
}

async function handleSendOtp(req, res) {
  try {
    const body = await readJson(req);
    const name = sanitizeName(body.name);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!name) return json(res, 400, { error: "Name is required" });
    if (!isValidEmail(email)) return json(res, 400, { error: "Valid email is required" });
    if (password.length < 8) return json(res, 400, { error: "Password must be at least 8 characters" });

    const existing = otpChallenges.get(email);
    if (existing && Date.now() < existing.resendAvailableAt) {
      const retryAfter = Math.ceil((existing.resendAvailableAt - Date.now()) / 1000);
      return json(res, 429, { error: "Please wait before requesting another code", retryAfter }, { "Retry-After": String(retryAfter) });
    }

    const otp = generateOtp();
    const nonce = crypto.randomBytes(16).toString("hex");
    otpChallenges.set(email, {
      user: { name, email },
      otpHash: hashOtp(email, otp, nonce),
      nonce,
      expiresAt: Date.now() + config.otpTtlMs,
      attempts: 0,
      resendAvailableAt: Date.now() + config.resendCooldownMs
    });

    await sendOtpEmail(email, otp);
    json(res, 200, { status: "sent", expiresIn: 300, resendCooldown: 30 });
  } catch (error) {
    console.error("send-otp failed", error.message);
    json(res, 500, { error: "Unable to send OTP right now" });
  }
}

async function handleVerifyOtp(req, res) {
  try {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const otp = String(body.otp || "").trim();
    const challenge = otpChallenges.get(email);

    if (!challenge) return json(res, 400, { error: "No active OTP challenge" });
    if (!/^\d{6}$/.test(otp)) return json(res, 400, { error: "OTP must be 6 digits" });
    if (Date.now() > challenge.expiresAt) {
      otpChallenges.delete(email);
      return json(res, 400, { error: "OTP expired" });
    }
    if (challenge.attempts >= config.maxAttempts) {
      otpChallenges.delete(email);
      return json(res, 429, { error: "Too many attempts" });
    }

    const expected = Buffer.from(challenge.otpHash, "hex");
    const actual = Buffer.from(hashOtp(email, otp, challenge.nonce), "hex");
    const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

    if (!matches) {
      challenge.attempts += 1;
      if (challenge.attempts >= config.maxAttempts) otpChallenges.delete(email);
      return json(res, 400, { error: "Invalid OTP", attemptsRemaining: Math.max(0, config.maxAttempts - challenge.attempts) });
    }

    otpChallenges.delete(email);
    const sessionId = createSession(challenge.user);
    json(res, 200, { verified: true, user: challenge.user }, {
      "Set-Cookie": sessionCookie(sessionId, Math.floor(config.sessionTtlMs / 1000))
    });
  } catch (error) {
    console.error("verify-otp failed", error.message);
    json(res, 500, { error: "Unable to verify OTP right now" });
  }
}

function handleMe(req, res) {
  const session = getSession(req);
  if (!session) return json(res, 401, { authenticated: false });
  json(res, 200, {
    authenticated: true,
    user: session.user,
    session: {
      active: true,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      mode: "backend-cookie"
    }
  });
}

function handleLogout(req, res) {
  const id = parseCookies(req)[config.cookieName];
  if (id) sessions.delete(id);
  json(res, 200, { status: "logged-out" }, {
    "Set-Cookie": sessionCookie("", 0)
  });
}

function serveStatic(req, res) {
  const requestPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = path.normalize(decodeURIComponent(requestPath))
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath === "" ? "index.html" : safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

  if (pathname === "/healthz" && req.method === "GET") return json(res, 200, { status: "ok" });
  if (pathname === "/api/auth/send-otp" && req.method === "POST") return handleSendOtp(req, res);
  if (pathname === "/api/auth/verify-otp" && req.method === "POST") return handleVerifyOtp(req, res);
  if (pathname === "/api/auth/me" && req.method === "GET") return handleMe(req, res);
  if (pathname === "/api/auth/logout" && req.method === "POST") return handleLogout(req, res);
  if (pathname.startsWith("/api/")) return json(res, 404, { error: "API route not found" });
  return serveStatic(req, res);
});

server.listen(config.port, () => {
  console.log(`MarketPulse Pro running on port ${config.port}`);
});
