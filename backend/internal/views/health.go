package views

const (
	healthStatusOK       = "ok"
	healthStatusDegraded = "degraded"
	databaseStateUp      = "up"
	databaseStateDown    = "down"
)

// HealthResponse is the body of GET /api/health (schema Health in openapi.yaml).
type HealthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
}

// NewHealthResponse builds the health body from the database state.
func NewHealthResponse(databaseUp bool) HealthResponse {
	if databaseUp {
		return HealthResponse{Status: healthStatusOK, Database: databaseStateUp}
	}
	return HealthResponse{Status: healthStatusDegraded, Database: databaseStateDown}
}
