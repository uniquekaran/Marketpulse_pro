const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadApp(files = []) {
  const context = {
    console,
    Date,
    Intl,
    Math,
    Number,
    Promise,
    URLSearchParams,
    fetch: async () => {
      throw new Error("fetch mock not configured");
    },
    setTimeout: (fn) => {
      fn();
      return 0;
    },
    clearTimeout: () => {},
    localStorage: {
      store: {},
      getItem(key) {
        return this.store[key] || null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      }
    }
  };
  context.window = context;
  vm.createContext(context);
  files.forEach((file) => {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  });
  return context;
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("indicator engine returns bounded setup and risk scores", () => {
  const ctx = loadApp(["js/data.js", "js/indicators.js"]);
  const asset = clone(ctx.MPData.markets[0]);
  const result = ctx.MPIndicators.calculate(asset);
  assert(result.setupScore >= 1 && result.setupScore <= 99, "setup score must be bounded");
  assert(result.riskScore >= 1 && result.riskScore <= 99, "risk score must be bounded");
  assert(Number.isFinite(result.rsi), "RSI must be finite");
});

test("strong uptrend data produces bullish EMA structure", () => {
  const ctx = loadApp(["js/data.js", "js/indicators.js"]);
  const asset = clone(ctx.MPData.markets[0]);
  asset.liveSeries = Array.from({ length: 80 }, (_, index) => 100 + index * 3);
  asset.liveVolumes = Array.from({ length: 80 }, (_, index) => 100000 + index * 1000);
  ctx.MPIndicators.invalidate(asset);
  const result = ctx.MPIndicators.calculate(asset);
  assert(result.maBullish === true, "EMA20 should be above EMA50 in a persistent uptrend");
  assert(result.trendScore > 50, "trend score should read positive");
});

test("flat short history handles edge cases without NaN", () => {
  const ctx = loadApp(["js/data.js", "js/indicators.js"]);
  const asset = clone(ctx.MPData.markets[0]);
  asset.liveSeries = [100, 100, 100];
  asset.liveVolumes = [1000, 1000, 1000];
  ctx.MPIndicators.invalidate(asset);
  const result = ctx.MPIndicators.calculate(asset);
  assert(Number.isFinite(result.setupScore), "setup score should be finite");
  assert(Number.isFinite(result.volScore), "volatility score should be finite");
});

test("API layer applies Yahoo mock response and clears stale flag", async () => {
  const ctx = loadApp(["js/data.js", "js/indicators.js", "js/api.js"]);
  ctx.fetch = async () => ({
    ok: true,
    json: async () => ({
      chart: {
        result: [{
          indicators: {
            quote: [{
              close: [100, 101, null, 103, 104],
              volume: [1000, 1200, 1300, 1400, 1500]
            }]
          }
        }]
      }
    })
  });
  const asset = clone(ctx.MPData.markets[0]);
  await ctx.MPApi.refreshAsset(asset);
  assert(asset.price === 104, "latest valid close should become price");
  assert(asset.stale === false, "fresh response should clear stale flag");
  assert(asset.source === "Yahoo free chart", "source should be recorded");
});

test("API layer marks stale after provider failure", () => {
  const ctx = loadApp(["js/data.js", "js/indicators.js", "js/api.js"]);
  const asset = clone(ctx.MPData.markets[0]);
  ctx.MPApi.markStale(asset, new Error("network down"));
  assert(asset.stale === true, "asset should be stale");
  assert(asset.lastError === "network down", "last error should be saved");
});

test("helper redacts sensitive auth input", () => {
  const ctx = loadApp(["js/helper.js"]);
  const redacted = ctx.MPHelper.redact("email me@example.com password=secret123 code 123456");
  assert(!redacted.includes("me@example.com"), "email should be redacted");
  assert(!redacted.includes("secret123"), "password-like value should be redacted");
  assert(!redacted.includes("123456"), "OTP-like value should be redacted");
});

test("storage persists backend session metadata", () => {
  const ctx = loadApp(["js/data.js", "js/state.js", "js/storage.js"]);
  ctx.MPState.state.user = { name: "Asha", email: "asha@example.com" };
  ctx.MPState.state.session = { active: true, issuedAt: 10, expiresAt: 20, mode: "backend-cookie" };
  ctx.MPStorage.save(ctx.MPState.state);
  const restored = {
    user: null,
    watchlist: [],
    symbol: "NIFTY50",
    riskMode: "balanced",
    educationalMode: false,
    demoMode: false,
    onboardingSeen: false,
    alertPrefs: {},
    savedPlan: null,
    session: { active: false, issuedAt: 0, expiresAt: 0, mode: "none" },
    otp: { maxAttempts: 5 }
  };
  ctx.MPStorage.load(restored);
  assert(restored.session.active === true, "session should be restored");
  assert(restored.session.mode === "backend-cookie", "session mode should be restored");
  assert(restored.otp.pendingUser === null, "OTP challenge should not persist");
});

(async () => {
  let failed = 0;
  for (const item of tests) {
    try {
      await item.fn();
      console.log(`ok - ${item.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${item.name}`);
      console.error(error.stack || error.message);
    }
  }
  if (failed) process.exit(1);
  console.log(`${tests.length} tests passed`);
})();
