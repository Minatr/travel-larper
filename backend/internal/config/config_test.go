package config

import (
	"errors"
	"testing"
)

func withTimeouts(config Config) Config {
	config.ReadHeaderTimeout = readHeaderTimeout
	config.WriteTimeout = writeTimeout
	config.IdleTimeout = idleTimeout
	config.ShutdownTimeout = shutdownTimeout
	return config
}

func TestLoad(t *testing.T) {
	tests := []struct {
		name    string
		env     map[string]string
		want    Config
		wantErr bool
	}{
		{
			name: "defaults",
			env:  map[string]string{"DATABASE_URL": "postgres://db"},
			want: withTimeouts(Config{DatabaseURL: "postgres://db", APIPort: "8080", RateLimitPerMinute: 100, MaxBodyBytes: 1 << 20}),
		},
		{
			name: "every setting",
			env: map[string]string{
				"DATABASE_URL": "postgres://db", "API_PORT": "9000", "APP_ENV": "production",
				"RATE_LIMIT_PER_MINUTE": "60", "MAX_BODY_BYTES": "2048",
			},
			want: withTimeouts(Config{DatabaseURL: "postgres://db", APIPort: "9000", Production: true, RateLimitPerMinute: 60, MaxBodyBytes: 2048}),
		},
		{name: "invalid rate limit", env: map[string]string{"DATABASE_URL": "postgres://db", "RATE_LIMIT_PER_MINUTE": "many"}, wantErr: true},
		{name: "zero body size", env: map[string]string{"DATABASE_URL": "postgres://db", "MAX_BODY_BYTES": "0"}, wantErr: true},
		{name: "unknown environment", env: map[string]string{"DATABASE_URL": "postgres://db", "APP_ENV": "prod"}, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, name := range []string{"DATABASE_URL", "API_PORT", "APP_ENV", "RATE_LIMIT_PER_MINUTE", "MAX_BODY_BYTES"} {
				t.Setenv(name, tt.env[name])
			}

			got, err := Load()

			if (err != nil) != tt.wantErr {
				t.Fatalf("error = %v, want error %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Fatalf("config = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestLoadRequiresDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")

	if _, err := Load(); !errors.Is(err, ErrMissingDatabaseURL) {
		t.Fatalf("error = %v, want %v", err, ErrMissingDatabaseURL)
	}
}
