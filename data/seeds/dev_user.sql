-- Local development accounts, both with the password 12345678: dev@gmail.com, already active, and pending@gmail.com,
-- waiting for an admin's approval.
-- Loaded by `make db-seed`, never by the migrations, so production stays empty.
INSERT INTO users (email, display_name, password_hash, status)
VALUES
  (
    'dev@gmail.com',
    'Dev',
    '$argon2id$v=19$m=19456,t=2,p=1$bnwqT8+hMMei5SktY0o0Lw$lAQBIXcGdkbFjqoQj2ZwBye9ocNRYuUJO5XNXmVR7YM',
    'active'
  ),
  (
    'pending@gmail.com',
    'Pending',
    '$argon2id$v=19$m=19456,t=2,p=1$bnwqT8+hMMei5SktY0o0Lw$lAQBIXcGdkbFjqoQj2ZwBye9ocNRYuUJO5XNXmVR7YM',
    'pending'
  )
ON CONFLICT ((lower(email))) DO NOTHING;
