package models_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Minatr/travel-larper/backend/internal/db"
	"github.com/Minatr/travel-larper/backend/internal/dbtest"
	"github.com/Minatr/travel-larper/backend/internal/models"
)

func newQueries(t *testing.T) *models.Queries {
	t.Helper()
	return models.New(newMigratedPool(t))
}

func newMigratedPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := dbtest.NewPool(t)
	if err := db.Migrate(context.Background(), pool, slog.New(slog.NewTextHandler(io.Discard, nil))); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return pool
}

func TestCreateUser(t *testing.T) {
	queries := newQueries(t)

	user, err := queries.CreateUser(
		context.Background(),
		models.CreateUserParams{Email: "bob@example.com", PasswordHash: "hash", DisplayName: "Bob"},
	)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if user.Status != "pending" {
		t.Errorf("status = %q, want %q", user.Status, "pending")
	}
	if user.DisplayName != "Bob" {
		t.Errorf("display name = %q, want %q", user.DisplayName, "Bob")
	}
	if user.CreatedAt.IsZero() {
		t.Error("created_at is not set")
	}
}

// Signing up again with an address already taken must leave its account alone: otherwise anyone could take over an
// account by signing up with its address and a password of their own.
func TestInsertUserReportsTakenEmail(t *testing.T) {
	queries := newQueries(t)
	ctx := context.Background()
	created, err := queries.InsertUser(
		ctx,
		models.CreateUserParams{Email: "bob@example.com", PasswordHash: "hash", DisplayName: "Bob"},
	)
	if err != nil || !created {
		t.Fatalf("first insert = %v, %v, want true, nil", created, err)
	}

	created, err = queries.InsertUser(
		ctx,
		models.CreateUserParams{Email: "Bob@Example.com", PasswordHash: "other-hash", DisplayName: "Other"},
	)

	if err != nil || created {
		t.Fatalf("second insert = %v, %v, want false, nil", created, err)
	}
	user, err := queries.GetUserByEmail(ctx, "bob@example.com")
	if err != nil {
		t.Fatalf("get user: %v", err)
	}
	if user.Email != "bob@example.com" {
		t.Errorf("email = %q, want %q", user.Email, "bob@example.com")
	}
	if user.PasswordHash != "hash" {
		t.Errorf("password hash = %q, want %q", user.PasswordHash, "hash")
	}
	if user.DisplayName != "Bob" {
		t.Errorf("display name = %q, want %q", user.DisplayName, "Bob")
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

func TestFindUserByEmail(t *testing.T) {
	queries := newQueries(t)
	ctx := context.Background()
	if _, err := queries.CreateUser(
		ctx,
		models.CreateUserParams{Email: "Bob@Example.com", PasswordHash: "hash"},
	); err != nil {
		t.Fatalf("create user: %v", err)
	}

	tests := []struct {
		name      string
		email     string
		wantFound bool
	}{
		{name: "other case", email: "bob@example.com", wantFound: true},
		{name: "unknown email", email: "alice@example.com", wantFound: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, found, err := queries.FindUserByEmail(ctx, tt.email)

			if err != nil || found != tt.wantFound {
				t.Fatalf("FindUserByEmail() = %v, %v, want %v, nil", found, err, tt.wantFound)
			}
		})
	}
}
