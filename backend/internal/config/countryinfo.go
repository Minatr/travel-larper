package config

import "time"

// Settings of the country fact sheet and of the external services it calls.
const (
	// CountryInfoCacheTTL is how long a country's Wikivoyage summary is kept: it changes rarely.
	CountryInfoCacheTTL = 7 * 24 * time.Hour
	// CountryInfoStaleTTL is how long an expired answer is still served when its source fails, rather than nothing.
	CountryInfoStaleTTL = 30 * 24 * time.Hour
	// ExternalRequestTimeout caps one call to an external service, so that a slow source never holds a page.
	ExternalRequestTimeout = 5 * time.Second
	// ExternalMinInterval paces the calls to each external service: one per second at most.
	ExternalMinInterval = time.Second
	// ExternalDefaultBackoff is how long to stop calling a service that answered 429 without Retry-After.
	ExternalDefaultBackoff = time.Minute
	// ExternalUserAgent names the app to the services: Wikimedia blocks requests without a contact.
	ExternalUserAgent = "TravelLarper/1.0 (https://github.com/Minatr/travel-larper)"
)
