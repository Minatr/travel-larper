package services

import (
	"testing"
	"time"
)

func newTestLoginAttempts(maxAccounts int, clock *time.Time) *LoginAttempts {
	attempts := NewLoginAttempts(3, time.Hour, maxAccounts)
	attempts.now = func() time.Time { return *clock }
	return attempts
}

func TestLoginAttempts(t *testing.T) {
	tests := []struct {
		name        string
		failures    int
		elapsed     time.Duration
		reset       bool
		checked     string
		wantBlocked bool
	}{
		{name: "below the limit", failures: 2, checked: "bob@example.com"},
		{name: "at the limit", failures: 3, checked: "bob@example.com", wantBlocked: true},
		{name: "same account, other case and spaces", failures: 3, checked: " BOB@Example.com ", wantBlocked: true},
		{name: "other account", failures: 3, checked: "alice@example.com"},
		{name: "window not over", failures: 3, elapsed: 59 * time.Minute, checked: "bob@example.com", wantBlocked: true},
		{name: "window over", failures: 3, elapsed: time.Hour, checked: "bob@example.com"},
		{name: "reset", failures: 3, reset: true, checked: "bob@example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clock := testNow
			attempts := newTestLoginAttempts(100, &clock)
			for range tt.failures {
				attempts.RecordFailure("bob@example.com")
			}
			if tt.reset {
				attempts.Reset("bob@example.com")
			}
			clock = clock.Add(tt.elapsed)

			if blocked := attempts.Blocked(tt.checked); blocked != tt.wantBlocked {
				t.Fatalf("Blocked() = %v, want %v", blocked, tt.wantBlocked)
			}
		})
	}
}

func TestLoginAttemptsStayBounded(t *testing.T) {
	clock := testNow
	attempts := newTestLoginAttempts(2, &clock)
	for range 3 {
		attempts.RecordFailure("oldest@example.com")
	}
	clock = clock.Add(time.Minute)
	attempts.RecordFailure("middle@example.com")
	clock = clock.Add(time.Minute)
	attempts.RecordFailure("newest@example.com")

	if len(attempts.failures) != 2 {
		t.Fatalf("tracked accounts = %d, want 2", len(attempts.failures))
	}
	if attempts.Blocked("oldest@example.com") {
		t.Fatal("the oldest account was not the one dropped")
	}
}
