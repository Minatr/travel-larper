package views

import (
	"encoding/json"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/services"
)

func TestNewCountryInfo(t *testing.T) {
	tests := []struct {
		name string
		info services.CountryInfo
		want string
	}{
		{
			name: "summary available",
			info: services.CountryInfo{
				Code:       "FR",
				Currencies: []string{"EUR"},
				Languages:  []services.CountryLanguage{{Code: "fr", Name: "French"}},
				Summary:    services.CountrySummary{Status: services.SummaryAvailable, Text: "La France", URL: "u"},
			},
			want: `{"code":"FR","currencies":["EUR"],"languages":[{"code":"fr","name":"French"}],` +
				`"summary":{"status":"available","text":"La France","url":"u"}}`,
		},
		{
			// No null in the JSON, and no text outside an available summary.
			name: "summary missing, no facts",
			info: services.CountryInfo{
				Code:    "XK",
				Summary: services.CountrySummary{Status: services.SummaryMissing, Text: "ignored"},
			},
			want: `{"code":"XK","currencies":[],"languages":[],"summary":{"status":"missing"}}`,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw, err := json.Marshal(NewCountryInfo(tt.info))
			if err != nil {
				t.Fatalf("marshal: %v", err)
			}
			if string(raw) != tt.want {
				t.Fatalf("JSON = %s, want %s", raw, tt.want)
			}
		})
	}
}
