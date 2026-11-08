package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/api"
)

func TestRecoverer(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	panicking := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("internal detail")
	})
	recorder := httptest.NewRecorder()

	Recoverer(logger)(panicking).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if strings.Contains(recorder.Body.String(), "internal detail") {
		t.Fatalf("response leaks the panic: %s", recorder.Body.String())
	}
	assertError(t, recorder, http.StatusInternalServerError, api.ErrorCodeInternalError)
	if !strings.Contains(logs.String(), "internal detail") {
		t.Fatalf("panic is not logged: %s", logs.String())
	}
}
