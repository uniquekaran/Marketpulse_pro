# Authentication Middleware Plan

Production auth should run on the backend, not in frontend local storage.

## Responsibilities

- Verify signed session/JWT tokens.
- Attach `userId` and plan tier to the request context.
- Reject expired or malformed tokens.
- Require premium plan for premium routes.
- Log authentication failures without storing raw tokens.

## Pseudocode

```js
async function requireAuth(req, res, next) {
  const token = readBearerToken(req.headers.authorization);
  const session = await verifyToken(token, env.JWT_SECRET);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  req.user = { id: session.sub, plan: session.plan };
  next();
}
```
