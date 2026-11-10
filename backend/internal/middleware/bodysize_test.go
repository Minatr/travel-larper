package middleware

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/api"
)

func TestMaxBodySize(t *testing.T) {
	const maxBytes = 10
	readingHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := io.ReadAll(r.Body); err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				w.WriteHeader(http.StatusRequestEntityTooLarge)
				return
			}
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	tests := []struct {
		name          string
		body          string
		unknownLength bool
		wantStatus    int
	}{
		{name: "small body", body: "small", wantStatus: http.StatusOK},
		{name: "declared length too large", body: strings.Repeat("x", maxBytes+1), wantStatus: http.StatusRequestEntityTooLarge},
		{name: "undeclared length too large", body: strings.Repeat("x", maxBytes+1), unknownLength: true, wantStatus: http.StatusRequestEntityTooLarge},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tt.body))
			if tt.unknownLength {
				request.ContentLength = -1
			}
			recorder := httptest.NewRecorder()

			MaxBodySize(maxBytes, discardLogger())(readingHandler).ServeHTTP(recorder, request)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}

	t.Run("declared length too large answers in the Error format", func(t *testing.T) {
		recorder := httptest.NewRecorder()

		MaxBodySize(maxBytes, discardLogger())(okHandler).ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(strings.Repeat("x", maxBytes+1))))

		assertError(t, recorder, http.StatusRequestEntityTooLarge, api.ErrorCodeRequestTooLarge)
	})
}
