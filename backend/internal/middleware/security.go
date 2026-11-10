package middleware

import "net/http"

const (
	contentSecurityPolicy   = "default-src 'none'; frame-ancestors 'none'"
	strictTransportSecurity = "max-age=63072000; includeSubDomains"
)

// SecurityHeaders sets the security headers; HSTS only when hsts is true.
func SecurityHeaders(hsts bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := w.Header()
			header.Set("Content-Security-Policy", contentSecurityPolicy)
			header.Set("X-Content-Type-Options", "nosniff")
			header.Set("Referrer-Policy", "no-referrer")
			if hsts {
				header.Set("Strict-Transport-Security", strictTransportSecurity)
			}
			next.ServeHTTP(w, r)
		})
	}
}
