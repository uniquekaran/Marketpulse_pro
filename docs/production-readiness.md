# Production Readiness Notes

## Frontend Boundaries

- Frontend code may show analysis, but must not hold market-data secrets, payment secrets, or durable auth logic.
- Local accounts in this prototype are only UX scaffolding.
- Input validation exists in the browser for usability; backend validation is still required.

## Data Reliability

- Free providers can fail, delay, throttle, or block browser requests.
- Production should use backend API retries, provider failover, response caching, and stale-data labels.
- Store raw provider snapshots for auditability.
- The frontend now labels stale fallback data and records API failure telemetry hooks.

## Graceful Degradation

- If a live provider fails, keep the last known or demo fallback data visible.
- Mark the data source as stale instead of hiding the dashboard.
- Keep educational explanations visible so users understand what remains reliable.
- Do not trigger real trading alerts from stale frontend-only data.

## Monitoring

- `js/logger.js` captures global frontend errors and promise rejections.
- `js/analytics.js` prepares local telemetry for market views, alerts, watchlists, retention, and API failures.
- Production telemetry should be routed through a backend with rate limits and privacy controls.

## Alert Architecture

- Save alert rules in the database.
- Evaluate alerts on scheduled jobs or a market-data stream.
- Queue notification delivery through a worker.
- Rate-limit alert writes and delivery attempts.

## Future ML Layer

- Keep rule-based indicator scoring as the explainable baseline.
- Future ML models should implement a separate scoring interface:

```ts
type ScoringInput = {
  symbol: string;
  prices: number[];
  volumes: number[];
  indicators: Record<string, number | boolean | string>;
};

type ScoringOutput = {
  score: number;
  explanations: string[];
  modelVersion: string;
};
```

ML scores should be shown as model outputs, not guaranteed predictions.
