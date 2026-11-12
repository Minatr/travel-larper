-- name: CreateUser :one
INSERT INTO users (email, password_hash)
VALUES ($1, $2)
ON CONFLICT ((lower(email))) DO NOTHING
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE lower(email) = lower(sqlc.arg(email));
