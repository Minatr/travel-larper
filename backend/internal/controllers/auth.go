package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/services"
	"github.com/Minatr/travel-larper/backend/internal/views"
)

// Registrar creates user accounts.
type Registrar interface {
	Register(ctx context.Context, email, password string) error
}

// AuthController serves the authentication routes.
type AuthController struct {
	registrar Registrar
	logger    *slog.Logger
}

// NewAuthController creates an AuthController.
func NewAuthController(registrar Registrar, logger *slog.Logger) *AuthController {
	return &AuthController{registrar: registrar, logger: logger}
}

// Register creates a pending account and answers 201 with no body.
func (c *AuthController) Register(w http.ResponseWriter, r *http.Request) {
	var body api.RegisterRequest
	if code, ok := decodeJSONBody(r, &body); !ok {
		views.WriteError(w, c.logger, code)
		return
	}

	if err := c.registrar.Register(r.Context(), body.Email, body.Password); err != nil {
		views.WriteError(w, c.logger, c.registrationErrorCode(err))
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (c *AuthController) registrationErrorCode(err error) api.ErrorCode {
	switch {
	case errors.Is(err, services.ErrInvalidEmail):
		return api.ErrorCodeInvalidEmail
	case errors.Is(err, services.ErrPasswordTooShort):
		return api.ErrorCodePasswordTooShort
	case errors.Is(err, services.ErrPasswordTooLong):
		return api.ErrorCodePasswordTooLong
	case errors.Is(err, services.ErrEmailTaken):
		return api.ErrorCodeEmailTaken
	default:
		c.logger.Error("register user", "error", err)
		return api.ErrorCodeInternalError
	}
}

// decodeJSONBody reads the request body into target and returns the error
// code to answer with when it cannot.
func decodeJSONBody(r *http.Request, target any) (api.ErrorCode, bool) {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	err := decoder.Decode(target)
	if err == nil {
		return "", true
	}
	// Set by the MaxBodySize middleware when the body has no Content-Length.
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return api.ErrorCodeRequestTooLarge, false
	}
	return api.ErrorCodeInvalidBody, false
}
