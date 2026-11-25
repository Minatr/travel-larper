package services

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/Minatr/travel-larper/backend/internal/external"
)

// errSourcePaused is returned while a source that answered 429 is left alone and nothing was cached.
var errSourcePaused = errors.New("source paused after a rate limit")

// sourceCache keeps the answers of an external source in memory. An answer is fresh for ttl; past that, it is fetched
// again, but still served up to staleTTL if the source fails. After a 429, the source is left alone for as long as it
// asked. Fetches run one at a time: simultaneous requests for one key make a single call, and the source is paced
// anyway (external.Options.MinInterval). Its size is bounded by its keys: the countries times the languages.
type sourceCache[V any] struct {
	mu          sync.Mutex
	fetchMu     sync.Mutex
	entries     map[string]cacheEntry[V]
	ttl         time.Duration
	staleTTL    time.Duration
	pausedUntil time.Time
	now         func() time.Time
}

type cacheEntry[V any] struct {
	value     V
	fetchedAt time.Time
}

func newSourceCache[V any](ttl, staleTTL time.Duration, now func() time.Time) *sourceCache[V] {
	return &sourceCache[V]{entries: map[string]cacheEntry[V]{}, ttl: ttl, staleTTL: staleTTL, now: now}
}

// get returns the answer for key: cached while fresh, fetched otherwise. When fetch fails, an answer younger than
// staleTTL is returned instead, with a nil error; fetch logs its own failures.
func (c *sourceCache[V]) get(ctx context.Context, key string, fetch func(context.Context) (V, error)) (V, error) {
	if value, ok := c.lookup(key, c.ttl); ok {
		return value, nil
	}

	c.fetchMu.Lock()
	defer c.fetchMu.Unlock()
	// Another request may have fetched it while this one waited.
	if value, ok := c.lookup(key, c.ttl); ok {
		return value, nil
	}
	if c.paused() {
		return c.stale(key, errSourcePaused)
	}

	value, err := fetch(ctx)
	if err == nil {
		c.mu.Lock()
		c.entries[key] = cacheEntry[V]{value: value, fetchedAt: c.now()}
		c.mu.Unlock()
		return value, nil
	}
	var rateLimited *external.RateLimitedError
	if errors.As(err, &rateLimited) {
		c.mu.Lock()
		c.pausedUntil = c.now().Add(rateLimited.RetryAfter)
		c.mu.Unlock()
	}
	return c.stale(key, err)
}

func (c *sourceCache[V]) lookup(key string, maxAge time.Duration) (V, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.entries[key]
	if !ok || c.now().Sub(entry.fetchedAt) >= maxAge {
		var zero V
		return zero, false
	}
	return entry.value, true
}

func (c *sourceCache[V]) paused() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now().Before(c.pausedUntil)
}

func (c *sourceCache[V]) stale(key string, err error) (V, error) {
	if value, ok := c.lookup(key, c.staleTTL); ok {
		return value, nil
	}
	var zero V
	return zero, err
}
