package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

const userHeader = "X-Session-User"

type fakeAuthenticator struct {
	session  services.Session
	err      error
	gotToken string
}

func (a *fakeAuthenticator) Authenticate(_ context.Context, token string) (services.Session, error) {
	a.gotToken = token
	return a.session, a.err
}

// newAuthRouter serves /public and /private behind RequireSession; /private
// returns the email of the session user in a header.
func newAuthRouter(authenticator Authenticator) http.Handler {
	router := chi.NewRouter()
	protected := router.With(RequireSession([]string{"/public"}, authenticator, true, discardLogger()))
	protected.Get("/public", okHandler)
	protected.Get("/private", func(w http.ResponseWriter, r *http.Request) {
		user, ok := SessionUser(r.Context())
		if !ok {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Header().Set(userHeader, user.Email)
	})
	return router
}

func send(handler http.Handler, path, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodGet, path, nil)
	if token != "" {
		request.Header.Set("Cookie", "session="+token)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}

func TestRequireSessionLetsPublicRoutesThrough(t *testing.T) {
	authenticator := &fakeAuthenticator{err: services.ErrInvalidSession}

	recorder := send(newAuthRouter(authenticator), "/public", "")

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
}

func TestRequireSessionRefusesWithoutValidSession(t *testing.T) {
	tests := []struct {
		name       string
		token      string
		err        error
		wantStatus int
		wantCode   api.ErrorCode
	}{
		{name: "no cookie", err: services.ErrInvalidSession, wantStatus: http.StatusUnauthorized, wantCode: api.ErrorCodeUnauthorized},
		{name: "unknown or expired token", token: "stale", err: services.ErrInvalidSession, wantStatus: http.StatusUnauthorized, wantCode: api.ErrorCodeUnauthorized},
		{name: "database failure", token: "token", err: errors.New("connection reset"), wantStatus: http.StatusInternalServerError, wantCode: api.ErrorCodeInternalError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			authenticator := &fakeAuthenticator{err: tt.err}

			recorder := send(newAuthRouter(authenticator), "/private", tt.token)

			if authenticator.gotToken != tt.token {
				t.Fatalf("authenticated token %q, want %q", authenticator.gotToken, tt.token)
			}
			if tt.wantCode == api.ErrorCodeUnauthorized && !strings.Contains(recorder.Header().Get("Set-Cookie"), "Max-Age=0") {
				t.Fatalf("stale cookie not cleared: %q", recorder.Header().Get("Set-Cookie"))
			}
			assertError(t, recorder, tt.wantStatus, tt.wantCode)
		})
	}
}

func TestRequireSessionPassesTheUser(t *testing.T) {
	tests := []struct {
		name       string
		renewed    bool
		wantCookie bool
	}{
		{name: "session kept as is", renewed: false, wantCookie: false},
		{name: "session renewed", renewed: true, wantCookie: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			authenticator := &fakeAuthenticator{session: services.Session{
				Token:     "token",
				ExpiresAt: time.Now().Add(time.Hour),
				User:      services.SessionUser{ID: uuid.New(), Email: "bob@example.com", Status: "active"},
				Renewed:   tt.renewed,
			}}

			recorder := send(newAuthRouter(authenticator), "/private", "token")

			if recorder.Code != http.StatusOK || recorder.Header().Get(userHeader) != "bob@example.com" {
				t.Fatalf("response = %d %q, want 200 with the session user", recorder.Code, recorder.Header().Get(userHeader))
			}
			if gotCookie := recorder.Header().Get("Set-Cookie") != ""; gotCookie != tt.wantCookie {
				t.Fatalf("cookie sent = %v, want %v", gotCookie, tt.wantCookie)
			}
		})
	}
}
