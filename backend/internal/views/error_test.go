package views

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/api"
)

func TestWriteError(t *testing.T) {
	tests := []struct {
		code       api.ErrorCode
		wantStatus int
	}{
		{code: api.ErrorCodeInvalidParameter, wantStatus: http.StatusBadRequest},
		{code: api.ErrorCodeNotFound, wantStatus: http.StatusNotFound},
		{code: api.ErrorCodeMethodNotAllowed, wantStatus: http.StatusMethodNotAllowed},
		{code: api.ErrorCodeRequestTooLarge, wantStatus: http.StatusRequestEntityTooLarge},
		{code: api.ErrorCodeRateLimited, wantStatus: http.StatusTooManyRequests},
		{code: api.ErrorCodeInternalError, wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(string(tt.code), func(t *testing.T) {
			recorder := httptest.NewRecorder()

			WriteError(recorder, slog.New(slog.NewTextHandler(io.Discard, nil)), tt.code)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if got := recorder.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("content type = %q, want application/json", got)
			}
			var body api.Error
			if err := json.NewDecoder(recorder.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body.Code != tt.code || body.Message == "" {
				t.Fatalf("body = %+v, want code %q and a message", body, tt.code)
			}
		})
	}
}
