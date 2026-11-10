package middleware

import (
	"log/slog"
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/views"
)

// RateLimit answers 429 once a client IP exceeds requestsPerMinute.
func RateLimit(requestsPerMinute int, logger *slog.Logger) func(http.Handler) http.Handler {
	return httprate.LimitBy(requestsPerMinute, time.Minute, clientIPKey,
		httprate.WithLimitHandler(func(w http.ResponseWriter, _ *http.Request) {
			views.WriteError(w, logger, api.ErrorCodeRateLimited)
		}),
	)
}

func clientIPKey(r *http.Request) (string, error) {
	return httprate.CanonicalizeIP(chimiddleware.GetClientIP(r.Context())), nil
}
