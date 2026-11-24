package config

import (
	"errors"
	"testing"
	"time"
)

func withFixedSettings(config Config) Config {
	config.Argon2 = defaultArgon2Params()
	config.MaxConcurrentPasswordHashes = maxConcurrentPasswordHashes
	config.MaxTrackedLoginAccounts = maxTrackedLoginAccounts
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
			want: withFixedSettings(
				Config{
					DatabaseURL:                    "postgres://db",
					APIPort:                        "8080",
					RateLimitPerMinute:             100,
					MaxBodyBytes:                   1 << 20,
					RegisterRateLimitPerHour:       10,
					LoginRateLimitPerMinute:        5,
					LoginFailuresPerAccountPerHour: 10,
					SessionIdleTimeout:             14 * 24 * time.Hour,
				},
			),
		},
		{
			name: "every setting",
			env: map[string]string{
				"DATABASE_URL":                        "postgres://db",
				"API_PORT":                            "9000",
				"APP_ENV":                             "production",
				"RATE_LIMIT_PER_MINUTE":               "60",
				"MAX_BODY_BYTES":                      "2048",
				"REGISTER_RATE_LIMIT_PER_HOUR":        "5",
				"LOGIN_RATE_LIMIT_PER_MINUTE":         "3",
				"LOGIN_FAILURES_PER_ACCOUNT_PER_HOUR": "20",
				"SESSION_IDLE_TIMEOUT_HOURS":          "24",
			},
			want: withFixedSettings(
				Config{
					DatabaseURL:                    "postgres://db",
					APIPort:                        "9000",
					Production:                     true,
					RateLimitPerMinute:             60,
					MaxBodyBytes:                   2048,
					RegisterRateLimitPerHour:       5,
					LoginRateLimitPerMinute:        3,
					LoginFailuresPerAccountPerHour: 20,
					SessionIdleTimeout:             24 * time.Hour,
				},
			),
		},
		{
			name:    "invalid rate limit",
			env:     map[string]string{"DATABASE_URL": "postgres://db", "RATE_LIMIT_PER_MINUTE": "many"},
			wantErr: true,
		},
		{
			name:    "zero body size",
			env:     map[string]string{"DATABASE_URL": "postgres://db", "MAX_BODY_BYTES": "0"},
			wantErr: true,
		},
		{
			name:    "negative register rate limit",
			env:     map[string]string{"DATABASE_URL": "postgres://db", "REGISTER_RATE_LIMIT_PER_HOUR": "-1"},
			wantErr: true,
		},
		{
			name:    "zero login failures per account",
			env:     map[string]string{"DATABASE_URL": "postgres://db", "LOGIN_FAILURES_PER_ACCOUNT_PER_HOUR": "0"},
			wantErr: true,
		},
		{
			name:    "zero session timeout",
			env:     map[string]string{"DATABASE_URL": "postgres://db", "SESSION_IDLE_TIMEOUT_HOURS": "0"},
			wantErr: true,
		},
		{
			name:    "unknown environment",
			env:     map[string]string{"DATABASE_URL": "postgres://db", "APP_ENV": "prod"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, name := range []string{
				"DATABASE_URL",
				"API_PORT",
				"APP_ENV",
				"RATE_LIMIT_PER_MINUTE",
				"MAX_BODY_BYTES",
				"REGISTER_RATE_LIMIT_PER_HOUR",
				"LOGIN_RATE_LIMIT_PER_MINUTE",
				"LOGIN_FAILURES_PER_ACCOUNT_PER_HOUR",
				"SESSION_IDLE_TIMEOUT_HOURS",
			} {
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
