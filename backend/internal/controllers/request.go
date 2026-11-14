package controllers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/Minatr/travel-larper/backend/internal/api"
)

var errTrailingData = errors.New("data after the JSON body")

// decodeJSONBody reads the request body into target and returns the error
// code to answer with when it cannot.
func decodeJSONBody(r *http.Request, target any) (api.ErrorCode, bool) {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	err := decoder.Decode(target)
	if err == nil {
		err = rejectTrailingData(decoder)
	}
	if err == nil {
		return "", true
	}
	// Set by the MaxBodySize middleware when the body has no Content-Length.
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return api.ErrorCodeRequestTooLarge, false
	}
	return api.ErrorCodeInvalidBody, false
}

// rejectTrailingData fails when the body holds more than one JSON value:
// Decode stops after the first one and would silently ignore the rest.
func rejectTrailingData(decoder *json.Decoder) error {
	err := decoder.Decode(&struct{}{})
	switch {
	case errors.Is(err, io.EOF):
		return nil
	case err != nil:
		return err
	default:
		return errTrailingData
	}
}
