// Package config reads the application settings from environment variables.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

const (
	defaultAPIPort            = "8080"
	defaultRateLimitPerMinute = 100
	defaultMaxBodyBytes       = 1 << 20
	productionEnvironment     = "production"

	readHeaderTimeout = 5 * time.Second
	writeTimeout      = 15 * time.Second
	idleTimeout       = 60 * time.Second
	shutdownTimeout   = 10 * time.Second
)

// ErrMissingDatabaseURL is returned when DATABASE_URL is not set.
var ErrMissingDatabaseURL = errors.New("DATABASE_URL is not set")

// Config holds the settings the server needs to start.
type Config struct {
	DatabaseURL        string
	APIPort            string
	Production         bool
	RateLimitPerMinute int
	MaxBodyBytes       int64
	ReadHeaderTimeout  time.Duration
	WriteTimeout       time.Duration
	IdleTimeout        time.Duration
	ShutdownTimeout    time.Duration
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

	rateLimit, err := positiveInt("RATE_LIMIT_PER_MINUTE", defaultRateLimitPerMinute)
	if err != nil {
		return Config{}, err
	}
	maxBodyBytes, err := positiveInt("MAX_BODY_BYTES", defaultMaxBodyBytes)
	if err != nil {
		return Config{}, err
	}

	return Config{
		DatabaseURL:        databaseURL,
		APIPort:            apiPort,
		Production:         os.Getenv("APP_ENV") == productionEnvironment,
		RateLimitPerMinute: rateLimit,
		MaxBodyBytes:       int64(maxBodyBytes),
		ReadHeaderTimeout:  readHeaderTimeout,
		WriteTimeout:       writeTimeout,
		IdleTimeout:        idleTimeout,
		ShutdownTimeout:    shutdownTimeout,
	}, nil
}

func positiveInt(name string, defaultValue int) (int, error) {
	raw := os.Getenv(name)
	if raw == "" {
		return defaultValue, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer, got %q", name, raw)
	}
	return value, nil
}
