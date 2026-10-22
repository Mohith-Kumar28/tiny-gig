import type { ReactNode } from 'react'

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div className="space-y-0.5">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}
