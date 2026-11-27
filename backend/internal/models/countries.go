package models

import (
	// Embeds the list of countries in the binary: no file to ship next to it.
	_ "embed"
	"encoding/json"
	"fmt"
)

// countries.json is written by `make country-data` (frontend/scripts/build-country-data.mjs) and versioned: these
// facts change rarely, and REST Countries' free plan could not answer every page view.
//
//go:embed countries.json
var countriesJSON []byte

// Country is what the app keeps of a country: its currencies (ISO 4217), its languages, and the title of its
// Wikivoyage article by language code, empty when there is none.
type Country struct {
	Currencies []string          `json:"currencies"`
	Languages  []Language        `json:"languages"`
	Wikivoyage map[string]string `json:"wikivoyage"`
}

// Language is a language spoken in a country: its BCP 47 code, and its name by language code (en, fr), for when
// browsers do not know it.
type Language struct {
	Code  string            `json:"code"`
	Names map[string]string `json:"names"`
}

// CountryCatalog lists the countries of the globe.
type CountryCatalog struct {
	countries map[string]Country
}

// LoadCountryCatalog reads the list embedded at build time.
func LoadCountryCatalog() (*CountryCatalog, error) {
	// A null title (no article) becomes an empty string.
	var countries map[string]Country
	if err := json.Unmarshal(countriesJSON, &countries); err != nil {
		return nil, fmt.Errorf("load country catalog: %w", err)
	}
	return &CountryCatalog{countries: countries}, nil
}

// Country returns the country `code` (ISO 3166-1 alpha-2, upper case), and false for a code outside the globe's
// countries.
func (c *CountryCatalog) Country(code string) (Country, bool) {
	country, ok := c.countries[code]
	return country, ok
}
