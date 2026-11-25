package router

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"slices"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/controllers"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

type healthyChecker struct{}

type rejectingAuthenticator struct{}

func (rejectingAuthenticator) Authenticate(context.Context, string) (services.Session, error) {
	return services.Session{}, services.ErrInvalidSession
}

type rejectingSessionManager struct{}

func (rejectingSessionManager) Login(context.Context, string, string, string) (services.Session, error) {
	return services.Session{}, services.ErrInvalidCredentials
}

func (rejectingSessionManager) Logout(context.Context, string) error {
	return nil
}

type acceptingRegistrar struct{}

func (acceptingRegistrar) Register(context.Context, services.NewAccount) error {
	return nil
}

func (healthyChecker) Check(context.Context) error {
	return nil
}

const contractPath = "../../../api/openapi.yaml"

var testOptions = Options{
	RateLimitPerMinute:       1000,
	MaxBodyBytes:             1 << 20,
	RegisterRateLimitPerHour: 1000,
	LoginRateLimitPerMinute:  1000,
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestRoutes(t *testing.T) {
	handler := Routes(Controllers{
		HealthController:  controllers.NewHealthController(healthyChecker{}, discardLogger()),
		SessionController: controllers.NewSessionController(rejectingSessionManager{}, false, discardLogger()),
	}, rejectingAuthenticator{}, discardLogger(), testOptions)

	tests := []struct {
		name          string
		method        string
		path          string
		wantStatus    int
		wantErrorCode api.ErrorCode
	}{
		{
			name:       "health route under the base path",
			method:     http.MethodGet,
			path:       "/api/health",
			wantStatus: http.StatusOK,
		},
		{
			name:          "route outside the base path",
			method:        http.MethodGet,
			path:          "/health",
			wantStatus:    http.StatusNotFound,
			wantErrorCode: api.ErrorCodeNotFound,
		},
		{
			name:          "unknown route",
			method:        http.MethodGet,
			path:          "/api/unknown",
			wantStatus:    http.StatusNotFound,
			wantErrorCode: api.ErrorCodeNotFound,
		},
		{
			name:          "wrong method",
			method:        http.MethodPost,
			path:          "/api/health",
			wantStatus:    http.StatusMethodNotAllowed,
			wantErrorCode: api.ErrorCodeMethodNotAllowed,
		},
		{
			name:          "protected route without a session",
			method:        http.MethodGet,
			path:          "/api/auth/me",
			wantStatus:    http.StatusUnauthorized,
			wantErrorCode: api.ErrorCodeUnauthorized,
		},
		{
			name:       "logout without a session",
			method:     http.MethodPost,
			path:       "/api/auth/logout",
			wantStatus: http.StatusNoContent,
		},
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
		HealthController:       controllers.NewHealthController(healthyChecker{}, discardLogger()),
		RegistrationController: controllers.NewRegistrationController(acceptingRegistrar{}, discardLogger()),
	}, rejectingAuthenticator{}, discardLogger(), options)
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

func TestRoutesLimitLogin(t *testing.T) {
	options := testOptions
	options.LoginRateLimitPerMinute = 2
	handler := Routes(Controllers{
		SessionController: controllers.NewSessionController(rejectingSessionManager{}, false, discardLogger()),
	}, rejectingAuthenticator{}, discardLogger(), options)
	login := func() *httptest.ResponseRecorder {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(
			recorder,
			httptest.NewRequest(
				http.MethodPost,
				"/api/auth/login",
				strings.NewReader(`{"email":"bob@example.com","password":"guess"}`),
			),
		)
		return recorder
	}

	for i := range options.LoginRateLimitPerMinute {
		if recorder := login(); recorder.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: status = %d, want %d", i+1, recorder.Code, http.StatusUnauthorized)
		}
	}
	recorder := login()
	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("attempt over the limit: status = %d, want %d", recorder.Code, http.StatusTooManyRequests)
	}
	assertErrorCode(t, recorder, api.ErrorCodeRateLimited)
}

// TestPublicRoutesMatchTheContract keeps publicRoutes and openapi.yaml in
// step: a route is public exactly when the contract declares no `security`.
func TestPublicRoutesMatchTheContract(t *testing.T) {
	raw, err := os.ReadFile(contractPath)
	if err != nil {
		t.Fatalf("read contract: %v", err)
	}
	var contract struct {
		Paths map[string]map[string]struct {
			Security []map[string][]string `yaml:"security"`
		} `yaml:"paths"`
	}
	if err := yaml.Unmarshal(raw, &contract); err != nil {
		t.Fatalf("parse contract: %v", err)
	}

	var wantPublic []string
	for path, operations := range contract.Paths {
		for _, operation := range operations {
			if len(operation.Security) == 0 {
				wantPublic = append(wantPublic, basePath+path)
				break
			}
		}
	}

	got := slices.Sorted(slices.Values(publicRoutes))
	slices.Sort(wantPublic)
	if !slices.Equal(got, wantPublic) {
		t.Fatalf("publicRoutes = %v, want the routes without security in openapi.yaml: %v", got, wantPublic)
	}
}

func TestInvalidParameterHandlerHidesTheError(t *testing.T) {
	recorder := httptest.NewRecorder()
	internalDetail := "strconv.ParseInt: parsing \"abc\""

	invalidParameterHandler(
		discardLogger(),
	)(
		recorder,
		httptest.NewRequest(http.MethodGet, "/api/health", nil),
		errors.New(internalDetail),
	)

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
