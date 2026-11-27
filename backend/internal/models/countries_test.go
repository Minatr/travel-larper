package models_test

import (
	"slices"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/models"
)

func TestCountryCatalog(t *testing.T) {
	catalog, err := models.LoadCountryCatalog()
	if err != nil {
		t.Fatalf("LoadCountryCatalog() error = %v", err)
	}

	france, ok := catalog.Country("FR")
	if !ok || !slices.Contains(france.Currencies, "EUR") || len(france.Languages) == 0 ||
		france.Languages[0].Code != "fr" || france.Languages[0].Names["fr"] == "" {
		t.Fatalf("FR = %+v, %v, want EUR and fr", france, ok)
	}
	if france.Wikivoyage["en"] == "" || france.Wikivoyage["fr"] == "" {
		t.Fatalf("FR articles = %v, want both", france.Wikivoyage)
	}
	// Found by Wikidata item, not by name: the country, not the US state.
	if georgia, _ := catalog.Country("GE"); georgia.Wikivoyage["en"] == "Georgia" {
		t.Errorf("GE leads to %q, the US state", georgia.Wikivoyage["en"])
	}
	// Antarctica has no map, so no fact sheet either.
	for _, code := range []string{"AQ", "ZZ", "fr"} {
		if _, ok := catalog.Country(code); ok {
			t.Errorf("%s is in the catalog", code)
		}
	}
}
