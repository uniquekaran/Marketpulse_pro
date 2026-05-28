# Deployment

## Vercel Static Demo

This project can be deployed as a static Vercel site because it does not require a build step yet.

1. Push the project to GitHub.
2. Import the repository in Vercel.
3. Use these settings:
   - Framework preset: Other
   - Build command: `npm run build`
   - Output directory: `.`
4. Add production runtime config by copying `config/runtime-config.example.js` to a generated `config/runtime-config.js` during a real deployment pipeline.

## Environment Handling

Do not put secrets in frontend JavaScript. Public frontend config can use:

- `APP_ENV`
- `API_URL`
- `TELEMETRY_ENDPOINT`
- `DEMO_MODE`
- `ANALYTICS_ENABLED`

Secrets such as market data keys, JWT secrets, database URLs, and payment secrets belong only on the backend. See `config/env.example`.

## CI

The GitHub Actions workflow in `.github/workflows/ci.yml` runs:

- `npm test`
- `npm run build`

The current build step is a static integrity check, not a bundler.
