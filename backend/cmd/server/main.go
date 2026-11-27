// Command server starts the Travel Larper API.
//
// Startup sequence: read the configuration, open the database pool, apply the pending migrations (the server stops if
// they fail), wire the layers together (service -> controller -> routes), then serve HTTP until the process receives
// Ctrl+C or SIGTERM (sent by `docker compose stop`).
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Minatr/travel-larper/backend/internal/config"
	"github.com/Minatr/travel-larper/backend/internal/controllers"
	"github.com/Minatr/travel-larper/backend/internal/db"
	"github.com/Minatr/travel-larper/backend/internal/external"
	"github.com/Minatr/travel-larper/backend/internal/models"
	"github.com/Minatr/travel-larper/backend/internal/router"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

func main() {
	// Logs go to stdout so Docker collects them (`docker compose logs`).
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

// run starts the server and blocks until it stops. It returns an error instead of exiting so that deferred cleanups
// (closing the pool) still run.
func run(logger *slog.Logger) error {
	// ctx is cancelled on Ctrl+C or SIGTERM, which triggers the shutdown below.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, logger); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}

	handler, err := buildHandler(pool, logger, cfg)
	if err != nil {
		return err
	}
	server := &http.Server{
		Addr:              net.JoinHostPort("", cfg.APIPort),
		Handler:           handler,
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	// ListenAndServe blocks, so it runs in its own goroutine while this one waits for either a server failure or a stop
	// signal. The channel is buffered so the goroutine never blocks if nobody reads its error.
	serverErr := make(chan error, 1)
	go func() {
		logger.Info("server listening", "addr", server.Addr)
		serverErr <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		return fmt.Errorf("listen: %w", err)
	case <-ctx.Done():
	}

	// Graceful shutdown: stop accepting connections and wait for in-flight requests. A fresh context is needed because
	// ctx is already cancelled.
	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}

// buildHandler wires the application layers together: each service receives its dependencies, each controller its
// service, and the router the controllers. Go has no dependency-injection container
func buildHandler(pool *pgxpool.Pool, logger *slog.Logger, cfg config.Config) (http.Handler, error) {
	healthService := services.NewHealthService(pool)
	healthController := controllers.NewHealthController(healthService, logger)

	queries := models.New(pool)
	passwordHasher := services.NewPasswordHasher(cfg.Argon2, cfg.MaxConcurrentPasswordHashes)
	registrationService := services.NewRegistrationService(queries, passwordHasher)
	registrationController := controllers.NewRegistrationController(registrationService, logger)

	loginAttempts := services.NewLoginAttempts(
		cfg.LoginFailuresPerAccountPerHour, config.LoginFailureWindow, cfg.MaxTrackedLoginAccounts,
	)
	sessionService := services.NewSessionService(queries, passwordHasher, loginAttempts, cfg.SessionIdleTimeout)
	sessionController := controllers.NewSessionController(sessionService, cfg.Production, logger)

	countryController, err := buildCountryController(logger)
	if err != nil {
		return nil, err
	}

	handlers := router.Controllers{
		HealthController:       healthController,
		RegistrationController: registrationController,
		SessionController:      sessionController,
		CountryController:      countryController,
	}
	return router.Routes(handlers, sessionService, logger, router.Options{
		RateLimitPerMinute:       cfg.RateLimitPerMinute,
		MaxBodyBytes:             cfg.MaxBodyBytes,
		HSTS:                     cfg.Production,
		SecureCookies:            cfg.Production,
		RegisterRateLimitPerHour: cfg.RegisterRateLimitPerHour,
		LoginRateLimitPerMinute:  cfg.LoginRateLimitPerMinute,
	}), nil
}

// buildCountryController wires the country fact sheet: its list of countries and Wikivoyage.
func buildCountryController(logger *slog.Logger) (*controllers.CountryController, error) {
	catalog, err := models.LoadCountryCatalog()
	if err != nil {
		return nil, err
	}
	options := external.Options{
		Timeout:        config.ExternalRequestTimeout,
		MinInterval:    config.ExternalMinInterval,
		DefaultBackoff: config.ExternalDefaultBackoff,
		UserAgent:      config.ExternalUserAgent,
	}
	countryInfoService := services.NewCountryInfoService(
		catalog,
		external.NewWikivoyage(external.WikivoyageURL, options),
		config.CountryInfoCacheTTL,
		config.CountryInfoStaleTTL,
		logger,
	)
	return controllers.NewCountryController(countryInfoService, logger), nil
}
