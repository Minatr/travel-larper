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
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/middleware"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

var testSessionUser = services.SessionUser{ID: uuid.New(), Email: "bob@example.com", Status: "pending"}

type fakeSessionManager struct {
	loginErr       error
	logoutErr      error
	email          string
	password       string
	previousToken  string
	loggedOutToken string
}

func (m *fakeSessionManager) Login(_ context.Context, email, password, previousToken string) (services.Session, error) {
	m.email, m.password, m.previousToken = email, password, previousToken
	if m.loginErr != nil {
		return services.Session{}, m.loginErr
	}
	return services.Session{Token: "new-token", ExpiresAt: time.Now().Add(time.Hour), User: testSessionUser}, nil
}

func (m *fakeSessionManager) Logout(_ context.Context, token string) error {
	m.loggedOutToken = token
	return m.logoutErr
}

func newTestSessionController(manager SessionManager) *SessionController {
	return NewSessionController(manager, true, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestSessionControllerLogin(t *testing.T) {
	const validBody = `{"email":"bob@example.com","password":"12345678"}`

	tests := []struct {
		name       string
		body       string
		loginErr   error
		wantStatus int
		wantCode   api.ErrorCode
	}{
		{name: "logged in", body: validBody, wantStatus: http.StatusOK},
		{name: "invalid credentials", body: validBody, loginErr: services.ErrInvalidCredentials, wantStatus: http.StatusUnauthorized, wantCode: api.ErrorCodeInvalidCredentials},
		{name: "too many failures on the account", body: validBody, loginErr: services.ErrTooManyLoginFailures, wantStatus: http.StatusTooManyRequests, wantCode: api.ErrorCodeRateLimited},
		{name: "unexpected error", body: validBody, loginErr: errors.New("connection reset"), wantStatus: http.StatusInternalServerError, wantCode: api.ErrorCodeInternalError},
		{name: "malformed JSON", body: `{"email":`, wantStatus: http.StatusBadRequest, wantCode: api.ErrorCodeInvalidBody},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			manager := &fakeSessionManager{loginErr: tt.loginErr}
			request := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(tt.body))
			request.Header.Set("Cookie", "session=previous-token")
			recorder := httptest.NewRecorder()

			newTestSessionController(manager).Login(recorder, request)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if tt.wantCode != "" {
				if recorder.Header().Get("Set-Cookie") != "" {
					t.Fatal("a cookie was set on a failed login")
				}
				assertErrorBody(t, recorder, tt.wantCode)
				return
			}
			if manager.email != "bob@example.com" || manager.password != "12345678" {
				t.Fatalf("service received %q / %q, want the request credentials", manager.email, manager.password)
			}
			if manager.previousToken != "previous-token" {
				t.Fatalf("previous token = %q, want the request cookie", manager.previousToken)
			}
			assertSessionCookie(t, recorder, "new-token")
			assertCurrentUser(t, recorder)
		})
	}
}

func TestSessionControllerLogout(t *testing.T) {
	tests := []struct {
		name       string
		cookie     string
		logoutErr  error
		wantStatus int
	}{
		{name: "with a session", cookie: "token", wantStatus: http.StatusNoContent},
		{name: "without a session", cookie: "", wantStatus: http.StatusNoContent},
		{name: "unexpected error", cookie: "token", logoutErr: errors.New("connection reset"), wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			manager := &fakeSessionManager{logoutErr: tt.logoutErr}
			request := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
			if tt.cookie != "" {
				request.Header.Set("Cookie", "session="+tt.cookie)
			}
			recorder := httptest.NewRecorder()

			newTestSessionController(manager).Logout(recorder, request)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if manager.loggedOutToken != tt.cookie {
				t.Fatalf("closed session %q, want %q", manager.loggedOutToken, tt.cookie)
			}
			if !strings.Contains(recorder.Header().Get("Set-Cookie"), "Max-Age=0") {
				t.Fatal("cookie not cleared")
			}
		})
	}
}

func TestSessionControllerGetMe(t *testing.T) {
	router := chi.NewRouter()
	router.With(middleware.RequireSession(nil, stubAuthenticator{}, true, slog.New(slog.NewTextHandler(io.Discard, nil)))).
		Get("/api/auth/me", newTestSessionController(&fakeSessionManager{}).GetMe)
	request := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	request.Header.Set("Cookie", "session=token")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	assertCurrentUser(t, recorder)
}

func TestSessionControllerGetMeWithoutMiddleware(t *testing.T) {
	recorder := httptest.NewRecorder()

	newTestSessionController(&fakeSessionManager{}).GetMe(recorder, httptest.NewRequest(http.MethodGet, "/api/auth/me", nil))

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusInternalServerError)
	}
}

type stubAuthenticator struct{}

func (stubAuthenticator) Authenticate(context.Context, string) (services.Session, error) {
	return services.Session{Token: "token", User: testSessionUser}, nil
}

func assertSessionCookie(t *testing.T, recorder *httptest.ResponseRecorder, wantToken string) {
	t.Helper()
	cookies := recorder.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("cookies = %v, want one session cookie", cookies)
	}
	cookie := cookies[0]
	if cookie.Name != "session" || cookie.Value != wantToken || !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteLaxMode || cookie.MaxAge <= 0 {
		t.Fatalf("cookie = %+v, want an HttpOnly, Secure, SameSite=Lax session cookie", cookie)
	}
}

// assertCurrentUser checks that the body holds the user and nothing else:
// no token nor password hash leaks through the view.
func assertCurrentUser(t *testing.T, recorder *httptest.ResponseRecorder) {
	t.Helper()
	var fields map[string]any
	if err := json.NewDecoder(recorder.Body).Decode(&fields); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	want := map[string]any{"id": testSessionUser.ID.String(), "email": testSessionUser.Email, "status": testSessionUser.Status}
	if len(fields) != len(want) {
		t.Fatalf("body = %v, want exactly %v", fields, want)
	}
	for key, value := range want {
		if fields[key] != value {
			t.Fatalf("body = %v, want %v", fields, want)
		}
	}
}

func assertErrorBody(t *testing.T, recorder *httptest.ResponseRecorder, want api.ErrorCode) {
	t.Helper()
	var body api.Error
	if err := json.NewDecoder(recorder.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body.Code != want {
		t.Fatalf("error code = %q, want %q", body.Code, want)
	}
	if strings.Contains(body.Message, "connection reset") {
		t.Fatalf("message leaks the internal error: %q", body.Message)
	}
}
