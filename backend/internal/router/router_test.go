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

type acceptingRegistrar struct{}

func (acceptingRegistrar) Register(context.Context, string, string) error {
	return nil
}

func (healthyChecker) Check(context.Context) error {
	return nil
}

var testOptions = Options{RateLimitPerMinute: 1000, MaxBodyBytes: 1 << 20, RegisterRateLimitPerHour: 1000}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestRoutes(t *testing.T) {
	handler := Routes(Controllers{HealthController: controllers.NewHealthController(healthyChecker{}, discardLogger())}, discardLogger(), testOptions)

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
			if recorder.Header().Get("X-Content-Type-Options") != "nosniff" {
				t.Fatal("security headers are missing: middlewares not applied")
			}
			if recorder.Header().Get("X-Ratelimit-Limit") == "" {
				t.Fatal("rate limit headers are missing: middlewares not applied")
			}
			if tt.wantErrorCode != "" {
				assertErrorCode(t, recorder, tt.wantErrorCode)
			}
		})
	}
}

func TestRoutesLimitRegistrationOnly(t *testing.T) {
	options := testOptions
	options.RegisterRateLimitPerHour = 2
	handler := Routes(Controllers{
		HealthController: controllers.NewHealthController(healthyChecker{}, discardLogger()),
		AuthController:   controllers.NewAuthController(acceptingRegistrar{}, discardLogger()),
	}, discardLogger(), options)
	send := func(method, path, body string) *httptest.ResponseRecorder {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, httptest.NewRequest(method, path, strings.NewReader(body)))
		return recorder
	}
	register := func() *httptest.ResponseRecorder {
		return send(http.MethodPost, "/api/auth/register", `{"email":"bob@example.com","password":"12345678"}`)
	}

	for i := range options.RegisterRateLimitPerHour {
		if recorder := register(); recorder.Code != http.StatusCreated {
			t.Fatalf("registration %d: status = %d, want %d", i+1, recorder.Code, http.StatusCreated)
		}
	}
	recorder := register()
	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("registration over the limit: status = %d, want %d", recorder.Code, http.StatusTooManyRequests)
	}
	assertErrorCode(t, recorder, api.ErrorCodeRateLimited)

	if recorder := send(http.MethodGet, "/api/health", ""); recorder.Code != http.StatusOK {
		t.Fatalf("health after the registration limit: status = %d, want %d", recorder.Code, http.StatusOK)
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
