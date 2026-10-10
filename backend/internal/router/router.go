// Package router declares the HTTP routes: which URL and method is served
// by which controller method.
package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Minatr/travel-larper/backend/internal/controllers"
)

// Routes builds the HTTP handler that maps every API route to its
// controller. All routes live under /api so the reverse proxy (Vite in dev)
// can forward them with a single rule.
func Routes(health *controllers.HealthController) http.Handler {
	router := chi.NewRouter()
	router.Route("/api", func(api chi.Router) {
		api.Get("/health", health.Show)
	})
	return router
}
