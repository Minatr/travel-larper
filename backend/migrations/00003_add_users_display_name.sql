-- +goose Up
-- First name or nickname, chosen at registration. Existing accounts get the start of their email address.
ALTER TABLE users ADD COLUMN display_name text;
UPDATE users SET display_name = left(split_part(email, '@', 1), 30);
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

-- +goose Down
ALTER TABLE users DROP COLUMN display_name;
