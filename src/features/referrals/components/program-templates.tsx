import { ArrowRight, Gift } from 'lucide-react'
import { describeProgram } from '../rules'
import { formToRule, PROGRAM_TEMPLATES, type ProgramTemplate } from './program-form-values'

/** Empty state for the program builder: one-click starter templates. */
export function ProgramTemplates({ onPick }: { onPick: (t: ProgramTemplate) => void }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/50 p-6 sm:p-8">
      <div className="mx-auto max-w-xl space-y-1 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <Gift className="size-5" />
        </div>
        <h2 className="font-display text-lg font-semibold tracking-tight">Create your first referral program</h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Start from a template and tweak it, or build one from scratch. Programs also apply to past referrals that fall in their window.
        </p>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {PROGRAM_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className="group flex flex-col rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="font-medium">{t.title}</span>
            <span className="mt-1 text-sm text-muted-foreground">{t.blurb}</span>
            <span className="mt-3 border-t pt-3 text-xs text-muted-foreground">{describeProgram(formToRule(t.values))}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Use template <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
