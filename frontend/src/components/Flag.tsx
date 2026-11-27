import { flagUrl } from '../lib/flags.ts'
import { cn } from '../lib/utils.ts'

/** A country's small 4:3 flag, decorative (its name is written beside it); nothing for a code without flag. */
export function Flag({ code, className }: { code: string; className?: string }) {
  const url = flagUrl(code)
  if (url === null) {
    return null
  }
  return (
    <img
      src={url}
      alt=""
      className={cn('h-3 w-4 shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgb(23_25_30/0.15)]', className)}
    />
  )
}
