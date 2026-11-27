package external

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

var testOptions = Options{
	Timeout:        time.Second,
	MinInterval:    0,
	DefaultBackoff: time.Minute,
	UserAgent:      "TravelLarper/test",
}

// serve answers every request with status and body, and records the last request.
func serve(t *testing.T, status int, body string, headers map[string]string) (*httptest.Server, *http.Request) {
	t.Helper()
	last := &http.Request{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*last = *r.Clone(context.Background())
		for name, value := range headers {
			w.Header().Set(name, value)
		}
		w.WriteHeader(status)
		if _, err := w.Write([]byte(body)); err != nil {
			t.Errorf("write answer: %v", err)
		}
	}))
	t.Cleanup(server.Close)
	return server, last
}

func TestWikivoyageSummary(t *testing.T) {
	tests := []struct {
		name     string
		status   int
		body     string
		want     Summary
		wantErr  error
		wantPath string
	}{
		{
			name:   "article",
			status: http.StatusOK,
			body: `{"type":"standard","extract":" La France est un pays. ",` +
				`"content_urls":{"desktop":{"page":"https://fr.wikivoyage.org/wiki/France"}}}`,
			want:     Summary{Text: "La France est un pays.", URL: "https://fr.wikivoyage.org/wiki/France"},
			wantPath: "/fr/Georgia_(country)",
		},
		{name: "no article", status: http.StatusNotFound, wantErr: ErrNotFound},
		{
			name:    "disambiguation page",
			status:  http.StatusOK,
			body:    `{"type":"disambiguation","extract":"Georgia may be"}`,
			wantErr: ErrNotFound,
		},
		{name: "empty text", status: http.StatusOK, body: `{"type":"standard","extract":"  "}`, wantErr: ErrNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, last := serve(t, tt.status, tt.body, nil)
			client := NewWikivoyage(server.URL+"/%s/", testOptions)

			summary, err := client.Summary(context.Background(), "fr", "Georgia (country)")

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Summary() error = %v, want %v", err, tt.wantErr)
			}
			if summary != tt.want {
				t.Fatalf("Summary() = %+v, want %+v", summary, tt.want)
			}
			if tt.wantPath != "" && last.URL.Path != tt.wantPath {
				t.Errorf("path = %q, want %q", last.URL.Path, tt.wantPath)
			}
		})
	}
}

func TestClientErrors(t *testing.T) {
	tests := []struct {
		name    string
		status  int
		body    string
		headers map[string]string
		check   func(error) bool
	}{
		{
			name:    "rate limited",
			status:  http.StatusTooManyRequests,
			headers: map[string]string{"Retry-After": "30"},
			check: func(err error) bool {
				var rateLimited *RateLimitedError
				return errors.As(err, &rateLimited) && rateLimited.RetryAfter == 30*time.Second
			},
		},
		{
			name:   "rate limited without Retry-After",
			status: http.StatusTooManyRequests,
			check: func(err error) bool {
				var rateLimited *RateLimitedError
				return errors.As(err, &rateLimited) && rateLimited.RetryAfter == testOptions.DefaultBackoff
			},
		},
		{
			name:   "server error",
			status: http.StatusBadGateway,
			check:  func(err error) bool { return err != nil && !errors.Is(err, ErrNotFound) },
		},
		{
			name:   "not JSON",
			status: http.StatusOK,
			body:   "<html>",
			check:  func(err error) bool { return err != nil && !errors.Is(err, ErrNotFound) },
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, last := serve(t, tt.status, tt.body, tt.headers)
			client := NewWikivoyage(server.URL+"/%s/", testOptions)

			_, err := client.Summary(context.Background(), "en", "France")

			if !tt.check(err) {
				t.Fatalf("Summary() error = %v", err)
			}
			if last.Header.Get("User-Agent") != testOptions.UserAgent {
				t.Errorf("User-Agent = %q, want the app's: Wikimedia blocks the others", last.Header.Get("User-Agent"))
			}
		})
	}
}

func TestPacerSpacesCalls(t *testing.T) {
	now := time.Date(2026, 11, 25, 12, 0, 0, 0, time.UTC)
	p := &pacer{interval: time.Second, now: func() time.Time { return now }}
	if err := p.wait(context.Background()); err != nil {
		t.Fatalf("first wait: %v", err)
	}
	// The second call, at the same instant, must wait a second: a cancelled context shows it would have.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := p.wait(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("second wait = %v, want it to wait (and give up on the cancelled context)", err)
	}
}
