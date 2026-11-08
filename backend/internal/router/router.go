// Package router declares the HTTP routes: which URL and method is served
// by which controller method.
package router

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/controllers"
	"github.com/Minatr/travel-larper/backend/internal/views"
)

// basePath prefixes every API route so the reverse proxy (Vite in dev) can
// forward them with a single rule. It matches `servers` in openapi.yaml.
const basePath = "/api"

// server bundles the controllers into a single api.ServerInterface.
type server struct {
	*controllers.HealthController
}

var _ api.ServerInterface = server{}

// Routes builds the HTTP handler that maps every route of openapi.yaml to
// its controller method.
func Routes(health *controllers.HealthController, logger *slog.Logger) http.Handler {
	router := chi.NewRouter()
	router.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		views.WriteError(w, logger, api.ErrorCodeNotFound)
	})
	router.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		views.WriteError(w, logger, api.ErrorCodeMethodNotAllowed)
	})
	return api.HandlerWithOptions(server{HealthController: health}, api.ChiServerOptions{
		BaseURL:          basePath,
		BaseRouter:       router,
		ErrorHandlerFunc: invalidParameterHandler(logger),
	})
}

// invalidParameterHandler answers the parameter errors raised by the
// generated code, keeping their detail in the logs only.
func invalidParameterHandler(logger *slog.Logger) func(http.ResponseWriter, *http.Request, error) {
	return func(w http.ResponseWriter, r *http.Request, err error) {
		logger.Info("invalid request parameter", "path", r.URL.Path, "error", err)
		views.WriteError(w, logger, api.ErrorCodeInvalidParameter)
	}
}
