package middleware

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/services"
	"github.com/Minatr/travel-larper/backend/internal/views"
)

type sessionUserKey struct{}

// Authenticator returns the session of a token.
type Authenticator interface {
	Authenticate(ctx context.Context, token string) (services.Session, error)
}

// RequireSession answers 401 on every route except publicRoutes when the
// request has no valid session. Protected by default: a route forgotten in
// publicRoutes is closed rather than open.
func RequireSession(
	publicRoutes []string,
	authenticator Authenticator,
	secureCookies bool,
	logger *slog.Logger,
) func(http.Handler) http.Handler {
	public := make(map[string]bool, len(publicRoutes))
	for _, route := range publicRoutes {
		public[route] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if public[chi.RouteContext(r.Context()).RoutePattern()] {
				next.ServeHTTP(w, r)
				return
			}
			session, err := authenticator.Authenticate(r.Context(), SessionToken(r))
			if errors.Is(err, services.ErrInvalidSession) {
				views.ClearSessionCookie(w, secureCookies)
				views.WriteError(w, logger, api.ErrorCodeUnauthorized)
				return
			}
			if err != nil {
				logger.Error("authenticate request", "error", err)
				views.WriteError(w, logger, api.ErrorCodeInternalError)
				return
			}
			if session.Renewed {
				views.SetSessionCookie(w, session.Token, session.ExpiresAt, secureCookies)
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), sessionUserKey{}, session.User)))
		})
	}
}

// SessionUser returns the user that RequireSession authenticated.
func SessionUser(ctx context.Context) (services.SessionUser, bool) {
	user, ok := ctx.Value(sessionUserKey{}).(services.SessionUser)
	return user, ok
}

// SessionToken returns the token of the session cookie, empty when there is none.
func SessionToken(r *http.Request) string {
	cookie, err := r.Cookie(views.SessionCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}
