package services

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"math"
	"strings"

	"golang.org/x/crypto/argon2"

	"github.com/Minatr/travel-larper/backend/internal/config"
)

const argon2Algorithm = "argon2id"

// PasswordHasher hashes and verifies passwords with argon2id.
type PasswordHasher struct {
	params config.Argon2Params
}

// NewPasswordHasher creates a PasswordHasher.
func NewPasswordHasher(params config.Argon2Params) *PasswordHasher {
	return &PasswordHasher{params: params}
}

// Hash returns the password hashed with a random salt, in the PHC string
// format: $argon2id$v=19$m=…,t=…,p=…$salt$key.
func (h *PasswordHasher) Hash(password string) (string, error) {
	salt := make([]byte, h.params.SaltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate salt: %w", err)
	}
	key := argon2.IDKey([]byte(password), salt, h.params.Iterations, h.params.MemoryKiB, h.params.Parallelism, h.params.KeyLength)
	return fmt.Sprintf("$%s$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2Algorithm, argon2.Version,
		h.params.MemoryKiB, h.params.Iterations, h.params.Parallelism,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(key),
	), nil
}

// Verify reports whether password matches encoded, using the parameters
// stored in encoded rather than the current ones.
func (h *PasswordHasher) Verify(password, encoded string) (bool, error) {
	params, salt, key, err := decodePasswordHash(encoded)
	if err != nil {
		return false, err
	}
	candidate := argon2.IDKey([]byte(password), salt, params.Iterations, params.MemoryKiB, params.Parallelism, params.KeyLength)
	// Constant time, so the response time reveals nothing about the hash.
	return subtle.ConstantTimeCompare(candidate, key) == 1, nil
}

func decodePasswordHash(encoded string) (config.Argon2Params, []byte, []byte, error) {
	var params config.Argon2Params
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[0] != "" || parts[1] != argon2Algorithm {
		return params, nil, nil, ErrMalformedPasswordHash
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return params, nil, nil, ErrMalformedPasswordHash
	}
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &params.MemoryKiB, &params.Iterations, &params.Parallelism); err != nil {
		return params, nil, nil, ErrMalformedPasswordHash
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return params, nil, nil, ErrMalformedPasswordHash
	}
	key, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return params, nil, nil, ErrMalformedPasswordHash
	}
	keyLength := len(key)
	if keyLength == 0 || keyLength > math.MaxUint32 {
		return params, nil, nil, ErrMalformedPasswordHash
	}
	params.KeyLength = uint32(keyLength)
	return params, salt, key, nil
}
