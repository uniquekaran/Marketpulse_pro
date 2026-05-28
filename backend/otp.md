# OTP Authentication Plan

The browser demo uses an inline OTP step to show the user flow only. It does not display generated OTP values. Production OTP must be backend-driven.

## Recommended Endpoints

- `POST /api/auth/send-otp`
  - Validate email/password.
  - Generate a 6-digit OTP with a cryptographically secure random source.
  - Hash the OTP before storage.
  - Store user id, OTP hash, expiry, attempt count, and one-time nonce.
  - Send the OTP through email/SMS provider.
  - Return only a generic success response, never the OTP.

- `POST /api/auth/verify-otp`
  - Accept email/session nonce and OTP.
  - Check expiry and attempt limit.
  - Compare against stored hash.
  - Mark OTP as used on success.
  - Create authenticated session cookie with `HttpOnly`, `Secure`, `SameSite`, `Path=/`, and a bounded lifetime.

## Security Requirements

- Serve only over HTTPS.
- Store sessions in `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict` cookies.
- Expire OTP after 5-10 minutes.
- Limit attempts, for example 5 per challenge.
- Rate-limit OTP generation and verification.
- Never log OTP values.
- Never include OTP values in frontend responses, telemetry, toast messages, or UI hints.
- Do not send OTP values, passwords, or full email addresses to helper/AI systems.
- Prefer TOTP or WebAuthn for stronger production MFA.

## UI Choice

This app uses inline OTP because it is simpler, mobile-friendly, and avoids modal focus-trap complexity. A modal can be added later if the auth experience becomes separate from the dashboard. OTP verification now requires the backend API; there is no client-side demo OTP acceptance.
