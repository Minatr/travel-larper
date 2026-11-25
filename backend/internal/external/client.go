// Package external calls the free third-party services (Wikivoyage for now). Each client paces its own calls and
// reports a refusal for rate limiting as a RateLimitedError; the services above cache the answers.
package external

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// maxResponseBytes caps what is read from a service: our answers weigh a few kilobytes.
const maxResponseBytes = 1 << 20

// ErrNotFound is returned when the service knows nothing at that address (HTTP 404, empty result).
var ErrNotFound = errors.New("not found")

// RateLimitedError is returned on HTTP 429: the service asks to wait RetryAfter before calling again.
type RateLimitedError struct {
	RetryAfter time.Duration
}

func (e *RateLimitedError) Error() string {
	return fmt.Sprintf("rate limited, retry after %s", e.RetryAfter)
}

// Options are the settings shared by the clients (internal/config).
type Options struct {
	Timeout        time.Duration
	MinInterval    time.Duration
	DefaultBackoff time.Duration
	UserAgent      string
}

// jsonClient sends paced GET requests and decodes their JSON answer.
type jsonClient struct {
	http    *http.Client
	pacer   *pacer
	options Options
}

func newJSONClient(options Options) *jsonClient {
	return &jsonClient{
		http:    &http.Client{Timeout: options.Timeout},
		pacer:   &pacer{interval: options.MinInterval, now: time.Now},
		options: options,
	}
}

// get calls url and decodes its JSON answer into target.
func (c *jsonClient) get(ctx context.Context, url string, headers map[string]string, target any) (err error) {
	if err = c.pacer.wait(ctx); err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, http.NoBody)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", c.options.UserAgent)
	for name, value := range headers {
		request.Header.Set(name, value)
	}
	response, err := c.http.Do(request)
	if err != nil {
		return fmt.Errorf("call %s: %w", request.URL.Host, err)
	}
	defer func() { err = errors.Join(err, closeBody(response.Body)) }()

	switch response.StatusCode {
	case http.StatusOK:
		if err := json.NewDecoder(io.LimitReader(response.Body, maxResponseBytes)).Decode(target); err != nil {
			return fmt.Errorf("decode %s answer: %w", request.URL.Host, err)
		}
		return nil
	case http.StatusNotFound:
		return ErrNotFound
	case http.StatusTooManyRequests:
		return &RateLimitedError{RetryAfter: retryAfter(response.Header.Get("Retry-After"), c.options.DefaultBackoff)}
	default:
		return fmt.Errorf("call %s: unexpected status %d", request.URL.Host, response.StatusCode)
	}
}

// closeBody drains what is left of the body, so that the connection can be reused, then closes it.
func closeBody(body io.ReadCloser) error {
	if _, err := io.Copy(io.Discard, io.LimitReader(body, maxResponseBytes)); err != nil {
		return errors.Join(fmt.Errorf("drain body: %w", err), body.Close())
	}
	if err := body.Close(); err != nil {
		return fmt.Errorf("close body: %w", err)
	}
	return nil
}

// retryAfter reads a Retry-After header: seconds, or an HTTP date.
func retryAfter(header string, fallback time.Duration) time.Duration {
	if seconds, err := strconv.Atoi(header); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	if date, err := http.ParseTime(header); err == nil {
		if wait := time.Until(date); wait > 0 {
			return wait
		}
	}
	return fallback
}

// pacer spaces the calls to a service by at least interval: a caller waits its turn.
type pacer struct {
	mu       sync.Mutex
	interval time.Duration
	next     time.Time
	now      func() time.Time
}

func (p *pacer) wait(ctx context.Context) error {
	p.mu.Lock()
	now := p.now()
	start := p.next
	if start.Before(now) {
		start = now
	}
	p.next = start.Add(p.interval)
	p.mu.Unlock()

	delay := start.Sub(now)
	if delay <= 0 {
		return nil
	}
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return fmt.Errorf("wait for the service: %w", ctx.Err())
	}
}
