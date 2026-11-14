package services

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/Minatr/travel-larper/backend/internal/config"
)

// Far below the production cost so the tests stay fast.
var testArgon2Params = config.Argon2Params{MemoryKiB: 64, Iterations: 1, Parallelism: 1, SaltLength: 16, KeyLength: 32}

const testMaxConcurrentHashes = 1

func TestPasswordHasherVerify(t *testing.T) {
	hasher := NewPasswordHasher(testArgon2Params, testMaxConcurrentHashes)
	encoded, err := hasher.Hash(context.Background(), "correct horse")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}

	tests := []struct {
		name     string
		password string
		want     bool
	}{
		{name: "right password", password: "correct horse", want: true},
		{name: "wrong password", password: "correct horsE", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := hasher.Verify(context.Background(), tt.password, encoded)

			if err != nil || got != tt.want {
				t.Fatalf("Verify() = %v, %v, want %v, nil", got, err, tt.want)
			}
		})
	}
}

func TestPasswordHasherHashFormat(t *testing.T) {
	hasher := NewPasswordHasher(testArgon2Params, testMaxConcurrentHashes)

	first, err := hasher.Hash(context.Background(), "password")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	second, err := hasher.Hash(context.Background(), "password")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}

	if !strings.HasPrefix(first, "$argon2id$v=19$m=64,t=1,p=1$") {
		t.Fatalf("hash = %q, want the PHC argon2id format", first)
	}
	if first == second {
		t.Fatal("two hashes of the same password are equal: the salt is not random")
	}
}

func TestPasswordHasherVerifyKeepsOldParameters(t *testing.T) {
	encoded, err := NewPasswordHasher(testArgon2Params, testMaxConcurrentHashes).Hash(context.Background(), "password")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	stronger := testArgon2Params
	stronger.Iterations = 3

	got, err := NewPasswordHasher(stronger, testMaxConcurrentHashes).Verify(context.Background(), "password", encoded)

	if err != nil || !got {
		t.Fatalf("Verify() = %v, %v, want true, nil", got, err)
	}
}

func TestPasswordHasherVerifyRejectsMalformedHash(t *testing.T) {
	hasher := NewPasswordHasher(testArgon2Params, testMaxConcurrentHashes)
	tests := []struct {
		name    string
		encoded string
	}{
		{name: "empty", encoded: ""},
		{name: "other algorithm", encoded: "$argon2i$v=19$m=64,t=1,p=1$c2FsdHNhbHQ$a2V5a2V5"},
		{name: "other version", encoded: "$argon2id$v=16$m=64,t=1,p=1$c2FsdHNhbHQ$a2V5a2V5"},
		{name: "missing parameters", encoded: "$argon2id$v=19$m=64$c2FsdHNhbHQ$a2V5a2V5"},
		{name: "zero iterations", encoded: "$argon2id$v=19$m=64,t=0,p=1$c2FsdHNhbHQ$a2V5a2V5"},
		{name: "zero parallelism", encoded: "$argon2id$v=19$m=64,t=1,p=0$c2FsdHNhbHQ$a2V5a2V5"},
		{name: "invalid salt", encoded: "$argon2id$v=19$m=64,t=1,p=1$***$a2V5a2V5"},
		{name: "empty key", encoded: "$argon2id$v=19$m=64,t=1,p=1$c2FsdHNhbHQ$"},
		{name: "too many parts", encoded: "$argon2id$v=19$m=64,t=1,p=1$c2FsdHNhbHQ$a2V5a2V5$extra"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := hasher.Verify(context.Background(), "password", tt.encoded)

			if got || !errors.Is(err, ErrMalformedPasswordHash) {
				t.Fatalf("Verify() = %v, %v, want false, %v", got, err, ErrMalformedPasswordHash)
			}
		})
	}
}

func TestPasswordHasherStopsWaitingWhenContextEnds(t *testing.T) {
	hasher := NewPasswordHasher(testArgon2Params, testMaxConcurrentHashes)
	encoded, err := hasher.Hash(context.Background(), "password")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	// Take the only slot, as a hash in progress would.
	hasher.slots <- struct{}{}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if _, err := hasher.Hash(ctx, "password"); !errors.Is(err, context.Canceled) {
		t.Fatalf("Hash() error = %v, want %v", err, context.Canceled)
	}
	if _, err := hasher.Verify(ctx, "password", encoded); !errors.Is(err, context.Canceled) {
		t.Fatalf("Verify() error = %v, want %v", err, context.Canceled)
	}
	if err := hasher.SimulateVerify(ctx, "password"); !errors.Is(err, context.Canceled) {
		t.Fatalf("SimulateVerify() error = %v, want %v", err, context.Canceled)
	}
}

func TestPasswordHasherSimulateVerifyReleasesItsSlot(t *testing.T) {
	hasher := NewPasswordHasher(testArgon2Params, testMaxConcurrentHashes)

	for range testMaxConcurrentHashes + 1 {
		if err := hasher.SimulateVerify(context.Background(), "password"); err != nil {
			t.Fatalf("SimulateVerify() error = %v", err)
		}
	}
}
