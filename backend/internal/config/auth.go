package config

const (
	defaultRegisterRateLimitPerHour = 10

	// OWASP minimum recommendation for argon2id.
	argon2MemoryKiB   = 19 * 1024
	argon2Iterations  = 2
	argon2Parallelism = 1
	argon2SaltLength  = 16
	argon2KeyLength   = 32
)

// Argon2Params holds the argon2id cost settings.
type Argon2Params struct {
	MemoryKiB   uint32
	Iterations  uint32
	Parallelism uint8
	SaltLength  uint32
	KeyLength   uint32
}

func defaultArgon2Params() Argon2Params {
	return Argon2Params{
		MemoryKiB:   argon2MemoryKiB,
		Iterations:  argon2Iterations,
		Parallelism: argon2Parallelism,
		SaltLength:  argon2SaltLength,
		KeyLength:   argon2KeyLength,
	}
}
