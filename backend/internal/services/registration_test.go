package services

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/models"
)

type fakeUserInserter struct {
	taken    bool
	err      error
	inserted models.CreateUserParams
}

func (f *fakeUserInserter) InsertUser(_ context.Context, user models.CreateUserParams) (bool, error) {
	f.inserted = user
	return !f.taken, f.err
}

type fakeHasher struct {
	err error
}

func (h fakeHasher) Hash(_ context.Context, password string) (string, error) {
	return "hashed:" + password, h.err
}

func TestRegistrationServiceRegister(t *testing.T) {
	errDatabase := errors.New("connection reset")
	errHash := errors.New("no entropy")

	tests := []struct {
		name        string
		displayName string // Bob when empty
		wantName    string // displayName when empty
		email       string
		password    string
		users       fakeUserInserter
		hashErr     error
		wantErr     error
		wantEmail   string
	}{
		{name: "nominal", email: "bob@example.com", password: "12345678", wantEmail: "bob@example.com"},
		{
			name:      "surrounding spaces trimmed",
			email:     "  bob@example.com ",
			password:  "12345678",
			wantEmail: "bob@example.com",
		},
		{
			name:      "longest password",
			email:     "bob@example.com",
			password:  strings.Repeat("a", 128),
			wantEmail: "bob@example.com",
		},
		{
			name:      "emojis count as one character",
			email:     "bob@example.com",
			password:  strings.Repeat("🙂", 8),
			wantEmail: "bob@example.com",
		},
		{name: "not an email", email: "bob", password: "12345678", wantErr: ErrInvalidEmail},
		{
			name:     "email with a display name",
			email:    "Bob <bob@example.com>",
			password: "12345678",
			wantErr:  ErrInvalidEmail,
		},
		{
			name:     "email too long",
			email:    strings.Repeat("a", 243) + "@example.com",
			password: "12345678",
			wantErr:  ErrInvalidEmail,
		},
		{name: "password too short", email: "bob@example.com", password: "1234567", wantErr: ErrPasswordTooShort},
		{
			name:     "password too long",
			email:    "bob@example.com",
			password: strings.Repeat("a", 129),
			wantErr:  ErrPasswordTooLong,
		},
		{
			name:      "email taken",
			email:     "bob@example.com",
			password:  "12345678",
			users:     fakeUserInserter{taken: true},
			wantErr:   ErrEmailTaken,
			wantEmail: "bob@example.com",
		},
		{
			name:      "database failure",
			email:     "bob@example.com",
			password:  "12345678",
			users:     fakeUserInserter{err: errDatabase},
			wantErr:   errDatabase,
			wantEmail: "bob@example.com",
		},
		{name: "hash failure", email: "bob@example.com", password: "12345678", hashErr: errHash, wantErr: errHash},
		{
			name:        "name trimmed",
			displayName: "  Léa ",
			wantName:    "Léa",
			email:       "bob@example.com",
			password:    "12345678",
			wantEmail:   "bob@example.com",
		},
		{
			name:        "longest name, emojis count as one character",
			displayName: strings.Repeat("🙂", 30),
			email:       "bob@example.com",
			password:    "12345678",
			wantEmail:   "bob@example.com",
		},
		{
			name:        "name too short",
			displayName: " B ",
			email:       "bob@example.com",
			password:    "12345678",
			wantErr:     ErrInvalidDisplayName,
		},
		{
			name:        "name too long",
			displayName: strings.Repeat("a", 31),
			email:       "bob@example.com",
			password:    "12345678",
			wantErr:     ErrInvalidDisplayName,
		},
		{
			name:        "name with a line break",
			displayName: "Bob\nAdmin",
			email:       "bob@example.com",
			password:    "12345678",
			wantErr:     ErrInvalidDisplayName,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			users := tt.users
			service := NewRegistrationService(&users, fakeHasher{err: tt.hashErr})

			displayName := tt.displayName
			if displayName == "" {
				displayName = "Bob"
			}
			account := NewAccount{DisplayName: displayName, Email: tt.email, Password: tt.password}

			err := service.Register(context.Background(), account)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Register() error = %v, want %v", err, tt.wantErr)
			}
			if users.inserted.Email != tt.wantEmail {
				t.Fatalf("inserted email = %q, want %q", users.inserted.Email, tt.wantEmail)
			}
			if tt.wantEmail == "" {
				return
			}
			if users.inserted.PasswordHash != "hashed:"+tt.password {
				t.Fatalf("inserted hash = %q, want the hashed password", users.inserted.PasswordHash)
			}
			wantName := tt.wantName
			if wantName == "" {
				wantName = displayName
			}
			if users.inserted.DisplayName != wantName {
				t.Fatalf("inserted name = %q, want %q", users.inserted.DisplayName, wantName)
			}
		})
	}
}
