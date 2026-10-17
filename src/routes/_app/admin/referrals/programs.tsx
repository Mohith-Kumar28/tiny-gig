import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Plus, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ProgramCard } from '@/features/referrals/components/program-card'
import { ProgramForm } from '@/features/referrals/components/program-form'
import { type ProgramRow, programToForm } from '@/features/referrals/components/program-form-values'
import { ProgramTemplates } from '@/features/referrals/components/program-templates'
import { programsQuery } from '@/features/referrals/queries'
import { PROGRAM_FORM_DEFAULTS, type ProgramFormInput } from '@/features/referrals/schemas'
import { reevaluateReferrals, toggleProgram } from '@/features/referrals/server/referrals'
import { useAction } from '@/hooks/use-action'

export const Route = createFileRoute('/_app/admin/referrals/programs')({
  head: () => ({ meta: [{ title: 'Referral programs · TinyGig Admin' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(programsQuery()),
  component: ProgramsPage,
})

type Editing = { id?: string; values: ProgramFormInput }

function ProgramsPage() {
  const { data: programs, isPending } = useQuery(programsQuery())
  const [editing, setEditing] = useState<Editing | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [needsReevaluate, setNeedsReevaluate] = useState(false)

  const open = (e: Editing) => {
    setEditing(e)
    setFormOpen(true)
  }
  const duplicate = (p: ProgramRow) => open({ values: { ...programToForm(p), name: `${p.name} (copy)`.slice(0, 80), active: false } })

  const toggle = useAction((v: { id: string; active: boolean }) => toggleProgram({ data: v }), {
    success: (_, v) => (v.active ? 'Program activated' : 'Program paused'),
    invalidate: [['admin', 'referral-programs']],
  })
  const reevaluate = useAction(() => reevaluateReferrals(), {
    success: 'Referrals re-evaluated. New rewards are in the queue.',
    invalidate: [['admin']],
    onSuccess: () => setNeedsReevaluate(false),
  })

  const reevaluateButton = (variant: 'default' | 'outline') => (
    <Button variant={variant} onClick={() => reevaluate.mutate(undefined)} disabled={reevaluate.isPending}>
      {reevaluate.isPending ? <Spinner /> : <RefreshCw />}
      Re-evaluate existing referrals
    </Button>
  )

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link to="/admin/referrals">
            <ArrowLeft /> Referrals
          </Link>
        </Button>
        <PageHeader
          title="Referral programs"
          description="Several programs can run at once."
          actions={
            <>
              {programs?.length && !needsReevaluate ? reevaluateButton('outline') : null}
              <Button onClick={() => open({ values: PROGRAM_FORM_DEFAULTS })}>
                <Plus /> New program
              </Button>
            </>
          }
        />
      </div>

      {needsReevaluate ? (
        <Alert className="border-primary/30 bg-primary/[0.04]">
          <RefreshCw className="text-primary" />
          <AlertTitle>Apply this change to past referrals?</AlertTitle>
          <AlertDescription>
            <p>Programs also cover referrals that already happened inside their window. Re-evaluate to create any rewards that are now due. Existing rewards are never duplicated.</p>
            <div className="mt-2 flex gap-2">
              {reevaluateButton('default')}
              <Button variant="ghost" onClick={() => setNeedsReevaluate(false)}>
                <X /> Later
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : programs?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {programs.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              onEdit={() => open({ id: p.id, values: programToForm(p) })}
              onDuplicate={() => duplicate(p)}
              onToggle={(active) => toggle.mutate({ id: p.id, active })}
              toggling={toggle.isPending && toggle.variables?.id === p.id}
            />
          ))}
        </div>
      ) : (
        <ProgramTemplates onPick={(t) => open({ values: t.values })} />
      )}

      <ProgramForm
        open={formOpen}
        onOpenChange={setFormOpen}
        programId={editing?.id}
        values={editing?.values ?? PROGRAM_FORM_DEFAULTS}
        onSaved={() => setNeedsReevaluate(true)}
      />
    </div>
  )
}
