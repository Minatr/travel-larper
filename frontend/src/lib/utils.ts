import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Builds a `className` from several pieces, some of them conditional, and
 * keeps only the last of two conflicting Tailwind classes:
 * `cn('p-4', isCompact && 'p-2')` gives `p-2` when compact, `p-4` otherwise.
 * The shadcn/ui components use it so that a caller can override their
 * default style through their `className` prop.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
