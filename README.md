# MarketPulse Pro

Premium interactive prototype for a market-growth and trading-style advisor.

Run the local server and open `http://localhost:3000` to use the app with real OTP authentication:

```bash
npm start
```

The server reads `.env`, sends OTP email through Resend, and sets an HttpOnly session cookie after successful verification. Opening `index.html` directly is no longer enough for login because fake/demo OTP acceptance has been removed.

## Included

- Market dashboard with simulated scanner data
- Indian index coverage: NIFTY 50, BANKNIFTY, FINNIFTY, MIDCPNIFTY, and SENSEX
- Free public data mode using Yahoo-style chart data for indices/stocks and CoinGecko for crypto
- Indicator-driven dashboard with RSI, MACD, EMA crossover, volume trend, volatility, sentiment, risk meter, and setup score
- TradingView embedded chart for interactive charting
- Explainable "Why this signal?" section and plain-English AI-style summary
- Trade horizon probability bars and sector breadth model
- Backend OTP login with Resend email delivery and refresh-safe session cookies
- Smart alert rules for setup score changes, RSI extremes, EMA crossover changes, and volatility spikes
- Historical validation panel with careful descriptive statistics
- Multi-market comparison table for crypto, stocks, indices, and commodities
- Premium feature locks for advanced analytics, saved alerts, multi-watchlists, and advanced scanner
- Refactored browser-safe modules for data, state, storage, indicators, API, alerts, validation, UI, and app orchestration
- Retry and stale-data handling for free data providers
- Indicator tooltips, score formula disclosure, and beginner education mode
- Public demo mode with stable sample data and example watchlist
- Inline OTP flow for login/signup UX validation
- Onboarding walkthrough, empty states, loading skeletons, and mobile bottom navigation
- Local analytics hooks for market views, alerts, watchlists, retention, and API failures
- Zero-dependency test harness for indicators, scoring, API mocks, and edge cases
- Vercel config and GitHub Actions CI workflow
- Intraday, swing, mid-term, and long-term fit scoring
- Canvas price charts
- Risk and position sizing calculator
- Market growth radar
- Strategy playbook builder
- Watchlist and alerts area
- Premium pricing/payment screen placeholder

## Important

This prototype uses free public data where the browser can access it, then falls back to simulated analysis data if a provider blocks the request or returns no prices. Before launching publicly, connect a licensed market-data API, move in-memory OTP/session storage to Redis or a database, integrate Razorpay or Stripe securely, and review financial-advice rules for your target country.

See `ARCHITECTURE.md`, `backend/README.md`, `backend/otp.md`, `backend/schema/schema.sql`, `backend/middleware`, `config/env.example`, `docs/deployment.md`, `docs/analytics.md`, and `docs/production-readiness.md` for the backend, demo, deployment, analytics, and production path.

Android APK wrapper project lives in `android/MarketPulseProAndroid`. It is configured for a public HTTPS dashboard URL; see `docs/deploy-public-https.md` before building for real phones.

## Testing

Run `npm test` and `npm run build` in an environment with Node.js available.
