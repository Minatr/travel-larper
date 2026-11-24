-- +goose Up
-- Only the SHA-256 of the session token is stored: a database leak does not
-- give access to open sessions.
CREATE TABLE sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  bytea       NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

-- Tech debt: no index on expires_at while the table stays small. Add one if
-- the cleanup of expired sessions (DeleteExpiredSessions) gets slow.

-- +goose Down
DROP TABLE sessions;
