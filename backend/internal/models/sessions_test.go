package models_test

import (
	"context"
	"testing"
	"time"

	"github.com/Minatr/travel-larper/backend/internal/models"
)

func createSession(t *testing.T, queries *models.Queries, tokenHash string, expiresAt time.Time) models.User {
	t.Helper()
	ctx := context.Background()
	user, err := queries.CreateUser(
		ctx,
		models.CreateUserParams{Email: tokenHash + "@example.com", PasswordHash: "hash", DisplayName: "Bob"},
	)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if err := queries.CreateSession(
		ctx,
		models.CreateSessionParams{UserID: user.ID, TokenHash: []byte(tokenHash), ExpiresAt: expiresAt},
	); err != nil {
		t.Fatalf("create session: %v", err)
	}
	return user
}

func TestFindSessionUser(t *testing.T) {
	queries := newQueries(t)
	ctx := context.Background()
	user := createSession(t, queries, "live", time.Now().Add(time.Hour))
	createSession(t, queries, "expired", time.Now().Add(-time.Minute))

	tests := []struct {
		name      string
		tokenHash string
		wantFound bool
	}{
		{name: "unexpired session", tokenHash: "live", wantFound: true},
		{name: "expired session", tokenHash: "expired", wantFound: false},
		{name: "unknown session", tokenHash: "unknown", wantFound: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			row, found, err := queries.FindSessionUser(ctx, []byte(tt.tokenHash))

			if err != nil || found != tt.wantFound {
				t.Fatalf("FindSessionUser() = %v, %v, want %v, nil", found, err, tt.wantFound)
			}
			if tt.wantFound && (row.UserID != user.ID || row.Email != user.Email || row.DisplayName != "Bob" ||
				row.Status != "pending") {
				t.Fatalf("row = %+v, want the session user", row)
			}
		})
	}
}

func TestExtendSession(t *testing.T) {
	queries := newQueries(t)
	ctx := context.Background()
	createSession(t, queries, "token", time.Now().Add(time.Minute))
	row, _, err := queries.FindSessionUser(ctx, []byte("token"))
	if err != nil {
		t.Fatalf("find session: %v", err)
	}
	later := time.Now().Add(48 * time.Hour).UTC().Truncate(time.Second)

	if err := queries.ExtendSession(ctx, models.ExtendSessionParams{ID: row.SessionID, ExpiresAt: later}); err != nil {
		t.Fatalf("extend session: %v", err)
	}

	row, _, err = queries.FindSessionUser(ctx, []byte("token"))
	if err != nil || !row.ExpiresAt.Equal(later) {
		t.Fatalf("expiry = %v, %v, want %v", row.ExpiresAt, err, later)
	}
}

func TestDeleteSessions(t *testing.T) {
	pool := newMigratedPool(t)
	queries := models.New(pool)
	ctx := context.Background()
	createSession(t, queries, "kept", time.Now().Add(time.Hour))
	createSession(t, queries, "logged-out", time.Now().Add(time.Hour))
	createSession(t, queries, "expired", time.Now().Add(-time.Minute))

	if err := queries.DeleteSession(ctx, []byte("logged-out")); err != nil {
		t.Fatalf("delete session: %v", err)
	}
	if err := queries.DeleteExpiredSessions(ctx); err != nil {
		t.Fatalf("delete expired sessions: %v", err)
	}

	var remaining int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM sessions").Scan(&remaining); err != nil {
		t.Fatalf("count sessions: %v", err)
	}
	if remaining != 1 {
		t.Fatalf("remaining sessions = %d, want 1 (the kept one)", remaining)
	}
	if _, found, err := queries.FindSessionUser(ctx, []byte("kept")); err != nil || !found {
		t.Fatalf("kept session found = %v, %v, want true", found, err)
	}
}
