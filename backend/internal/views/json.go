// Package views builds the JSON responses sent to the client.
package views

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// WriteJSON writes body as a JSON response with the given status code.
func WriteJSON(w http.ResponseWriter, logger *slog.Logger, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		// Headers are already sent, so logging is all that is left to do.
		logger.Error("write json response", "error", err)
	}
}
