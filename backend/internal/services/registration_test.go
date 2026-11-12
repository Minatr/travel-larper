package services

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type fakeUserInserter struct {
	taken         bool
	err           error
	insertedEmail string
	insertedHash  string
}

func (f *fakeUserInserter) InsertUser(_ context.Context, email, passwordHash string) (bool, error) {
	f.insertedEmail, f.insertedHash = email, passwordHash
	return !f.taken, f.err
}

type fakeHasher struct {
	err error
}

func (h fakeHasher) Hash(password string) (string, error) {
	return "hashed:" + password, h.err
}

func TestRegistrationServiceRegister(t *testing.T) {
	errDatabase := errors.New("connection reset")
	errHash := errors.New("no entropy")

	tests := []struct {
		name      string
		email     string
		password  string
		users     fakeUserInserter
		hashErr   error
		wantErr   error
		wantEmail string
	}{
		{name: "nominal", email: "bob@example.com", password: "12345678", wantEmail: "bob@example.com"},
		{name: "surrounding spaces trimmed", email: "  bob@example.com ", password: "12345678", wantEmail: "bob@example.com"},
		{name: "longest password", email: "bob@example.com", password: strings.Repeat("a", 128), wantEmail: "bob@example.com"},
		{name: "emojis count as one character", email: "bob@example.com", password: strings.Repeat("🙂", 8), wantEmail: "bob@example.com"},
		{name: "not an email", email: "bob", password: "12345678", wantErr: ErrInvalidEmail},
		{name: "email with a display name", email: "Bob <bob@example.com>", password: "12345678", wantErr: ErrInvalidEmail},
		{name: "email too long", email: strings.Repeat("a", 243) + "@example.com", password: "12345678", wantErr: ErrInvalidEmail},
		{name: "password too short", email: "bob@example.com", password: "1234567", wantErr: ErrPasswordTooShort},
		{name: "password too long", email: "bob@example.com", password: strings.Repeat("a", 129), wantErr: ErrPasswordTooLong},
		{name: "email taken", email: "bob@example.com", password: "12345678", users: fakeUserInserter{taken: true}, wantErr: ErrEmailTaken, wantEmail: "bob@example.com"},
		{name: "database failure", email: "bob@example.com", password: "12345678", users: fakeUserInserter{err: errDatabase}, wantErr: errDatabase, wantEmail: "bob@example.com"},
		{name: "hash failure", email: "bob@example.com", password: "12345678", hashErr: errHash, wantErr: errHash},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			users := tt.users
			service := NewRegistrationService(&users, fakeHasher{err: tt.hashErr})

			err := service.Register(context.Background(), tt.email, tt.password)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Register() error = %v, want %v", err, tt.wantErr)
			}
			if users.insertedEmail != tt.wantEmail {
				t.Fatalf("inserted email = %q, want %q", users.insertedEmail, tt.wantEmail)
			}
			if tt.wantEmail != "" && users.insertedHash != "hashed:"+tt.password {
				t.Fatalf("inserted hash = %q, want the hashed password", users.insertedHash)
			}
		})
	}
}
