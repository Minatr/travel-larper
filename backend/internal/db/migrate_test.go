package db_test

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/Minatr/travel-larper/backend/internal/db"
	"github.com/Minatr/travel-larper/backend/internal/dbtest"
	"github.com/Minatr/travel-larper/backend/migrations"
)

func TestMigrateUpDownUp(t *testing.T) {
	pool := dbtest.NewPool(t)
	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	migrate := func() {
		t.Helper()
		if err := db.Migrate(ctx, pool, logger); err != nil {
			t.Fatalf("migrate: %v", err)
		}
	}

	migrate()
	assertUsersTable(t, pool, true)

	provider, err := goose.NewProvider(goose.DialectPostgres, stdlib.OpenDBFromPool(pool), migrations.FS)
	if err != nil {
		t.Fatalf("create provider: %v", err)
	}
	if _, err := provider.DownTo(ctx, 0); err != nil {
		t.Fatalf("roll back every migration: %v", err)
	}
	assertUsersTable(t, pool, false)

	migrate()
	migrate()
	assertUsersTable(t, pool, true)
}

func assertUsersTable(t *testing.T, pool *pgxpool.Pool, want bool) {
	t.Helper()
	var exists bool
	if err := pool.QueryRow(context.Background(), "SELECT to_regclass('users') IS NOT NULL").Scan(&exists); err != nil {
		t.Fatalf("look for the users table: %v", err)
	}
	if exists != want {
		t.Fatalf("users table exists = %v, want %v", exists, want)
	}
}
