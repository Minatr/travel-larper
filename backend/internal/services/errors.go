package services

import "errors"

// ErrDatabaseUnavailable is returned when the database cannot be reached.
var ErrDatabaseUnavailable = errors.New("database unavailable")

// ErrMalformedPasswordHash is returned when a stored hash cannot be parsed.
var ErrMalformedPasswordHash = errors.New("malformed password hash")

// Registration errors, each shown to the user with its own message.
var (
	ErrInvalidEmail     = errors.New("invalid email")
	ErrPasswordTooShort = errors.New("password too short")
	ErrPasswordTooLong  = errors.New("password too long")
	ErrEmailTaken       = errors.New("email already taken")
)
