-- name: CreateSession :exec
INSERT INTO sessions (user_id, token_hash, expires_at)
VALUES ($1, $2, $3);

-- name: GetSessionUser :one
SELECT sessions.id AS session_id, sessions.expires_at,
  users.id AS user_id, users.email, users.display_name, users.status
FROM sessions
JOIN users ON users.id = sessions.user_id
WHERE sessions.token_hash = $1 AND sessions.expires_at > now();

-- name: ExtendSession :exec
UPDATE sessions SET expires_at = $2
WHERE id = $1;

-- name: DeleteSession :exec
DELETE FROM sessions
WHERE token_hash = $1;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions
WHERE expires_at <= now();
