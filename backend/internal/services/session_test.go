package services

import (
	"bytes"
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Minatr/travel-larper/backend/internal/models"
)

const testIdleTimeout = 14 * 24 * time.Hour

var testNow = time.Date(2026, 11, 14, 12, 0, 0, 0, time.UTC)

type fakeSessionStore struct {
	user        models.User
	userFound   bool
	sessionRow  models.GetSessionUserRow
	sessionOK   bool
	err         error
	searched    string
	created     *models.CreateSessionParams
	extended    *models.ExtendSessionParams
	deleted     []byte
	cleanedUp   bool
	deleteCalls int
}

func (s *fakeSessionStore) FindUserByEmail(_ context.Context, email string) (models.User, bool, error) {
	s.searched = email
	return s.user, s.userFound, s.err
}

func (s *fakeSessionStore) CreateSession(_ context.Context, arg models.CreateSessionParams) error {
	s.created = &arg
	return nil
}

func (s *fakeSessionStore) FindSessionUser(_ context.Context, _ []byte) (models.GetSessionUserRow, bool, error) {
	return s.sessionRow, s.sessionOK, s.err
}

func (s *fakeSessionStore) ExtendSession(_ context.Context, arg models.ExtendSessionParams) error {
	s.extended = &arg
	return nil
}

func (s *fakeSessionStore) DeleteSession(_ context.Context, tokenHash []byte) error {
	s.deleted = tokenHash
	s.deleteCalls++
	return s.err
}

func (s *fakeSessionStore) DeleteExpiredSessions(context.Context) error {
	s.cleanedUp = true
	return nil
}

type fakeVerifier struct {
	matches   bool
	err       error
	verified  bool
	simulated bool
}

func (v *fakeVerifier) Verify(context.Context, string, string) (bool, error) {
	v.verified = true
	return v.matches, v.err
}

func (v *fakeVerifier) SimulateVerify(context.Context, string) error {
	v.simulated = true
	return v.err
}

const testMaxLoginFailures = 3

func newTestSessionService(store SessionStore, verifier PasswordVerifier) *SessionService {
	return newTestSessionServiceWith(store, verifier, NewLoginAttempts(testMaxLoginFailures, time.Hour, 100))
}

func newTestSessionServiceWith(store SessionStore, verifier PasswordVerifier, attempts *LoginAttempts) *SessionService {
	service := NewSessionService(store, verifier, attempts, testIdleTimeout)
	service.now = func() time.Time { return testNow }
	return service
}

func TestSessionServiceLogin(t *testing.T) {
	user := models.User{
		ID:           uuid.New(),
		Email:        "bob@example.com",
		DisplayName:  "Bob",
		PasswordHash: "hash",
		Status:       "pending",
	}
	errDatabase := errors.New("connection reset")

	tests := []struct {
		name          string
		previousToken string
		store         fakeSessionStore
		verifier      fakeVerifier
		wantErr       error
		wantSimulated bool
	}{
		{
			name:     "right password",
			store:    fakeSessionStore{user: user, userFound: true},
			verifier: fakeVerifier{matches: true},
		},
		{
			name:          "right password, previous session closed",
			previousToken: "previous",
			store:         fakeSessionStore{user: user, userFound: true},
			verifier:      fakeVerifier{matches: true},
		},
		{
			name:     "wrong password",
			store:    fakeSessionStore{user: user, userFound: true},
			verifier: fakeVerifier{matches: false},
			wantErr:  ErrInvalidCredentials,
		},
		{
			name:          "wrong password, previous session kept",
			previousToken: "previous",
			store:         fakeSessionStore{user: user, userFound: true},
			verifier:      fakeVerifier{matches: false},
			wantErr:       ErrInvalidCredentials,
		},
		{name: "unknown email", store: fakeSessionStore{}, wantErr: ErrInvalidCredentials, wantSimulated: true},
		{name: "database failure", store: fakeSessionStore{err: errDatabase}, wantErr: errDatabase},
		{
			name:     "malformed stored hash",
			store:    fakeSessionStore{user: user, userFound: true},
			verifier: fakeVerifier{err: ErrMalformedPasswordHash},
			wantErr:  ErrMalformedPasswordHash,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store, verifier := tt.store, tt.verifier
			service := newTestSessionService(&store, &verifier)

			session, err := service.Login(context.Background(), "  bob@example.com ", "password", tt.previousToken)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Login() error = %v, want %v", err, tt.wantErr)
			}
			if verifier.simulated != tt.wantSimulated {
				t.Fatalf("simulated verify = %v, want %v", verifier.simulated, tt.wantSimulated)
			}
			if tt.wantErr != nil {
				if store.created != nil {
					t.Fatal("a session was created despite the error")
				}
				if store.deleteCalls != 0 {
					t.Fatal("a failed login closed the previous session")
				}
				return
			}
			assertOpenedSession(t, &store, session, user)
			if tt.previousToken != "" && !bytes.Equal(store.deleted, hashSessionToken(tt.previousToken)) {
				t.Fatal("the previous session was not closed")
			}
		})
	}
}

func assertOpenedSession(t *testing.T, store *fakeSessionStore, session Session, user models.User) {
	t.Helper()
	if store.searched != "bob@example.com" {
		t.Fatalf("searched email = %q, want it trimmed", store.searched)
	}
	if !store.cleanedUp {
		t.Fatal("expired sessions were not cleaned up")
	}
	if store.created == nil {
		t.Fatal("no session was created")
	}
	if !bytes.Equal(store.created.TokenHash, hashSessionToken(session.Token)) {
		t.Fatal("stored hash does not match the returned token")
	}
	if bytes.Contains(store.created.TokenHash, []byte(session.Token)) {
		t.Fatal("the token itself is stored")
	}
	wantExpiry := testNow.Add(testIdleTimeout)
	if !session.ExpiresAt.Equal(wantExpiry) || !store.created.ExpiresAt.Equal(wantExpiry) {
		t.Fatalf("expiry = %v, want %v", session.ExpiresAt, wantExpiry)
	}
	if session.User != (SessionUser{ID: user.ID, DisplayName: "Bob", Email: user.Email, Status: user.Status}) {
		t.Fatalf("user = %+v, want %+v", session.User, user)
	}
}

func TestSessionServiceLoginBlocksAnAccountAfterTooManyFailures(t *testing.T) {
	user := models.User{ID: uuid.New(), Email: "bob@example.com", PasswordHash: "hash"}

	tests := []struct {
		name  string
		store fakeSessionStore
	}{
		{name: "existing account", store: fakeSessionStore{user: user, userFound: true}},
		{name: "unknown email, blocked the same way", store: fakeSessionStore{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := tt.store
			service := newTestSessionService(&store, &fakeVerifier{matches: false})
			for range testMaxLoginFailures {
				if _, err := service.Login(
					context.Background(),
					"bob@example.com",
					"wrong",
					"",
				); !errors.Is(
					err,
					ErrInvalidCredentials,
				) {
					t.Fatalf("Login() error = %v, want %v", err, ErrInvalidCredentials)
				}
			}

			// Another case and the right password: still blocked, without a hash.
			verifier := fakeVerifier{matches: true}
			service.passwords = &verifier
			store.searched = ""
			_, err := service.Login(context.Background(), " BOB@example.com", "right", "")

			if !errors.Is(err, ErrTooManyLoginFailures) {
				t.Fatalf("Login() error = %v, want %v", err, ErrTooManyLoginFailures)
			}
			if store.searched != "" || verifier.verified || verifier.simulated {
				t.Fatal("a blocked login still read the database or hashed the password")
			}
		})
	}
}

func TestSessionServiceLoginForgetsFailuresOnSuccess(t *testing.T) {
	store := fakeSessionStore{user: models.User{ID: uuid.New()}, userFound: true}
	verifier := fakeVerifier{}
	service := newTestSessionService(&store, &verifier)

	for attempt := range 2 * testMaxLoginFailures {
		// One success in the middle: the failures before it no longer count.
		verifier.matches = attempt == testMaxLoginFailures-1
		_, err := service.Login(context.Background(), "bob@example.com", "password", "")
		if errors.Is(err, ErrTooManyLoginFailures) {
			t.Fatalf("attempt %d blocked, want the failures reset by the success", attempt)
		}
	}
}

func TestSessionServiceLoginGivesDifferentTokens(t *testing.T) {
	store := fakeSessionStore{user: models.User{ID: uuid.New()}, userFound: true}
	service := newTestSessionService(&store, &fakeVerifier{matches: true})

	first, err := service.Login(context.Background(), "bob@example.com", "password", "")
	if err != nil {
		t.Fatalf("first login: %v", err)
	}
	second, err := service.Login(context.Background(), "bob@example.com", "password", "")
	if err != nil {
		t.Fatalf("second login: %v", err)
	}

	if first.Token == second.Token {
		t.Fatal("two logins got the same token")
	}
}

func TestSessionServiceAuthenticate(t *testing.T) {
	row := models.GetSessionUserRow{
		SessionID:   uuid.New(),
		UserID:      uuid.New(),
		Email:       "bob@example.com",
		DisplayName: "Bob",
		Status:      "active",
	}
	errDatabase := errors.New("connection reset")

	tests := []struct {
		name        string
		token       string
		expiresIn   time.Duration
		store       fakeSessionStore
		wantErr     error
		wantRenewed bool
	}{
		{
			name:      "fresh session",
			token:     "token",
			expiresIn: 10 * 24 * time.Hour,
			store:     fakeSessionStore{sessionOK: true},
		},
		{
			name:        "session past half its life",
			token:       "token",
			expiresIn:   6 * 24 * time.Hour,
			store:       fakeSessionStore{sessionOK: true},
			wantRenewed: true,
		},
		{name: "no token", token: "", wantErr: ErrInvalidSession},
		{
			name:    "unknown or expired token",
			token:   "token",
			store:   fakeSessionStore{sessionOK: false},
			wantErr: ErrInvalidSession,
		},
		{name: "database failure", token: "token", store: fakeSessionStore{err: errDatabase}, wantErr: errDatabase},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := tt.store
			store.sessionRow = row
			store.sessionRow.ExpiresAt = testNow.Add(tt.expiresIn)
			service := newTestSessionService(&store, &fakeVerifier{})

			session, err := service.Authenticate(context.Background(), tt.token)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Authenticate() error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				return
			}
			if session.User != (SessionUser{ID: row.UserID, DisplayName: "Bob", Email: row.Email, Status: row.Status}) {
				t.Fatalf("user = %+v, want the session user", session.User)
			}
			if session.Renewed != tt.wantRenewed || (store.extended != nil) != tt.wantRenewed {
				t.Fatalf("renewed = %v, extended = %v, want %v", session.Renewed, store.extended != nil, tt.wantRenewed)
			}
			if tt.wantRenewed &&
				(!session.ExpiresAt.Equal(testNow.Add(testIdleTimeout)) || store.extended.ID != row.SessionID) {
				t.Fatalf("renewed expiry = %v for session %v", session.ExpiresAt, store.extended.ID)
			}
		})
	}
}

func TestSessionServiceLogout(t *testing.T) {
	tests := []struct {
		name            string
		token           string
		wantDeleteCalls int
	}{
		{name: "with a token", token: "token", wantDeleteCalls: 1},
		{name: "without a token", token: "", wantDeleteCalls: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := fakeSessionStore{}
			service := newTestSessionService(&store, &fakeVerifier{})

			if err := service.Logout(context.Background(), tt.token); err != nil {
				t.Fatalf("Logout() error = %v", err)
			}

			if store.deleteCalls != tt.wantDeleteCalls {
				t.Fatalf("delete calls = %d, want %d", store.deleteCalls, tt.wantDeleteCalls)
			}
			if tt.wantDeleteCalls > 0 && !bytes.Equal(store.deleted, hashSessionToken(tt.token)) {
				t.Fatal("deleted another session than the one of the token")
			}
		})
	}
}
