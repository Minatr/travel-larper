package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

type fakeCountryFinder struct {
	info        services.CountryInfo
	err         error
	gotCode     string
	gotLanguage string
}

func (f *fakeCountryFinder) Find(_ context.Context, code, language string) (services.CountryInfo, error) {
	f.gotCode, f.gotLanguage = code, language
	return f.info, f.err
}

func TestCountryControllerGetCountryInfo(t *testing.T) {
	france := services.CountryInfo{
		Code:       "FR",
		Currencies: []string{"EUR"},
		Languages:  []services.CountryLanguage{{Code: "fr", Name: "French"}},
		Summary:    services.CountrySummary{Status: services.SummaryAvailable, Text: "La France…", URL: "https://x"},
	}
	tests := []struct {
		name       string
		finder     fakeCountryFinder
		wantStatus int
		wantCode   api.ErrorCode
	}{
		{name: "found", finder: fakeCountryFinder{info: france}, wantStatus: http.StatusOK},
		{
			name:       "unknown country",
			finder:     fakeCountryFinder{err: services.ErrCountryNotFound},
			wantStatus: http.StatusNotFound,
			wantCode:   api.ErrorCodeNotFound,
		},
		{
			name:       "unsupported language",
			finder:     fakeCountryFinder{err: services.ErrUnsupportedLanguage},
			wantStatus: http.StatusBadRequest,
			wantCode:   api.ErrorCodeInvalidParameter,
		},
		{
			name:       "unexpected error",
			finder:     fakeCountryFinder{err: errors.New("connection reset")},
			wantStatus: http.StatusInternalServerError,
			wantCode:   api.ErrorCodeInternalError,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			finder := tt.finder
			controller := NewCountryController(&finder, slog.New(slog.NewTextHandler(io.Discard, nil)))
			recorder := httptest.NewRecorder()

			controller.GetCountryInfo(
				recorder,
				httptest.NewRequest(http.MethodGet, "/api/countries/FR?lang=fr", nil),
				"FR",
				api.GetCountryInfoParams{Lang: api.GetCountryInfoParamsLangFr},
			)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if finder.gotCode != "FR" || finder.gotLanguage != "fr" {
				t.Fatalf("service asked for %q in %q, want FR in fr", finder.gotCode, finder.gotLanguage)
			}
			if tt.wantCode != "" {
				var body api.Error
				if err := json.NewDecoder(recorder.Body).Decode(&body); err != nil {
					t.Fatalf("decode body: %v", err)
				}
				if body.Code != tt.wantCode || strings.Contains(body.Message, "connection reset") {
					t.Fatalf("error = %+v, want %q without the internal detail", body, tt.wantCode)
				}
				return
			}
			var body api.CountryInfo
			if err := json.NewDecoder(recorder.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if len(body.Currencies) != 1 || body.Summary.Text == nil || *body.Summary.Text != "La France…" {
				t.Fatalf("body = %+v, want the facts and the summary", body)
			}
		})
	}
}
