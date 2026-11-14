import { starfield } from '../lib/starfield.ts'

/** Number of stars, and the seed of their places. */
const STAR_COUNT = 160
const SEED = 2026

// Drawn once for the whole app: the same sky on every page load.
const STARS = starfield(STAR_COUNT, SEED)

/**
 * Faint stars behind the globe, in paper white rather than blue so the
 * globe still stands out.
 */
export function Starfield() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full"
    >
      {STARS.map((star, index) => (
        <circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.radius}
          fill="var(--card)"
          opacity={star.opacity}
        />
      ))}
    </svg>
  )
}
