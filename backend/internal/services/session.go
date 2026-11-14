package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/Minatr/travel-larper/backend/internal/models"
)

// 256 random bits: a token that cannot be guessed, so a fast SHA-256 is
// enough to store it (argon2id is for low-entropy passwords).
const sessionTokenBytes = 32

// SessionStore reads and writes users and sessions.
type SessionStore interface {
	FindUserByEmail(ctx context.Context, email string) (models.User, bool, error)
	CreateSession(ctx context.Context, arg models.CreateSessionParams) error
	FindSessionUser(ctx context.Context, tokenHash []byte) (models.GetSessionUserRow, bool, error)
	ExtendSession(ctx context.Context, arg models.ExtendSessionParams) error
	DeleteSession(ctx context.Context, tokenHash []byte) error
	DeleteExpiredSessions(ctx context.Context) error
}

// PasswordVerifier checks a password against a stored hash.
type PasswordVerifier interface {
	Verify(ctx context.Context, password, encoded string) (bool, error)
	SimulateVerify(ctx context.Context, password string) error
}

// SessionUser is the user a session belongs to.
type SessionUser struct {
	ID     uuid.UUID
	Email  string
	Status string
}

// Session is an open session. Renewed tells that its expiry moved, so the
// cookie must be sent again.
type Session struct {
	Token     string
	ExpiresAt time.Time
	User      SessionUser
	Renewed   bool
}

// SessionService opens, checks and closes sessions. A session expires after
// idleTimeout without activity.
type SessionService struct {
	store       SessionStore
	passwords   PasswordVerifier
	idleTimeout time.Duration
	now         func() time.Time
}

// NewSessionService creates a SessionService.
func NewSessionService(store SessionStore, passwords PasswordVerifier, idleTimeout time.Duration) *SessionService {
	return &SessionService{store: store, passwords: passwords, idleTimeout: idleTimeout, now: time.Now}
}

// Login checks the credentials and opens a session, whatever the account
// status.
func (s *SessionService) Login(ctx context.Context, email, password string) (Session, error) {
	user, found, err := s.store.FindUserByEmail(ctx, strings.TrimSpace(email))
	if err != nil {
		return Session{}, fmt.Errorf("login: %w", err)
	}
	if !found {
		if err := s.passwords.SimulateVerify(ctx, password); err != nil {
			return Session{}, fmt.Errorf("login: %w", err)
		}
		return Session{}, ErrInvalidCredentials
	}
	matches, err := s.passwords.Verify(ctx, password, user.PasswordHash)
	if err != nil {
		return Session{}, fmt.Errorf("login: %w", err)
	}
	if !matches {
		return Session{}, ErrInvalidCredentials
	}

	if err := s.store.DeleteExpiredSessions(ctx); err != nil {
		return Session{}, fmt.Errorf("login: %w", err)
	}
	token, tokenHash, err := newSessionToken()
	if err != nil {
		return Session{}, fmt.Errorf("login: %w", err)
	}
	expiresAt := s.now().Add(s.idleTimeout)
	if err := s.store.CreateSession(ctx, models.CreateSessionParams{UserID: user.ID, TokenHash: tokenHash, ExpiresAt: expiresAt}); err != nil {
		return Session{}, fmt.Errorf("login: %w", err)
	}
	return Session{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      SessionUser{ID: user.ID, Email: user.Email, Status: user.Status},
	}, nil
}

// Authenticate returns the session of token. The expiry only moves once
// less than half of idleTimeout is left, to avoid a write on every request.
func (s *SessionService) Authenticate(ctx context.Context, token string) (Session, error) {
	if token == "" {
		return Session{}, ErrInvalidSession
	}
	row, found, err := s.store.FindSessionUser(ctx, hashSessionToken(token))
	if err != nil {
		return Session{}, fmt.Errorf("authenticate: %w", err)
	}
	if !found {
		return Session{}, ErrInvalidSession
	}

	session := Session{
		Token:     token,
		ExpiresAt: row.ExpiresAt,
		User:      SessionUser{ID: row.UserID, Email: row.Email, Status: row.Status},
	}
	now := s.now()
	if row.ExpiresAt.Sub(now) >= s.idleTimeout/2 {
		return session, nil
	}
	session.ExpiresAt = now.Add(s.idleTimeout)
	session.Renewed = true
	if err := s.store.ExtendSession(ctx, models.ExtendSessionParams{ID: row.SessionID, ExpiresAt: session.ExpiresAt}); err != nil {
		return Session{}, fmt.Errorf("authenticate: %w", err)
	}
	return session, nil
}

// Logout closes the session of token; an empty or unknown token is not an
// error.
func (s *SessionService) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	if err := s.store.DeleteSession(ctx, hashSessionToken(token)); err != nil {
		return fmt.Errorf("logout: %w", err)
	}
	return nil
}

func newSessionToken() (string, []byte, error) {
	random := make([]byte, sessionTokenBytes)
	if _, err := rand.Read(random); err != nil {
		return "", nil, fmt.Errorf("generate session token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(random)
	return token, hashSessionToken(token), nil
}

func hashSessionToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}
