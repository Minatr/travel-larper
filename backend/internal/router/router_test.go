package router

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/controllers"
)

type healthyChecker struct{}

func (healthyChecker) Check(context.Context) error {
	return nil
}

func TestRoutes(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := Routes(controllers.NewHealthController(healthyChecker{}, logger))

	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
	}{
		{name: "health route under the base path", method: http.MethodGet, path: "/api/health", wantStatus: http.StatusOK},
		{name: "route outside the base path", method: http.MethodGet, path: "/health", wantStatus: http.StatusNotFound},
		{name: "unknown route", method: http.MethodGet, path: "/api/unknown", wantStatus: http.StatusNotFound},
		{name: "wrong method", method: http.MethodPost, path: "/api/health", wantStatus: http.StatusMethodNotAllowed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()

			handler.ServeHTTP(recorder, httptest.NewRequest(tt.method, tt.path, nil))

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}
}
