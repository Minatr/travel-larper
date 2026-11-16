package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/views"
)

// RateLimit answers 429 once a client IP exceeds requestsPerMinute.
func RateLimit(requestsPerMinute int, logger *slog.Logger) func(http.Handler) http.Handler {
	return limitByIP(requestsPerMinute, time.Minute, logger)
}

// RouteRateLimit adds a per-IP limit to the route matching routePattern only.
func RouteRateLimit(routePattern string, requests int, window time.Duration, logger *slog.Logger) func(http.Handler) http.Handler {
	limit := limitByIP(requests, window, logger)
	return func(next http.Handler) http.Handler {
		limited := limit(next)
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if chi.RouteContext(r.Context()).RoutePattern() == routePattern {
				limited.ServeHTTP(w, r)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func limitByIP(requests int, window time.Duration, logger *slog.Logger) func(http.Handler) http.Handler {
	return httprate.LimitBy(requests, window, clientIPKey,
		httprate.WithLimitHandler(func(w http.ResponseWriter, _ *http.Request) {
			views.WriteError(w, logger, api.ErrorCodeRateLimited)
		}),
	)
}

func clientIPKey(r *http.Request) (string, error) {
	return httprate.CanonicalizeIP(chimiddleware.GetClientIP(r.Context())), nil
}
