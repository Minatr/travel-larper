package db

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/Minatr/travel-larper/backend/migrations"
)

// Migrate applies the pending migrations.
func Migrate(ctx context.Context, pool *pgxpool.Pool, logger *slog.Logger) (err error) {
	// goose needs a database/sql handle; closing it leaves the pool open.
	sqlDB := stdlib.OpenDBFromPool(pool)
	defer func() {
		err = errors.Join(err, sqlDB.Close())
	}()

	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.FS)
	if err != nil {
		return fmt.Errorf("create migration provider: %w", err)
	}

	results, err := provider.Up(ctx)
	if err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}
	for _, result := range results {
		logger.Info("migration applied", "file", result.Source.Path, "duration", result.Duration)
	}

	version, err := provider.GetDBVersion(ctx)
	if err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}
	logger.Info("database schema up to date", "version", version)
	return nil
}
