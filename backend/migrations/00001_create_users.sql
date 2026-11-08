-- +goose Up
CREATE TABLE users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'refused', 'suspended')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- On lower(email) so that Bob@x.com and bob@x.com are the same account.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- +goose Down
DROP TABLE users;
