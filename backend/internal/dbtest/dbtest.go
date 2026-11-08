// Package dbtest gives integration tests a connection to a real database.
package dbtest

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// databaseURLVariable names the database used by integration tests; they are
// skipped when it is not set.
const databaseURLVariable = "TEST_DATABASE_URL"

// NewPool returns a pool on a new, empty schema dropped at the end of the
// test. Each test package gets its own schema, so packages run in parallel
// without seeing each other's tables.
func NewPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv(databaseURLVariable)
	if databaseURL == "" {
		t.Skipf("%s is not set", databaseURLVariable)
	}
	ctx := context.Background()

	admin, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	schema := pgx.Identifier{"test_" + strings.ReplaceAll(uuid.NewString(), "-", "")}.Sanitize()
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		if _, err := admin.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE"); err != nil {
			t.Errorf("drop schema: %v", err)
		}
		if err := admin.Close(ctx); err != nil {
			t.Errorf("close: %v", err)
		}
	})

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		t.Fatalf("parse database URL: %v", err)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatalf("create pool: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}
