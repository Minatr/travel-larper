package services

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"unicode/utf8"
)

const (
	// emailMaxLength is the longest address SMTP accepts (RFC 5321).
	emailMaxLength = 254
	// Same bounds as RegisterRequest.password in openapi.yaml.
	passwordMinLength = 8
	passwordMaxLength = 128
)

// UserInserter stores a new pending user and reports false when the email
// is already taken.
type UserInserter interface {
	InsertUser(ctx context.Context, email, passwordHash string) (bool, error)
}

// Hasher turns a password into a hash safe to store.
type Hasher interface {
	Hash(password string) (string, error)
}

// RegistrationService creates user accounts, pending until an admin
// approves them.
type RegistrationService struct {
	users  UserInserter
	hasher Hasher
}

// NewRegistrationService creates a RegistrationService.
func NewRegistrationService(users UserInserter, hasher Hasher) *RegistrationService {
	return &RegistrationService{users: users, hasher: hasher}
}

// Register validates the credentials and creates a pending account.
func (s *RegistrationService) Register(ctx context.Context, email, password string) error {
	email, err := normalizeEmail(email)
	if err != nil {
		return err
	}
	if err := checkPassword(password); err != nil {
		return err
	}

	hash, err := s.hasher.Hash(password)
	if err != nil {
		return fmt.Errorf("register: %w", err)
	}
	created, err := s.users.InsertUser(ctx, email, hash)
	if err != nil {
		return fmt.Errorf("register: %w", err)
	}
	if !created {
		return ErrEmailTaken
	}
	return nil
}

// normalizeEmail accepts a bare address only: "Bob <bob@example.com>" is
// valid for net/mail but not as an account email.
func normalizeEmail(raw string) (string, error) {
	email := strings.TrimSpace(raw)
	if len(email) > emailMaxLength {
		return "", ErrInvalidEmail
	}
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		return "", ErrInvalidEmail
	}
	return email, nil
}

func checkPassword(password string) error {
	length := utf8.RuneCountInString(password)
	switch {
	case length < passwordMinLength:
		return ErrPasswordTooShort
	case length > passwordMaxLength:
		return ErrPasswordTooLong
	default:
		return nil
	}
}
