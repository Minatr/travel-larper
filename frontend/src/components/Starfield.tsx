import type { Ref } from 'react'

import { SKY_SIZE, starfield } from '../lib/starfield.ts'

/** Number of stars, and the seed of their places. */
const STAR_COUNT = 160
const SEED = 2026

// Drawn once for the whole app: the same sky on every page load.
const STARS = starfield(STAR_COUNT, SEED)

/** Props of {@link Starfield}. */
type StarfieldProps = {
  /** The tile of stars, moved with `patternTransform` as the globe turns. */
  ref?: Ref<SVGPatternElement>
}

/**
 * Faint stars behind the globe, in paper white rather than blue so the
 * globe still stands out. The stars are a repeated tile, so the sky can
 * move without ever showing an edge.
 */
export function Starfield({ ref }: StarfieldProps) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${SKY_SIZE} ${SKY_SIZE}`}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <defs>
        <pattern
          ref={ref}
          id="starfield"
          patternUnits="userSpaceOnUse"
          width={SKY_SIZE}
          height={SKY_SIZE}
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
        </pattern>
      </defs>
      <rect width={SKY_SIZE} height={SKY_SIZE} fill="url(#starfield)" />
    </svg>
  )
}
