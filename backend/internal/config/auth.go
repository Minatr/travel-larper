package config

import "time"

const (
	defaultRegisterRateLimitPerHour = 10
	defaultLoginRateLimitPerMinute  = 5
	// Per account, whatever the IP: against password guessing from many IPs.
	defaultLoginFailuresPerAccountPerHour = 10
	// About 1 MB of memory at most for the failed login counters.
	maxTrackedLoginAccounts = 10_000
	// 2 weeks
	defaultSessionIdleTimeoutHours = 14 * 24
	// About 76 MiB of argon2id memory at most with the parameters below.
	maxConcurrentPasswordHashes = 4

	// OWASP minimum recommendation for argon2id.
	argon2MemoryKiB   = 19 * 1024
	argon2Iterations  = 2
	argon2Parallelism = 1
	argon2SaltLength  = 16
	argon2KeyLength   = 32
)

// LoginFailureWindow is how long the failed logins of an account count.
const LoginFailureWindow = time.Hour

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
