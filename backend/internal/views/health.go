package views

import "github.com/Minatr/travel-larper/backend/internal/api"

// NewHealthResponse builds the body of GET /api/health from the database state.
func NewHealthResponse(databaseUp bool) api.Health {
	if databaseUp {
		return api.Health{Status: api.HealthStatusOk, Database: api.HealthDatabaseUp}
	}
	return api.Health{Status: api.HealthStatusDegraded, Database: api.HealthDatabaseDown}
}
