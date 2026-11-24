package services

import (
	"strings"
	"sync"
	"time"
)

// LoginAttempts counts the failed logins of each account, whatever the IP
// they come from: the per-IP limit alone lets many IPs try passwords on one
// account. Kept in memory, as there is a single server.
type LoginAttempts struct {
	mu          sync.Mutex
	maxFailures int
	window      time.Duration
	// maxAccounts bounds the memory: random emails cannot grow it forever.
	maxAccounts int
	failures    map[string]failureWindow
	now         func() time.Time
}

type failureWindow struct {
	count int
	start time.Time
}

// NewLoginAttempts creates a LoginAttempts that blocks an account after
// maxFailures failed logins within window, until that window ends.
func NewLoginAttempts(maxFailures int, window time.Duration, maxAccounts int) *LoginAttempts {
	return &LoginAttempts{
		maxFailures: maxFailures,
		window:      window,
		maxAccounts: maxAccounts,
		failures:    make(map[string]failureWindow),
		now:         time.Now,
	}
}

// Blocked tells whether the account of email has too many recent failures.
func (a *LoginAttempts) Blocked(email string) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	failures, found := a.current(accountKey(email))
	return found && failures.count >= a.maxFailures
}

// RecordFailure counts a failed login on the account of email.
func (a *LoginAttempts) RecordFailure(email string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	key := accountKey(email)
	failures, found := a.current(key)
	if !found {
		a.makeRoom()
		failures = failureWindow{start: a.now()}
	}
	failures.count++
	a.failures[key] = failures
}

// Reset forgets the failures of the account of email.
func (a *LoginAttempts) Reset(email string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.failures, accountKey(email))
}

// current returns the failures of key, dropping them once their window is over.
func (a *LoginAttempts) current(key string) (failureWindow, bool) {
	failures, found := a.failures[key]
	if found && a.expired(failures) {
		delete(a.failures, key)
		return failureWindow{}, false
	}
	return failures, found
}

// makeRoom frees an entry when the map is full: the expired ones first, else
// the oldest, so the most recent attacks stay counted.
func (a *LoginAttempts) makeRoom() {
	if len(a.failures) < a.maxAccounts {
		return
	}
	oldestKey := ""
	var oldestStart time.Time
	for key, failures := range a.failures {
		if a.expired(failures) {
			delete(a.failures, key)
			continue
		}
		if oldestKey == "" || failures.start.Before(oldestStart) {
			oldestKey, oldestStart = key, failures.start
		}
	}
	if len(a.failures) >= a.maxAccounts {
		delete(a.failures, oldestKey)
	}
}

func (a *LoginAttempts) expired(failures failureWindow) bool {
	return a.now().Sub(failures.start) >= a.window
}

// accountKey makes Bob@ and bob@ count as the same account.
func accountKey(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
