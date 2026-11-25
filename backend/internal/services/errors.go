package services

import "errors"

// ErrDatabaseUnavailable is returned when the database cannot be reached.
var ErrDatabaseUnavailable = errors.New("database unavailable")

// ErrMalformedPasswordHash is returned when a stored hash cannot be parsed.
var ErrMalformedPasswordHash = errors.New("malformed password hash")

// Registration errors, each shown to the user with its own message.
var (
	ErrInvalidDisplayName = errors.New("invalid display name")
	ErrInvalidEmail       = errors.New("invalid email")
	ErrPasswordTooShort   = errors.New("password too short")
	ErrPasswordTooLong    = errors.New("password too long")
	ErrEmailTaken         = errors.New("email already taken")
)

// ErrInvalidCredentials is returned for an unknown email or a wrong
// password
var ErrInvalidCredentials = errors.New("invalid credentials")

// ErrTooManyLoginFailures is returned while an account is blocked after too
// many failed logins.
var ErrTooManyLoginFailures = errors.New("too many login failures")

// ErrInvalidSession is returned for a missing, unknown or expired session.
var ErrInvalidSession = errors.New("invalid session")
