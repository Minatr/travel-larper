package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"github.com/Minatr/travel-larper/backend/internal/api"
)

func TestRateLimit(t *testing.T) {
	const limit = 2
	handler := chimiddleware.ClientIPFromRemoteAddr(RateLimit(limit, discardLogger())(okHandler))
	send := func(remoteAddr string) *httptest.ResponseRecorder {
		request := httptest.NewRequest(http.MethodGet, "/", nil)
		request.RemoteAddr = remoteAddr
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)
		return recorder
	}

	for i := range limit {
		if recorder := send("192.0.2.1:1234"); recorder.Code != http.StatusOK {
			t.Fatalf("request %d: status = %d, want %d", i+1, recorder.Code, http.StatusOK)
		}
	}
	assertError(t, send("192.0.2.1:1234"), http.StatusTooManyRequests, api.ErrorCodeRateLimited)

	if recorder := send("192.0.2.2:1234"); recorder.Code != http.StatusOK {
		t.Fatalf("another IP: status = %d, want %d", recorder.Code, http.StatusOK)
	}
}
