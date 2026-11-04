import type { ReactNode } from 'react'

/** A full-width message in place of page content: not found, nothing here yet, and so on. */
export function MessageState({
  title,
  description,
  actions,
}: {
  title: string
  description: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
