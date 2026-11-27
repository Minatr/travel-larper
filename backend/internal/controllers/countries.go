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

// CountryInfoFinder gives the fact sheet of a country.
type CountryInfoFinder interface {
	Find(ctx context.Context, code, language string) (services.CountryInfo, error)
}

// CountryController serves the country fact sheet route.
type CountryController struct {
	countries CountryInfoFinder
	logger    *slog.Logger
}

// NewCountryController creates a CountryController.
func NewCountryController(countries CountryInfoFinder, logger *slog.Logger) *CountryController {
	return &CountryController{countries: countries, logger: logger}
}

// GetCountryInfo answers the fact sheet of a country: 404 for a code outside the globe's countries.
func (c *CountryController) GetCountryInfo(
	w http.ResponseWriter,
	r *http.Request,
	code string,
	params api.GetCountryInfoParams,
) {
	info, err := c.countries.Find(r.Context(), code, string(params.Lang))
	switch {
	case errors.Is(err, services.ErrCountryNotFound):
		views.WriteError(w, c.logger, api.ErrorCodeNotFound)
	case errors.Is(err, services.ErrUnsupportedLanguage):
		views.WriteError(w, c.logger, api.ErrorCodeInvalidParameter)
	case err != nil:
		c.logger.Error("find country info", "code", code, "error", err)
		views.WriteError(w, c.logger, api.ErrorCodeInternalError)
	default:
		views.WriteJSON(w, c.logger, http.StatusOK, views.NewCountryInfo(info))
	}
}
