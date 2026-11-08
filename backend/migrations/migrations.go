// Package migrations embeds the SQL migrations into the server binary.
package migrations

import "embed"

// FS holds the migration files, read by goose at startup.
//
//go:embed *.sql
var FS embed.FS
