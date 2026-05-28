CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE watchlists (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY,
  watchlist_id UUID NOT NULL REFERENCES watchlists(id),
  symbol TEXT NOT NULL,
  preferred_timeframe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alert_rules (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  symbol TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  threshold NUMERIC,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE alert_events (
  id UUID PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES alert_rules(id),
  message TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

CREATE TABLE market_snapshots (
  id UUID PRIMARY KEY,
  symbol TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
