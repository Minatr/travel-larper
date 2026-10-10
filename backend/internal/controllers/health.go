// Package controllers handles HTTP requests: it reads the request, calls a
// service and renders a view.
package controllers

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/Minatr/travel-larper/backend/internal/views"
)

// HealthChecker reports whether the API dependencies are reachable.
type HealthChecker interface {
	Check(ctx context.Context) error
}

// HealthController serves the health route.
type HealthController struct {
	checker HealthChecker
	logger  *slog.Logger
}

// NewHealthController creates a HealthController.
func NewHealthController(checker HealthChecker, logger *slog.Logger) *HealthController {
	return &HealthController{checker: checker, logger: logger}
}

// Show answers 200 when everything is up, 503 when the database is down.
func (c *HealthController) Show(w http.ResponseWriter, r *http.Request) {
	if err := c.checker.Check(r.Context()); err != nil {
		c.logger.Warn("health check failed", "error", err)
		views.WriteJSON(w, c.logger, http.StatusServiceUnavailable, views.NewHealthResponse(false))
		return
	}
	views.WriteJSON(w, c.logger, http.StatusOK, views.NewHealthResponse(true))
}
