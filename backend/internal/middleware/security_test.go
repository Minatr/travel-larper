package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityHeaders(t *testing.T) {
	tests := []struct {
		name     string
		hsts     bool
		wantHSTS string
	}{
		{name: "development", hsts: false, wantHSTS: ""},
		{name: "production", hsts: true, wantHSTS: strictTransportSecurity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()

			SecurityHeaders(tt.hsts)(okHandler).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

			header := recorder.Header()
			want := map[string]string{
				"Content-Security-Policy":   contentSecurityPolicy,
				"X-Content-Type-Options":    "nosniff",
				"Referrer-Policy":           "no-referrer",
				"Strict-Transport-Security": tt.wantHSTS,
			}
			for name, value := range want {
				if got := header.Get(name); got != value {
					t.Errorf("%s = %q, want %q", name, got, value)
				}
			}
		})
	}
}
