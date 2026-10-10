// Package services holds the business logic. It knows nothing about HTTP.
package services

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// databasePingTimeout bounds the health check so a hung database cannot
// block the caller.
const databasePingTimeout = 2 * time.Second

// ErrDatabaseUnavailable is returned when the database cannot be reached.
var ErrDatabaseUnavailable = errors.New("database unavailable")

// DatabasePinger checks that the database is reachable.
type DatabasePinger interface {
	Ping(ctx context.Context) error
}

// HealthService reports whether the dependencies of the API are reachable.
type HealthService struct {
	database DatabasePinger
}

// NewHealthService creates a HealthService that checks the given database.
func NewHealthService(database DatabasePinger) *HealthService {
	return &HealthService{database: database}
}

// Check returns ErrDatabaseUnavailable (wrapping the cause) if the database
// does not answer in time.
func (s *HealthService) Check(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, databasePingTimeout)
	defer cancel()

	if err := s.database.Ping(ctx); err != nil {
		return fmt.Errorf("%w: %w", ErrDatabaseUnavailable, err)
	}
	return nil
}
