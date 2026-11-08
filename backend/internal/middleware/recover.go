package middleware

import (
	"errors"
	"log/slog"
	"net/http"
	"runtime/debug"

	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/views"
)

// Recoverer turns a panic into a logged error and a generic 500 response.
func Recoverer(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				recovered := recover()
				if recovered == nil {
					return
				}
				if err, ok := recovered.(error); ok && errors.Is(err, http.ErrAbortHandler) {
					panic(recovered)
				}
				logger.Error("panic",
					"panic", recovered,
					"request_id", chimiddleware.GetReqID(r.Context()),
					"stack", string(debug.Stack()),
				)
				views.WriteError(w, logger, api.ErrorCodeInternalError)
			}()
			next.ServeHTTP(w, r)
		})
	}
}
