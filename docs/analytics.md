# Product Analytics Preparation

The static demo records lightweight local analytics in `localStorage` through `js/analytics.js`.

## Current Events

- `market_viewed`: most viewed markets
- `watchlist_changed`: add/remove behavior
- `alert_rule_saved`: alert usage
- `session_seen`: retention heartbeat by date
- `api_failure`: provider failure telemetry hook
- `demo_mode_enabled`: demo usage

## Production Path

Set `TELEMETRY_ENDPOINT` in runtime config to forward events to a backend. In production:

- Avoid collecting raw trading capital or personally sensitive financial details.
- Hash user IDs before analytics processing.
- Batch events and retry with backoff.
- Give users a privacy policy and opt-out path where required.
