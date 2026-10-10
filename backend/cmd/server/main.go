// Command server starts the Travel Larper API.
//
// Startup sequence: read the configuration, open the database pool, wire the
// layers together (service -> controller -> routes), then serve HTTP until
// the process receives Ctrl+C or SIGTERM (sent by `docker compose stop`).
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
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Minatr/travel-larper/backend/internal/config"
	"github.com/Minatr/travel-larper/backend/internal/controllers"
	"github.com/Minatr/travel-larper/backend/internal/db"
	"github.com/Minatr/travel-larper/backend/internal/router"
	"github.com/Minatr/travel-larper/backend/internal/services"
)

const (
	// readHeaderTimeout protects against clients that open a connection and
	// send headers very slowly (Slowloris).
	readHeaderTimeout = 5 * time.Second
	// shutdownTimeout lets in-flight requests finish when the server stops.
	shutdownTimeout = 10 * time.Second
)

func main() {
	// Logs go to stdout so Docker collects them (`docker compose logs`).
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

// run starts the server and blocks until it stops. It returns an error
// instead of exiting so that deferred cleanups (closing the pool) still run.
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

	server := &http.Server{
		Addr:              net.JoinHostPort("", cfg.APIPort),
		Handler:           buildHandler(pool, logger),
		ReadHeaderTimeout: readHeaderTimeout,
	}

	// ListenAndServe blocks, so it runs in its own goroutine while this one
	// waits for either a server failure or a stop signal. The channel is
	// buffered so the goroutine never blocks if nobody reads its error.
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

	// Graceful shutdown: stop accepting connections and wait for in-flight
	// requests. A fresh context is needed because ctx is already cancelled.
	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}

// buildHandler wires the application layers together: each service receives
// its dependencies, each controller its service, and the router the
// controllers. Go has no dependency-injection container, so this explicit
// wiring at the entry point (the "composition root") is the usual approach.
func buildHandler(pool *pgxpool.Pool, logger *slog.Logger) http.Handler {
	healthService := services.NewHealthService(pool)
	healthController := controllers.NewHealthController(healthService, logger)
	return router.Routes(healthController)
}
