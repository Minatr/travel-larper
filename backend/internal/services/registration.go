package services

import (
	"context"
	"fmt"
	"net/mail"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/Minatr/travel-larper/backend/internal/models"
)

const (
	// emailMaxLength is the longest address SMTP accepts (RFC 5321).
	emailMaxLength = 254
	// Same bounds as RegisterRequest.password in openapi.yaml.
	passwordMinLength = 8
	passwordMaxLength = 128
	// Same bounds as RegisterRequest.displayName in openapi.yaml.
	displayNameMinLength = 2
	displayNameMaxLength = 30
)

// NewAccount is what a visitor fills in to register.
type NewAccount struct {
	DisplayName string
	Email       string
	Password    string
}

// UserInserter stores a new pending user and reports false when the email is already taken.
type UserInserter interface {
	InsertUser(ctx context.Context, user models.CreateUserParams) (bool, error)
}

// Hasher turns a password into a hash safe to store.
type Hasher interface {
	Hash(ctx context.Context, password string) (string, error)
}

// RegistrationService creates user accounts, pending until an admin approves them.
type RegistrationService struct {
	users  UserInserter
	hasher Hasher
}

// NewRegistrationService creates a RegistrationService.
func NewRegistrationService(users UserInserter, hasher Hasher) *RegistrationService {
	return &RegistrationService{users: users, hasher: hasher}
}

// Register validates the account and creates it, pending.
func (s *RegistrationService) Register(ctx context.Context, account NewAccount) error {
	displayName, err := normalizeDisplayName(account.DisplayName)
	if err != nil {
		return err
	}
	email, err := normalizeEmail(account.Email)
	if err != nil {
		return err
	}
	if err := checkPassword(account.Password); err != nil {
		return err
	}

	hash, err := s.hasher.Hash(ctx, account.Password)
	if err != nil {
		return fmt.Errorf("register: %w", err)
	}
	created, err := s.users.InsertUser(
		ctx,
		models.CreateUserParams{Email: email, PasswordHash: hash, DisplayName: displayName},
	)
	if err != nil {
		return fmt.Errorf("register: %w", err)
	}
	if !created {
		return ErrEmailTaken
	}
	return nil
}

// normalizeDisplayName refuses control characters (line breaks, tabs…): the name is shown to other users.
func normalizeDisplayName(raw string) (string, error) {
	name := strings.TrimSpace(raw)
	length := utf8.RuneCountInString(name)
	if length < displayNameMinLength || length > displayNameMaxLength || strings.ContainsFunc(name, unicode.IsControl) {
		return "", ErrInvalidDisplayName
	}
	return name, nil
}

// normalizeEmail accepts a bare address only: "Bob <bob@example.com>" is valid for net/mail but not as an account
// email.
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
