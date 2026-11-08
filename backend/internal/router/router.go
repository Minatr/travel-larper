// Package router declares the HTTP routes: which URL and method is served
// by which controller method.
package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/controllers"
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
func Routes(health *controllers.HealthController) http.Handler {
	return api.HandlerWithOptions(server{HealthController: health}, api.ChiServerOptions{
		BaseURL:    basePath,
		BaseRouter: chi.NewRouter(),
	})
}
