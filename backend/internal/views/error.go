package views

import (
	"log/slog"
	"net/http"

	"github.com/Minatr/travel-larper/backend/internal/api"
)

// WriteError writes an error in the shared Error format. The message is fixed
// per code: internal details never reach the client.
func WriteError(w http.ResponseWriter, logger *slog.Logger, code api.ErrorCode) {
	status, message := describeError(code)
	WriteJSON(w, logger, status, api.Error{Code: code, Message: message})
}

func describeError(code api.ErrorCode) (int, string) {
	switch code {
	case api.ErrorCodeInvalidParameter:
		return http.StatusBadRequest, "A request parameter is invalid."
	case api.ErrorCodeNotFound:
		return http.StatusNotFound, "Resource not found."
	case api.ErrorCodeMethodNotAllowed:
		return http.StatusMethodNotAllowed, "Method not allowed on this resource."
	case api.ErrorCodeRequestTooLarge:
		return http.StatusRequestEntityTooLarge, "Request body is too large."
	case api.ErrorCodeRateLimited:
		return http.StatusTooManyRequests, "Too many requests, try again later."
	default:
		return http.StatusInternalServerError, "Internal error."
	}
}
