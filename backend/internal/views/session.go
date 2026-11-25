package views

import (
	"net/http"
	"time"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

// SessionCookieName matches the cookieAuth security scheme of openapi.yaml.
const SessionCookieName = "session"

// SetSessionCookie sends the session token. HttpOnly keeps it out of reach
// of scripts; SameSite=Lax stops other sites from sending it with their
// POST requests (CSRF). Secure is off in local dev, which runs over HTTP
// (a phone on the local network would drop a Secure cookie).
func SetSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time, secure bool) {
	http.SetCookie(w, &http.Cookie{ //nolint:gosec // Secure is set from the environment, see above.
		Name:     SessionCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(time.Until(expiresAt).Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// ClearSessionCookie tells the browser to delete the session cookie.
func ClearSessionCookie(w http.ResponseWriter, secure bool) {
	http.SetCookie(w, &http.Cookie{ //nolint:gosec // Secure is set from the environment, see SetSessionCookie.
		Name:     SessionCookieName,
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// NewCurrentUser builds the public view of the logged-in user.
func NewCurrentUser(user services.SessionUser) api.CurrentUser {
	return api.CurrentUser{
		Id:          user.ID,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Status:      api.CurrentUserStatus(user.Status),
	}
}
