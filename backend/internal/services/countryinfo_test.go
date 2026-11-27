package services

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/Minatr/travel-larper/backend/internal/external"
	"github.com/Minatr/travel-larper/backend/internal/models"
)

type fakeCatalog map[string]models.Country

func (c fakeCatalog) Country(code string) (models.Country, bool) {
	country, ok := c[code]
	return country, ok
}

// fakeSummaries answers err if set, summary otherwise, and counts the calls.
type fakeSummaries struct {
	mu          sync.Mutex
	calls       int
	summary     external.Summary
	err         error
	gotTitle    string
	gotLanguage string
}

func (f *fakeSummaries) Summary(_ context.Context, language, title string) (external.Summary, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	f.gotLanguage, f.gotTitle = language, title
	return f.summary, f.err
}

var (
	testCatalog = fakeCatalog{
		"FR": {
			Currencies: []string{"EUR"},
			Languages:  []models.Language{{Code: "fr", Names: map[string]string{"en": "French", "fr": "français"}}},
			Wikivoyage: map[string]string{"en": "France", "fr": "France"},
		},
		"TV": {
			Currencies: []string{"AUD", "TVD"},
			Languages:  []models.Language{{Code: "tvl", Names: map[string]string{"en": "Tuvaluan"}}},
			Wikivoyage: map[string]string{"en": "Tuvalu", "fr": ""},
		},
	}
	franceSummary = external.Summary{Text: "La France…", URL: "https://fr.wikivoyage.org/wiki/France"}
	testStart     = time.Date(2026, 11, 25, 12, 0, 0, 0, time.UTC)
)

const (
	testTTL      = 7 * 24 * time.Hour
	testStaleTTL = 30 * 24 * time.Hour
)

// newTestCountryInfoService returns the service and a function that moves its clock.
func newTestCountryInfoService(summaries SummarySource) (*CountryInfoService, func(time.Duration)) {
	service := NewCountryInfoService(
		testCatalog, summaries, testTTL, testStaleTTL, slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	now := testStart
	service.summaryCache.now = func() time.Time { return now }
	return service, func(elapsed time.Duration) { now = now.Add(elapsed) }
}

func findFrance(t *testing.T, service *CountryInfoService) CountryInfo {
	t.Helper()
	info, err := service.Find(context.Background(), "FR", "fr")
	if err != nil {
		t.Fatalf("Find() error = %v", err)
	}
	return info
}

func TestCountryInfoServiceFind(t *testing.T) {
	summaries := &fakeSummaries{summary: franceSummary}
	service, _ := newTestCountryInfoService(summaries)

	info := findFrance(t, service)

	if info.Code != "FR" || info.Currencies[0] != "EUR" || info.Languages[0] != (CountryLanguage{"fr", "français"}) {
		t.Errorf("info = %+v, want FR, EUR and français", info)
	}
	wantSummary := CountrySummary{Status: SummaryAvailable, Text: franceSummary.Text, URL: franceSummary.URL}
	if info.Summary != wantSummary {
		t.Errorf("summary = %+v, want %+v", info.Summary, wantSummary)
	}
	if summaries.gotLanguage != "fr" || summaries.gotTitle != "France" {
		t.Errorf("asked Wikivoyage for %q in %q, want France in fr", summaries.gotTitle, summaries.gotLanguage)
	}
}

func TestCountryInfoServiceRefusesUnknownInput(t *testing.T) {
	tests := []struct {
		name     string
		code     string
		language string
		wantErr  error
	}{
		{name: "code outside the globe", code: "ZZ", language: "en", wantErr: ErrCountryNotFound},
		{name: "language without Wikivoyage edition", code: "FR", language: "de", wantErr: ErrUnsupportedLanguage},
		{
			name:     "language that would change the host name",
			code:     "FR",
			language: "evil.com/",
			wantErr:  ErrUnsupportedLanguage,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			summaries := &fakeSummaries{}
			service, _ := newTestCountryInfoService(summaries)

			_, err := service.Find(context.Background(), tt.code, tt.language)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Find() error = %v, want %v", err, tt.wantErr)
			}
			if summaries.calls != 0 {
				t.Fatal("Wikivoyage was called")
			}
		})
	}
}

func TestCountryInfoServiceWithoutArticleInTheLanguage(t *testing.T) {
	summaries := &fakeSummaries{summary: franceSummary}
	service, _ := newTestCountryInfoService(summaries)

	info, err := service.Find(context.Background(), "TV", "fr")

	if err != nil {
		t.Fatalf("Find() error = %v", err)
	}
	// A language without French name keeps its English one.
	if info.Languages[0].Name != "Tuvaluan" {
		t.Errorf("language = %+v, want its English name", info.Languages[0])
	}
	// Missing, not the English article instead; the facts are still there.
	if info.Summary.Status != SummaryMissing || summaries.calls != 0 || len(info.Currencies) != 2 {
		t.Fatalf("info = %+v after %d calls, want facts and a missing summary, Wikivoyage left alone", info,
			summaries.calls)
	}
}

func TestCountryInfoServiceCachesSummaries(t *testing.T) {
	summaries := &fakeSummaries{summary: franceSummary}
	service, advance := newTestCountryInfoService(summaries)

	findFrance(t, service)
	advance(testTTL - time.Minute)
	findFrance(t, service)
	if summaries.calls != 1 {
		t.Fatalf("calls = %d within the cache time, want 1", summaries.calls)
	}

	advance(2 * time.Minute)
	findFrance(t, service)
	if summaries.calls != 2 {
		t.Fatalf("calls = %d once expired, want 2", summaries.calls)
	}
}

func TestCountryInfoServiceServesStaleSummariesWhenWikivoyageFails(t *testing.T) {
	summaries := &fakeSummaries{summary: franceSummary}
	service, advance := newTestCountryInfoService(summaries)
	findFrance(t, service)

	summaries.err = errors.New("connection reset")
	advance(testTTL + time.Hour)
	if info := findFrance(t, service); info.Summary.Status != SummaryAvailable {
		t.Fatalf("summary = %+v, want the expired one", info.Summary)
	}

	advance(testStaleTTL)
	info := findFrance(t, service)
	if info.Summary.Status != SummaryUnavailable || info.Currencies[0] != "EUR" {
		t.Fatalf("info = %+v, want an unavailable summary, the facts still there", info)
	}
}

func TestCountryInfoServiceWaitsAfterRateLimit(t *testing.T) {
	summaries := &fakeSummaries{err: &external.RateLimitedError{RetryAfter: time.Minute}}
	service, advance := newTestCountryInfoService(summaries)

	if info := findFrance(t, service); info.Summary.Status != SummaryUnavailable {
		t.Fatalf("summary = %+v after a 429, want unavailable", info.Summary)
	}
	findFrance(t, service)
	if summaries.calls != 1 {
		t.Fatalf("calls = %d during Retry-After, want 1", summaries.calls)
	}

	advance(2 * time.Minute)
	findFrance(t, service)
	if summaries.calls != 2 {
		t.Fatalf("calls = %d after Retry-After, want 2", summaries.calls)
	}
}

func TestCountryInfoServiceKeepsNoArticleAnswers(t *testing.T) {
	summaries := &fakeSummaries{err: external.ErrNotFound}
	service, _ := newTestCountryInfoService(summaries)

	for range 2 {
		if info := findFrance(t, service); info.Summary.Status != SummaryMissing {
			t.Fatalf("summary = %+v, want missing", info.Summary)
		}
	}
	if summaries.calls != 1 {
		t.Fatalf("calls = %d, want 1: \"no article\" is cached too", summaries.calls)
	}
}
