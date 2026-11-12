package models_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Minatr/travel-larper/backend/internal/db"
	"github.com/Minatr/travel-larper/backend/internal/dbtest"
	"github.com/Minatr/travel-larper/backend/internal/models"
)

func newQueries(t *testing.T) *models.Queries {
	t.Helper()
	pool := dbtest.NewPool(t)
	if err := db.Migrate(context.Background(), pool, slog.New(slog.NewTextHandler(io.Discard, nil))); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return models.New(pool)
}

func TestCreateUser(t *testing.T) {
	queries := newQueries(t)

	user, err := queries.CreateUser(context.Background(), models.CreateUserParams{Email: "bob@example.com", PasswordHash: "hash"})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if user.Status != "pending" {
		t.Errorf("status = %q, want %q", user.Status, "pending")
	}
	if user.CreatedAt.IsZero() {
		t.Error("created_at is not set")
	}
}

func TestInsertUserReportsTakenEmail(t *testing.T) {
	queries := newQueries(t)
	ctx := context.Background()
	created, err := queries.InsertUser(ctx, "bob@example.com", "hash")
	if err != nil || !created {
		t.Fatalf("first insert = %v, %v, want true, nil", created, err)
	}

	created, err = queries.InsertUser(ctx, "Bob@Example.com", "hash")

	if err != nil || created {
		t.Fatalf("second insert = %v, %v, want false, nil", created, err)
	}
}

func TestGetUserByEmail(t *testing.T) {
	queries := newQueries(t)
	ctx := context.Background()
	created, err := queries.CreateUser(ctx, models.CreateUserParams{Email: "Bob@Example.com", PasswordHash: "hash"})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	tests := []struct {
		name    string
		email   string
		wantErr error
	}{
		{name: "same case", email: "Bob@Example.com"},
		{name: "other case", email: "bob@example.com"},
		{name: "unknown email", email: "alice@example.com", wantErr: pgx.ErrNoRows},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := queries.GetUserByEmail(ctx, tt.email)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && user.ID != created.ID {
				t.Fatalf("id = %v, want %v", user.ID, created.ID)
			}
		})
	}
}
