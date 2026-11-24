package controllers

import (
	"context"
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

// RegistrationController serves the account creation route.
type RegistrationController struct {
	registrar Registrar
	logger    *slog.Logger
}

// NewRegistrationController creates a RegistrationController.
func NewRegistrationController(registrar Registrar, logger *slog.Logger) *RegistrationController {
	return &RegistrationController{registrar: registrar, logger: logger}
}

// Register creates a pending account and answers 201 with no body.
func (c *RegistrationController) Register(w http.ResponseWriter, r *http.Request) {
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

func (c *RegistrationController) registrationErrorCode(err error) api.ErrorCode {
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
