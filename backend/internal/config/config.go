// Package config reads the application settings from environment variables.
package config

import (
	"errors"
	"os"
)

// defaultAPIPort is used when API_PORT is not set.
const defaultAPIPort = "8080"

// ErrMissingDatabaseURL is returned when DATABASE_URL is not set.
var ErrMissingDatabaseURL = errors.New("DATABASE_URL is not set")

// Config holds the settings the server needs to start.
type Config struct {
	DatabaseURL string
	APIPort     string
}

// Load reads the configuration from the environment.
func Load() (Config, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, ErrMissingDatabaseURL
	}

	apiPort := os.Getenv("API_PORT")
	if apiPort == "" {
		apiPort = defaultAPIPort
	}

	return Config{DatabaseURL: databaseURL, APIPort: apiPort}, nil
}
