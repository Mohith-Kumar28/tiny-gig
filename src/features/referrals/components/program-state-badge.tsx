import { StatusBadge } from '@/components/shared/status-badge'

export type ProgramState = 'running' | 'paused' | 'scheduled' | 'ended'

export function programState(p: { active: boolean; startsAt: Date | string | null; endsAt: Date | string | null }, now = new Date()): ProgramState {
  if (p.endsAt && new Date(p.endsAt) < now) return 'ended'
  if (!p.active) return 'paused'
  if (p.startsAt && new Date(p.startsAt) > now) return 'scheduled'
  return 'running'
}

const MAP: Record<ProgramState, { status: string; label: string }> = {
  running: { status: 'live', label: 'Running' },
  paused: { status: 'paused', label: 'Paused' },
  scheduled: { status: 'processing', label: 'Scheduled' },
  ended: { status: 'closed', label: 'Ended' },
}

export function ProgramStateBadge({ state }: { state: ProgramState }) {
  return <StatusBadge status={MAP[state].status} label={MAP[state].label} />
}
