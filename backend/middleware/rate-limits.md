# Rate Limiting Strategy

Rate limits protect market data costs, auth endpoints, and alert infrastructure.

## Suggested Limits

- Auth login/signup: 5 requests per minute per IP.
- Market analysis: 60 requests per minute per user.
- Alert creation: 20 writes per hour per user.
- Free plan scanner: 30 requests per hour.
- Premium plan scanner: higher limit based on data-provider contract.

## Storage

Use Redis or managed rate-limit storage. Do not rely on in-memory counters in multi-instance production.
