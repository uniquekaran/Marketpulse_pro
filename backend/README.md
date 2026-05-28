# Backend API Scaffold

This folder describes the next scalable backend layer for MarketPulse Pro.

## Recommended Services

- Auth service: email/password or OAuth
- Market data service: licensed provider or broker API
- Indicator service: RSI, MACD, EMA, volatility, volume trend
- Alert service: saved rules, scheduled evaluation, email/web push delivery
- Watchlist service: user watchlists and preferred timeframes
- Billing service: Razorpay first, Stripe later

## API Shape

- `POST /auth/signup`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /markets`
- `GET /markets/:symbol/analysis`
- `GET /markets/compare?sort=setup`
- `GET /users/me/watchlists`
- `POST /users/me/watchlists`
- `GET /users/me/alerts`
- `POST /users/me/alerts`
- `GET /validation/:symbol`

## Notes

The browser now expects backend authentication. A successful OTP verification creates a backend session cookie:

```http
Set-Cookie: mp_session=<opaque-random-id>; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Strict
```

The development server keeps OTP challenges and sessions in memory. Replace that with Redis or a database before production, rotate the session id after OTP verification, and validate it through `GET /api/auth/me` when the app boots. Frontend API calls that create or verify sessions send credentials so browser cookies are accepted.

The client helper in the demo is local guidance only. Do not send passwords, OTP values, or raw email addresses to any future AI provider; route future AI support through a backend sanitizer and audit log that redacts personal data.
