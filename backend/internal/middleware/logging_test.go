package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestLogger(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	teapot := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	request := httptest.NewRequest(http.MethodPost, "/api/health?token=query-secret", strings.NewReader("body-secret"))
	request.Header.Set("Cookie", "session=cookie-secret")

	RequestLogger(logger)(teapot).ServeHTTP(httptest.NewRecorder(), request)

	line := logs.String()
	if strings.Count(line, "\n") != 1 {
		t.Fatalf("want exactly one log line, got %q", line)
	}
	for _, want := range []string{"method=POST", "path=/api/health", "status=418", "duration="} {
		if !strings.Contains(line, want) {
			t.Errorf("log line misses %q: %s", want, line)
		}
	}
	for _, secret := range []string{"query-secret", "body-secret", "cookie-secret"} {
		if strings.Contains(line, secret) {
			t.Errorf("log line leaks %q: %s", secret, line)
		}
	}
}
