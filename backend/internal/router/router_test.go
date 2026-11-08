package router

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
	"github.com/Minatr/travel-larper/backend/internal/controllers"
)

type healthyChecker struct{}

func (healthyChecker) Check(context.Context) error {
	return nil
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestRoutes(t *testing.T) {
	handler := Routes(controllers.NewHealthController(healthyChecker{}, discardLogger()), discardLogger())

	tests := []struct {
		name          string
		method        string
		path          string
		wantStatus    int
		wantErrorCode api.ErrorCode
	}{
		{name: "health route under the base path", method: http.MethodGet, path: "/api/health", wantStatus: http.StatusOK},
		{name: "route outside the base path", method: http.MethodGet, path: "/health", wantStatus: http.StatusNotFound, wantErrorCode: api.ErrorCodeNotFound},
		{name: "unknown route", method: http.MethodGet, path: "/api/unknown", wantStatus: http.StatusNotFound, wantErrorCode: api.ErrorCodeNotFound},
		{name: "wrong method", method: http.MethodPost, path: "/api/health", wantStatus: http.StatusMethodNotAllowed, wantErrorCode: api.ErrorCodeMethodNotAllowed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()

			handler.ServeHTTP(recorder, httptest.NewRequest(tt.method, tt.path, nil))

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if tt.wantErrorCode != "" {
				assertErrorCode(t, recorder, tt.wantErrorCode)
			}
		})
	}
}

func TestInvalidParameterHandlerHidesTheError(t *testing.T) {
	recorder := httptest.NewRecorder()
	internalDetail := "strconv.ParseInt: parsing \"abc\""

	invalidParameterHandler(discardLogger())(recorder, httptest.NewRequest(http.MethodGet, "/api/health", nil), errors.New(internalDetail))

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
	if strings.Contains(recorder.Body.String(), internalDetail) {
		t.Fatalf("body leaks the internal error: %s", recorder.Body.String())
	}
	assertErrorCode(t, recorder, api.ErrorCodeInvalidParameter)
}

func assertErrorCode(t *testing.T, recorder *httptest.ResponseRecorder, want api.ErrorCode) {
	t.Helper()
	var body api.Error
	if err := json.NewDecoder(recorder.Body).Decode(&body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != want {
		t.Fatalf("error code = %q, want %q", body.Code, want)
	}
}
