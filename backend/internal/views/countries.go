package views

import (
	"github.com/Minatr/travel-larper/backend/internal/api"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

// NewCountryInfo builds the public view of a country's fact sheet.
func NewCountryInfo(info services.CountryInfo) api.CountryInfo {
	summary := api.CountrySummary{Status: api.CountrySummaryStatus(info.Summary.Status)}
	if info.Summary.Status == services.SummaryAvailable {
		summary.Text = &info.Summary.Text
		summary.Url = &info.Summary.URL
	}
	return api.CountryInfo{
		Code: info.Code,
		// Never null in the JSON: an empty list stays a list.
		Currencies: nonNil(info.Currencies),
		Languages:  newLanguages(info.Languages),
		Summary:    summary,
	}
}

func newLanguages(languages []services.CountryLanguage) []api.CountryLanguage {
	result := make([]api.CountryLanguage, 0, len(languages))
	for _, language := range languages {
		result = append(result, api.CountryLanguage{Code: language.Code, Name: language.Name})
	}
	return result
}

func nonNil(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}
