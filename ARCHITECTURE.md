# MarketPulse Pro Architecture

## Current Prototype

- `index.html`: product UI and dashboard views
- `styles.css`: responsive professional dashboard styling
- `app.js`: application startup, event binding, orchestration
- `js/data.js`: static market and sector metadata
- `js/state.js`: runtime state container
- `js/storage.js`: local prototype persistence
- `js/indicators.js`: explainable rule-based calculation engine
- `js/api.js`: free data API abstraction with retries and stale fallback
- `js/alerts.js`: alert rule evaluation
- `js/validation.js`: historical similar-setup validation
- `js/logger.js`: centralized frontend logging and error boundary hooks
- `js/analytics.js`: product analytics and telemetry hooks
- `js/demo.js`: stable public demo data and sample user state
- `js/config.js`: runtime config adapter
- `js/ui.js`: rendering and view updates
- `tests/run-tests.cjs`: zero-dependency unit/integration test harness

## Calculation Engine Boundary

The indicator logic is grouped in calculation functions inside `js/indicators.js`:

- RSI: `calculateRsi`
- MACD: `calculateMacd`
- EMA: `ema`
- Volatility: `calculateVolatility`
- Volume trend: `volumeSignal`
- Full setup model: `calculate`
- Historical validation: `js/validation.js`

When moving to a backend or React app, these functions should move into a shared `indicator-engine` module and be covered with unit tests.

## Frontend Security Boundary

The current local login is a UX prototype only. Real authentication, API keys, payment secrets, alert delivery, and market data contracts belong on the backend.

## Production Path

1. Move market data requests to backend endpoints.
2. Store users, watchlists, and alerts in a database.
3. Run alert evaluation on a schedule or stream.
4. Use licensed data for paid plans.
5. Keep all analysis explainable and avoid guaranteed prediction language.
