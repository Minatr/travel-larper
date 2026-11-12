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

type fakeRegistrar struct {
	err      error
	called   bool
	email    string
	password string
}

func (r *fakeRegistrar) Register(_ context.Context, email, password string) error {
	r.called, r.email, r.password = true, email, password
	return r.err
}

func TestAuthControllerRegister(t *testing.T) {
	const validBody = `{"email":"bob@example.com","password":"12345678"}`

	tests := []struct {
		name        string
		body        string
		registerErr error
		wantStatus  int
		wantCode    api.ErrorCode
		wantCalled  bool
	}{
		{name: "created", body: validBody, wantStatus: http.StatusCreated, wantCalled: true},
		{name: "malformed JSON", body: `{"email":`, wantStatus: http.StatusBadRequest, wantCode: api.ErrorCodeInvalidBody},
		{name: "unknown field", body: `{"email":"bob@example.com","password":"12345678","role":"admin"}`, wantStatus: http.StatusBadRequest, wantCode: api.ErrorCodeInvalidBody},
		{name: "invalid email", body: validBody, registerErr: services.ErrInvalidEmail, wantStatus: http.StatusBadRequest, wantCode: api.ErrorCodeInvalidEmail, wantCalled: true},
		{name: "password too short", body: validBody, registerErr: services.ErrPasswordTooShort, wantStatus: http.StatusBadRequest, wantCode: api.ErrorCodePasswordTooShort, wantCalled: true},
		{name: "password too long", body: validBody, registerErr: services.ErrPasswordTooLong, wantStatus: http.StatusBadRequest, wantCode: api.ErrorCodePasswordTooLong, wantCalled: true},
		{name: "email taken", body: validBody, registerErr: services.ErrEmailTaken, wantStatus: http.StatusConflict, wantCode: api.ErrorCodeEmailTaken, wantCalled: true},
		{name: "unexpected error", body: validBody, registerErr: errors.New("connection reset"), wantStatus: http.StatusInternalServerError, wantCode: api.ErrorCodeInternalError, wantCalled: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			registrar := &fakeRegistrar{err: tt.registerErr}
			controller := NewAuthController(registrar, slog.New(slog.NewTextHandler(io.Discard, nil)))
			recorder := httptest.NewRecorder()

			controller.Register(recorder, httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(tt.body)))

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if registrar.called != tt.wantCalled {
				t.Fatalf("service called = %v, want %v", registrar.called, tt.wantCalled)
			}
			if tt.wantCalled && (registrar.email != "bob@example.com" || registrar.password != "12345678") {
				t.Fatalf("service received %q / %q, want the request credentials", registrar.email, registrar.password)
			}
			if tt.wantCode == "" {
				if recorder.Body.Len() != 0 {
					t.Fatalf("body = %q, want empty", recorder.Body.String())
				}
				return
			}
			var body api.Error
			if err := json.NewDecoder(recorder.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body.Code != tt.wantCode {
				t.Fatalf("error code = %q, want %q", body.Code, tt.wantCode)
			}
			if strings.Contains(body.Message, "connection reset") {
				t.Fatalf("message leaks the internal error: %q", body.Message)
			}
		})
	}
}

func TestAuthControllerRegisterRejectsLargeBody(t *testing.T) {
	registrar := &fakeRegistrar{}
	controller := NewAuthController(registrar, slog.New(slog.NewTextHandler(io.Discard, nil)))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"email":"`+strings.Repeat("a", 100)+`"}`))
	// What the MaxBodySize middleware does when the body has no Content-Length.
	request.Body = http.MaxBytesReader(recorder, request.Body, 10)

	controller.Register(recorder, request)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusRequestEntityTooLarge)
	}
	if registrar.called {
		t.Fatal("service called with a truncated body")
	}
}
