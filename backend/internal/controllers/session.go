package controllers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/middleware"
	"github.com/Minatr/travel-larper/backend/internal/services"
	"github.com/Minatr/travel-larper/backend/internal/views"
)

// SessionManager opens and closes sessions.
type SessionManager interface {
	Login(ctx context.Context, email, password string) (services.Session, error)
	Logout(ctx context.Context, token string) error
}

// SessionController serves login, logout and the current user.
type SessionController struct {
	sessions      SessionManager
	secureCookies bool
	logger        *slog.Logger
}

// NewSessionController creates a SessionController.
func NewSessionController(sessions SessionManager, secureCookies bool, logger *slog.Logger) *SessionController {
	return &SessionController{sessions: sessions, secureCookies: secureCookies, logger: logger}
}

// Login opens a session, sets its cookie and answers with the user.
func (c *SessionController) Login(w http.ResponseWriter, r *http.Request) {
	var body api.LoginRequest
	if code, ok := decodeJSONBody(r, &body); !ok {
		views.WriteError(w, c.logger, code)
		return
	}

	session, err := c.sessions.Login(r.Context(), body.Email, body.Password)
	if errors.Is(err, services.ErrInvalidCredentials) {
		views.WriteError(w, c.logger, api.ErrorCodeInvalidCredentials)
		return
	}
	if err != nil {
		c.logger.Error("login", "error", err)
		views.WriteError(w, c.logger, api.ErrorCodeInternalError)
		return
	}
	views.SetSessionCookie(w, session.Token, session.ExpiresAt, c.secureCookies)
	views.WriteJSON(w, c.logger, http.StatusOK, views.NewCurrentUser(session.User.ID, session.User.Email, session.User.Status))
}

// Logout closes the current session, if any, and clears its cookie.
func (c *SessionController) Logout(w http.ResponseWriter, r *http.Request) {
	if err := c.sessions.Logout(r.Context(), middleware.SessionToken(r)); err != nil {
		c.logger.Error("logout", "error", err)
		views.WriteError(w, c.logger, api.ErrorCodeInternalError)
		return
	}
	views.ClearSessionCookie(w, c.secureCookies)
	w.WriteHeader(http.StatusNoContent)
}

// GetMe answers with the user that the RequireSession middleware loaded.
func (c *SessionController) GetMe(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.SessionUser(r.Context())
	if !ok {
		c.logger.Error("get me: route not protected by RequireSession")
		views.WriteError(w, c.logger, api.ErrorCodeInternalError)
		return
	}
	views.WriteJSON(w, c.logger, http.StatusOK, views.NewCurrentUser(user.ID, user.Email, user.Status))
}
