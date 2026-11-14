-- Local development account: dev@gmail.com / 12345678, already active.
-- Loaded by `make db-seed`, never by the migrations, so production stays empty.
INSERT INTO users (email, password_hash, status)
VALUES (
  'dev@gmail.com',
  '$argon2id$v=19$m=19456,t=2,p=1$bnwqT8+hMMei5SktY0o0Lw$lAQBIXcGdkbFjqoQj2ZwBye9ocNRYuUJO5XNXmVR7YM',
  'active'
)
ON CONFLICT ((lower(email))) DO NOTHING;
