package services

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/Minatr/travel-larper/backend/internal/external"
	"github.com/Minatr/travel-larper/backend/internal/models"
)

// Country fact sheet errors.
var (
	ErrCountryNotFound     = errors.New("country not found")
	ErrUnsupportedLanguage = errors.New("unsupported language")
)

// supportedLanguages are the app's languages, which have a Wikivoyage edition. A language goes into a host name: only
// these reach Wikivoyage.
var supportedLanguages = map[string]bool{"en": true, "fr": true}

// CountryCatalog finds the countries of the globe, their facts and Wikivoyage articles.
type CountryCatalog interface {
	Country(code string) (models.Country, bool)
}

// SummarySource gives the summary of a Wikivoyage article.
type SummarySource interface {
	Summary(ctx context.Context, language, title string) (external.Summary, error)
}

// SummaryStatus tells whether a country's summary could be shown.
type SummaryStatus string

// Summary statuses: missing means Wikivoyage has no article in that language; unavailable, that it could not be
// reached and nothing was cached.
const (
	SummaryAvailable   SummaryStatus = "available"
	SummaryMissing     SummaryStatus = "missing"
	SummaryUnavailable SummaryStatus = "unavailable"
)

// CountryInfo is what the fact sheet of a country shows: its currencies (ISO 4217) and languages, always known, and
// its summary, which can be missing.
type CountryInfo struct {
	Code       string
	Currencies []string
	Languages  []CountryLanguage
	Summary    CountrySummary
}

// CountryLanguage is a language spoken in a country: its BCP 47 code and its name in the language asked for.
type CountryLanguage struct {
	Code string
	Name string
}

// CountrySummary is the first paragraph of a country's Wikivoyage article.
type CountrySummary struct {
	Status SummaryStatus
	Text   string
	URL    string
}

// summaryAnswer is a cached Wikivoyage answer: "no article" is an answer too, kept like the others.
type summaryAnswer struct {
	found   bool
	summary external.Summary
}

// CountryInfoService gathers a country's fact sheet: its facts from the versioned list, its summary from Wikivoyage
// through a cache.
type CountryInfoService struct {
	catalog      CountryCatalog
	summaries    SummarySource
	logger       *slog.Logger
	summaryCache *sourceCache[summaryAnswer]
}

// NewCountryInfoService creates a CountryInfoService. Summaries are fresh for ttl, and still served up to staleTTL
// when Wikivoyage fails.
func NewCountryInfoService(
	catalog CountryCatalog,
	summaries SummarySource,
	ttl, staleTTL time.Duration,
	logger *slog.Logger,
) *CountryInfoService {
	return &CountryInfoService{
		catalog:      catalog,
		summaries:    summaries,
		logger:       logger,
		summaryCache: newSourceCache[summaryAnswer](ttl, staleTTL, time.Now),
	}
}

// Find returns the fact sheet of the country `code` (ISO 3166-1 alpha-2, upper case), its summary in `language`.
// Wikivoyage failing leaves the summary unavailable rather than failing the whole sheet.
func (s *CountryInfoService) Find(ctx context.Context, code, language string) (CountryInfo, error) {
	if !supportedLanguages[language] {
		return CountryInfo{}, ErrUnsupportedLanguage
	}
	country, ok := s.catalog.Country(code)
	if !ok {
		return CountryInfo{}, ErrCountryNotFound
	}
	return CountryInfo{
		Code:       code,
		Currencies: country.Currencies,
		Languages:  languagesIn(country.Languages, language),
		Summary:    s.findSummary(ctx, code, language, country.Wikivoyage[language]),
	}, nil
}

// languagesIn names each language in `language`, or in English when the list has no such name.
func languagesIn(languages []models.Language, language string) []CountryLanguage {
	named := make([]CountryLanguage, 0, len(languages))
	for _, spoken := range languages {
		name := spoken.Names[language]
		if name == "" {
			name = spoken.Names["en"]
		}
		named = append(named, CountryLanguage{Code: spoken.Code, Name: name})
	}
	return named
}

func (s *CountryInfoService) findSummary(ctx context.Context, code, language, title string) CountrySummary {
	// No article in this language: said as is, without falling back to another language.
	if title == "" {
		return CountrySummary{Status: SummaryMissing}
	}
	answer, err := s.summaryCache.get(ctx, language+":"+code, func(ctx context.Context) (summaryAnswer, error) {
		summary, err := s.summaries.Summary(ctx, language, title)
		if errors.Is(err, external.ErrNotFound) {
			return summaryAnswer{found: false}, nil
		}
		if err != nil {
			s.logger.Error("fetch country summary", "code", code, "language", language, "error", err)
			return summaryAnswer{}, err
		}
		return summaryAnswer{found: true, summary: summary}, nil
	})
	switch {
	case err != nil:
		return CountrySummary{Status: SummaryUnavailable}
	case !answer.found:
		return CountrySummary{Status: SummaryMissing}
	default:
		return CountrySummary{Status: SummaryAvailable, Text: answer.summary.Text, URL: answer.summary.URL}
	}
}
