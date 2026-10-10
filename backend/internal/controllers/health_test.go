package controllers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/views"
)

type fakeChecker struct {
	err error
}

func (c fakeChecker) Check(context.Context) error {
	return c.err
}

func TestHealthControllerShow(t *testing.T) {
	tests := []struct {
		name       string
		checkErr   error
		wantStatus int
		wantBody   views.HealthResponse
	}{
		{
			name:       "database up",
			wantStatus: http.StatusOK,
			wantBody:   views.HealthResponse{Status: "ok", Database: "up"},
		},
		{
			name:       "database down",
			checkErr:   errors.New("database unavailable"),
			wantStatus: http.StatusServiceUnavailable,
			wantBody:   views.HealthResponse{Status: "degraded", Database: "down"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := slog.New(slog.NewTextHandler(io.Discard, nil))
			controller := NewHealthController(fakeChecker{err: tt.checkErr}, logger)
			recorder := httptest.NewRecorder()

			controller.Show(recorder, httptest.NewRequest(http.MethodGet, "/api/health", nil))

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			var got views.HealthResponse
			if err := json.NewDecoder(recorder.Body).Decode(&got); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if got != tt.wantBody {
				t.Fatalf("body = %+v, want %+v", got, tt.wantBody)
			}
		})
	}
}
