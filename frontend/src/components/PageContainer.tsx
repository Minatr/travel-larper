import type { ReactNode } from 'react'

/**
 * Centered column with side margins, for the pages made of text. The top
 * padding keeps the content clear of the floating header (Layout).
 */
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-20 pb-6">{children}</div>
  )
}
