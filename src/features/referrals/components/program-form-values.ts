import { format } from 'date-fns'
import { rupeesToPaise } from '@/lib/format'
import type { ProgramRule } from '../rules'
import { PROGRAM_FORM_DEFAULTS, type ProgramFormInput } from '../schemas'
import type { listPrograms } from '../server/referrals'

export type ProgramRow = Awaited<ReturnType<typeof listPrograms>>[number]

const toLocalInput = (d: Date | string | null | undefined) => (d ? format(new Date(d), "yyyy-MM-dd'T'HH:mm") : '')

/** DB program (paise) → form values (rupees). */
export function programToForm(p: ProgramRow): ProgramFormInput {
  return {
    name: p.name,
    description: p.description ?? '',
    active: p.active,
    trigger: p.trigger,
    triggerValue: p.trigger === 'earned_at_least' ? p.triggerValue / 100 : p.triggerValue,
    threshold: p.threshold,
    referrerRewardRupees: p.referrerReward / 100,
    refereeRewardRupees: p.refereeReward / 100,
    repeatMode: p.repeatMode,
    maxRewardsPerReferrer: p.maxRewardsPerReferrer ?? '',
    qualifyWithinDays: p.qualifyWithinDays ?? '',
    autoApprove: p.autoApprove,
    startsAt: toLocalInput(p.startsAt),
    endsAt: toLocalInput(p.endsAt),
  }
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const optionalNum = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v))
const optionalDate = (v: string | undefined) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Form values (rupees, strings) → rule in paise, for live previews. */
export function formToRule(v: Partial<ProgramFormInput>): ProgramRule {
  const trigger = v.trigger ?? 'first_gig_approved'
  return {
    trigger,
    triggerValue: trigger === 'earned_at_least' ? rupeesToPaise(num(v.triggerValue)) : Math.round(num(v.triggerValue)),
    threshold: Math.max(1, Math.round(num(v.threshold))),
    referrerReward: rupeesToPaise(num(v.referrerRewardRupees)),
    refereeReward: rupeesToPaise(num(v.refereeRewardRupees)),
    repeatMode: v.repeatMode ?? 'once',
    maxRewardsPerReferrer: v.repeatMode === 'every' ? optionalNum(v.maxRewardsPerReferrer) : null,
    qualifyWithinDays: optionalNum(v.qualifyWithinDays),
    startsAt: optionalDate(v.startsAt),
    endsAt: optionalDate(v.endsAt),
    active: v.active ?? true,
  }
}

/** `datetime-local` strings carry no zone; send ISO so the server doesn't read them as UTC. */
export function localToIso(v: string | undefined) {
  const d = optionalDate(v)
  return d ? d.toISOString() : ''
}

export type ProgramTemplate = { id: string; title: string; blurb: string; values: ProgramFormInput }

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'invite-3',
    title: 'Invite 3 friends',
    blurb: '3 referrals who complete a gig → ₹150 for the referrer, ₹50 for each friend.',
    values: { ...PROGRAM_FORM_DEFAULTS, name: 'Invite 3 friends', description: 'Bring 3 friends who complete their first gig.' },
  },
  {
    id: 'welcome',
    title: 'Welcome bonus',
    blurb: 'Every referred worker gets ₹25 as soon as they are approved.',
    values: {
      ...PROGRAM_FORM_DEFAULTS,
      name: 'Welcome bonus',
      description: 'A small thank-you for joining through a friend.',
      trigger: 'approved',
      threshold: 1,
      referrerRewardRupees: 0,
      refereeRewardRupees: 25,
      repeatMode: 'once',
      maxRewardsPerReferrer: '',
      qualifyWithinDays: '',
    },
  },
  {
    id: 'power',
    title: 'Power referrer',
    blurb: 'Every 10 approved referrals → ₹500 for the referrer, no cap.',
    values: {
      ...PROGRAM_FORM_DEFAULTS,
      name: 'Power referrer',
      description: 'For workers who bring in a lot of people.',
      trigger: 'approved',
      threshold: 10,
      referrerRewardRupees: 500,
      refereeRewardRupees: 0,
      repeatMode: 'every',
      maxRewardsPerReferrer: '',
      qualifyWithinDays: '',
    },
  },
]
