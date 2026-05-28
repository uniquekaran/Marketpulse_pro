const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html",
  "styles.css",
  "app.js",
  "server.js",
  "config/runtime-config.js",
  "js/config.js",
  "js/logger.js",
  "js/analytics.js",
  "js/data.js",
  "js/state.js",
  "js/storage.js",
  "js/indicators.js",
  "js/api.js",
  "js/alerts.js",
  "js/validation.js",
  "js/demo.js",
  "js/helper.js",
  "js/ui.js"
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const file of required.filter((item) => item.endsWith(".js") && item !== "server.js")) {
  if (!index.includes(`src="${file}"`)) {
    console.error(`index.html does not load ${file}`);
    process.exit(1);
  }
}

const otpRequired = ["authOtp", "otpSection", "verifyOtpButton", "resendOtpButton", "autocomplete=\"one-time-code\"", "inputmode=\"numeric\""];
for (const token of otpRequired) {
  if (!index.includes(token)) {
    console.error(`OTP UI is missing ${token}`);
    process.exit(1);
  }
}

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
for (const token of ["startOtpChallenge", "verifyOtp", "resetOtpChallenge", "resendAvailableAt"]) {
  if (!app.includes(token)) {
    console.error(`OTP logic is missing ${token}`);
    process.exit(1);
  }
}

for (const token of ["aiHelpToggle", "aiHelpPanel", "aiHelpMessages", "MPHelper"]) {
  const source = token === "MPHelper" ? fs.readFileSync(path.join(root, "js/helper.js"), "utf8") : index;
  if (!source.includes(token)) {
    console.error(`AI helper is missing ${token}`);
    process.exit(1);
  }
}

if (index.includes("Demo code") || app.includes("Demo code")) {
  console.error("OTP code must not be displayed in the UI");
  process.exit(1);
}

const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
for (const token of ["/api/auth/send-otp", "/api/auth/verify-otp", "/api/auth/me", "/api/auth/logout", "hashOtp", "sendOtpEmail", "HttpOnly", "SameSite=Strict"]) {
  if (!server.includes(token)) {
    console.error(`Auth backend is missing ${token}`);
    process.exit(1);
  }
}

console.log("Build check passed");
