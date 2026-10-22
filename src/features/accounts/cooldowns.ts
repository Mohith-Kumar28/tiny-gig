/**
 * The overlap and cooldown rules (§5) — the reason the register exists.
 * Pure functions: callers load the history, this decides. No DB access.
 *
 * Scoping (R14–R16):
 *  - person: same-community, per-day, open assignments, after-rejection. Across ALL the
 *    worker's accounts, including lost/banned ones — the subreddit remembers.
 *  - account: same-client and any-client gaps. That's the identity moderators see repeat.
 * Time (R17, R18): days are Indian calendar days, weeks are rolling 7 days, and work counts
 * from the moment it was posted (or assigned, if not posted yet), not when it was approved.
 */
import type { SubmissionStatus } from '@/db/schema/enums'
import { communityLabel, DAY_MS, istDayKey, type Level, levelFor, nextIstMidnight } from './rules'

export type CooldownSettings = {
  sameCommunityDays: number
  sameClientMaxPerWeek: number
  sameClientMinGapDays: number
  anyClientGapDays: number
  perDayLimit: number
  maxOpenAssignments: number
  afterRejectionDays: number
}

/** One piece of work, reduced to what the rules need. */
export type WorkRow = {
  id: string
  gigId: string
  workerId: string
  accountId: string | null
  clientTagId: string | null
  community: string | null
  status: SubmissionStatus
  /** When it became visible (first submit), else when it was assigned. */
  at: Date
  posted: boolean
  decidedAt: Date | null
}

export type GigFacts = {
  id: string
  platform: string
  /** Normalized community, e.g. "developersindia". */
  community: string | null
  clientTagId: string | null
  minKarma: number
  minAccountAgeMonths: number
  allowedStates: string[]
}

export type AccountFacts = {
  id: string
  platform: string
  handle: string
  createdOn: Date | null
  karma: number | null
  standing: string
}

export type RuleKey =
  | 'platform'
  | 'standing'
  | 'warmup'
  | 'no_created_date'
  | 'min_karma'
  | 'min_age'
  | 'state'
  | 'already_on_gig'
  | 'same_community'
  | 'per_day'
  | 'open_assignments'
  | 'after_rejection'
  | 'same_client'
  | 'any_client'

export const RULE_LABELS: Record<RuleKey, string> = {
  platform: 'Wrong platform',
  standing: 'Account standing',
  warmup: 'Account warming up',
  no_created_date: 'Creation date missing',
  min_karma: 'Karma below minimum',
  min_age: 'Account too young for this gig',
  state: 'State not allowed',
  already_on_gig: 'Already on this gig',
  same_community: 'Same community',
  per_day: 'Daily limit',
  open_assignments: 'Open assignments',
  after_rejection: 'After a rejection',
  same_client: 'Same client',
  any_client: 'Gap between client work',
}

export type Block = {
  rule: RuleKey
  scope: 'person' | 'account'
  /** Hard blocks can't be overridden; soft ones are cooldowns staff may override with a reason (R10). */
  severity: 'hard' | 'soft'
  /** Staff-facing: may name the client. */
  message: string
  /** Worker-facing: never names a client (R44). */
  workerMessage: string
  unlockAt: Date | null
}

export type AccountFactsOut = {
  level: Level | null
  karma: number | null
  /** Days since this account's last client work; null = never. */
  daysSinceClientWork: number | null
  lastClientTagId: string | null
  /** Last time this person posted in the gig's community (any account); null = never. */
  lastInCommunityAt: Date | null
  approved: number
  rejected: number
}

export type Evaluation = {
  accountId: string
  ok: boolean
  hard: Block[]
  soft: Block[]
  facts: AccountFactsOut
}

const OPEN: SubmissionStatus[] = ['claimed', 'submitted', 'changes_requested', 'resubmitted', 'live_check', 'on_hold' as SubmissionStatus, 'in_review' as SubmissionStatus]

/** Assigned-but-abandoned work never reached the platform, so it doesn't count. */
export function countsAsWork(w: WorkRow) {
  return w.posted || !['expired', 'withdrawn'].includes(w.status)
}

const PLATFORM_NAMES: Record<string, string> = { reddit: 'Reddit', x: 'X', linkedin: 'LinkedIn', threads: 'Threads', instagram: 'Instagram', facebook: 'Facebook' }

const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })
const day = (d: Date) => fmt.format(d)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS)

function inDays(unlock: Date, now: Date) {
  const days = Math.ceil((unlock.getTime() - now.getTime()) / DAY_MS)
  if (days <= 0) return 'later today'
  return days === 1 ? 'in 1 day' : `in ${days} days`
}

/** Person-scoped blocks — the same for every account the worker holds. */
export function personBlocks(
  gig: Pick<GigFacts, 'community'> | null,
  history: WorkRow[],
  s: CooldownSettings,
  now: Date,
): Block[] {
  const blocks: Block[] = []
  const work = history.filter(countsAsWork)

  if (gig?.community && s.sameCommunityDays > 0) {
    const since = now.getTime() - s.sameCommunityDays * DAY_MS
    const recent = work.filter((w) => w.community === gig.community && w.at.getTime() > since).sort((a, b) => b.at.getTime() - a.at.getTime())[0]
    if (recent) {
      const unlockAt = addDays(recent.at, s.sameCommunityDays)
      const text = `posted in ${communityLabel(gig.community)} on ${day(recent.at)}`
      blocks.push({
        rule: 'same_community',
        scope: 'person',
        severity: 'soft',
        message: `${text} (${s.sameCommunityDays}-day community gap)`,
        workerMessage: `Available ${inDays(unlockAt, now)}: you ${text}.`,
        unlockAt,
      })
    }
  }

  const today = istDayKey(now)
  const todays = work.filter((w) => istDayKey(w.at) === today)
  if (todays.length >= s.perDayLimit) {
    const unlockAt = nextIstMidnight(now)
    blocks.push({
      rule: 'per_day',
      scope: 'person',
      severity: 'soft',
      message: `already did ${todays.length} piece${todays.length === 1 ? '' : 's'} of client work today (limit ${s.perDayLimit})`,
      workerMessage: `Available tomorrow: you’ve reached today’s limit of ${s.perDayLimit} task${s.perDayLimit === 1 ? '' : 's'}.`,
      unlockAt,
    })
  }

  const open = history.filter((w) => OPEN.includes(w.status))
  if (open.length >= s.maxOpenAssignments) {
    blocks.push({
      rule: 'open_assignments',
      scope: 'person',
      severity: 'soft',
      message: `${open.length} unfinished assignments (limit ${s.maxOpenAssignments})`,
      workerMessage: `Finish one of your ${open.length} open tasks first.`,
      unlockAt: null,
    })
  }

  if (s.afterRejectionDays > 0) {
    const since = now.getTime() - s.afterRejectionDays * DAY_MS
    const rejected = history
      .filter((w) => w.status === 'rejected' && w.decidedAt && w.decidedAt.getTime() > since)
      .sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0))[0]
    if (rejected?.decidedAt) {
      const unlockAt = addDays(rejected.decidedAt, s.afterRejectionDays)
      blocks.push({
        rule: 'after_rejection',
        scope: 'person',
        severity: 'soft',
        message: `had work rejected on ${day(rejected.decidedAt)}`,
        workerMessage: `Available ${inDays(unlockAt, now)}: a task was rejected on ${day(rejected.decidedAt)}.`,
        unlockAt,
      })
    }
  }
  return blocks
}

/** Account-scoped client gaps. `clientName` resolves tag ids for staff-facing messages only. */
export function accountBlocks(
  gig: Pick<GigFacts, 'clientTagId'> | null,
  accountId: string,
  history: WorkRow[],
  s: CooldownSettings,
  now: Date,
  clientName: (id: string) => string = () => 'this client',
): Block[] {
  const blocks: Block[] = []
  const mine = history.filter((w) => w.accountId === accountId && countsAsWork(w)).sort((a, b) => b.at.getTime() - a.at.getTime())

  if (gig?.clientTagId) {
    const same = mine.filter((w) => w.clientTagId === gig.clientTagId)
    const weekAgo = now.getTime() - 7 * DAY_MS
    const inWeek = same.filter((w) => w.at.getTime() > weekAgo)
    const last = same[0]
    const name = clientName(gig.clientTagId)
    if (inWeek.length >= s.sameClientMaxPerWeek) {
      // The window frees up when the oldest piece in it rolls out.
      const oldest = inWeek[inWeek.length - 1] as WorkRow
      const unlockAt = addDays(oldest.at, 7)
      blocks.push({
        rule: 'same_client',
        scope: 'account',
        severity: 'soft',
        message: `posted for ${name} ${inWeek.length}× in the last 7 days (limit ${s.sameClientMaxPerWeek})`,
        workerMessage: `This account is available for this kind of work ${inDays(unlockAt, now)}.`,
        unlockAt,
      })
    } else if (last && last.at.getTime() > now.getTime() - s.sameClientMinGapDays * DAY_MS) {
      const unlockAt = addDays(last.at, s.sameClientMinGapDays)
      const ago = Math.max(0, Math.floor((now.getTime() - last.at.getTime()) / DAY_MS))
      blocks.push({
        rule: 'same_client',
        scope: 'account',
        severity: 'soft',
        message: `posted for ${name} ${ago === 0 ? 'today' : `${ago} day${ago === 1 ? '' : 's'} ago`} (min gap ${s.sameClientMinGapDays}d)`,
        workerMessage: `This account is available for this kind of work ${inDays(unlockAt, now)}.`,
        unlockAt,
      })
    }
  }

  const last = mine[0]
  if (last && s.anyClientGapDays > 0 && last.at.getTime() > now.getTime() - s.anyClientGapDays * DAY_MS) {
    const unlockAt = addDays(last.at, s.anyClientGapDays)
    blocks.push({
      rule: 'any_client',
      scope: 'account',
      severity: 'soft',
      message: `last client work ${day(last.at)}${last.clientTagId ? ` for ${clientName(last.clientTagId)}` : ''} (${s.anyClientGapDays}-day gap)`,
      workerMessage: `This account is resting until ${day(unlockAt)} (last task ${day(last.at)}).`,
      unlockAt,
    })
  }
  return blocks
}

/** Requirements that no override can lift. */
export function hardBlocks(
  gig: GigFacts,
  account: AccountFacts,
  worker: { state: string },
  history: WorkRow[],
  now: Date,
): Block[] {
  const blocks: Block[] = []
  const hard = (rule: RuleKey, message: string, workerMessage = message, unlockAt: Date | null = null) =>
    blocks.push({ rule, scope: 'account', severity: 'hard', message, workerMessage, unlockAt })
  if (gig.platform !== 'other' && account.platform !== gig.platform) {
    const name = PLATFORM_NAMES[gig.platform] ?? gig.platform
    hard('platform', `not a ${name} account`, `Needs a ${name} account. Add one on My accounts.`)
  }
  if (account.standing !== 'active') hard('standing', `account is ${account.standing}`, `This account is marked ${account.standing}.`)
  if (gig.platform === 'reddit' && account.platform === 'reddit') {
    if (!account.createdOn) hard('no_created_date', 'creation date missing', 'Add this account’s creation date on My accounts.')
    else {
      const level = levelFor(account.createdOn, now)
      if (level === 'warmup') {
        const unlockAt = addDays(account.createdOn, 14)
        hard('warmup', 'under two weeks old (warm-up only)', `This account is warming up until ${day(unlockAt)}.`, unlockAt)
      }
      if (gig.minAccountAgeMonths > 0) {
        const old = new Date(account.createdOn.getTime())
        old.setUTCMonth(old.getUTCMonth() + gig.minAccountAgeMonths)
        if (old > now) hard('min_age', `needs a ${gig.minAccountAgeMonths}+ month old account`, `Needs a ${gig.minAccountAgeMonths}+ month old account (yours qualifies on ${day(old)}).`, old)
      }
    }
  }
  if (gig.minKarma > 0 && (account.karma ?? 0) < gig.minKarma) {
    hard('min_karma', `needs ${gig.minKarma.toLocaleString('en-IN')}+ karma`, `Needs ${gig.minKarma.toLocaleString('en-IN')}+ karma.`)
  }
  if (gig.allowedStates.length && !gig.allowedStates.includes(worker.state)) hard('state', 'not available in their state', 'Not available in your state.')
  if (history.some((w) => w.gigId === gig.id)) hard('already_on_gig', 'already has this gig', 'You already have this gig.')
  return blocks
}

function factsFor(gig: GigFacts | null, account: AccountFacts, history: WorkRow[], now: Date): AccountFactsOut {
  const mine = history.filter((w) => w.accountId === account.id && countsAsWork(w)).sort((a, b) => b.at.getTime() - a.at.getTime())
  const last = mine[0]
  const inCommunity = gig?.community
    ? history
        .filter((w) => countsAsWork(w) && w.community === gig.community)
        .sort((a, b) => b.at.getTime() - a.at.getTime())[0]
    : undefined
  return {
    level: levelFor(account.createdOn, now),
    karma: account.karma,
    daysSinceClientWork: last ? Math.floor((now.getTime() - last.at.getTime()) / DAY_MS) : null,
    lastClientTagId: last?.clientTagId ?? null,
    lastInCommunityAt: inCommunity?.at ?? null,
    approved: history.filter((w) => w.status === 'approved').length,
    rejected: history.filter((w) => w.status === 'rejected').length,
  }
}

/** Every account of one worker against one gig. `history` = all of the worker's work. */
export function evaluate(args: {
  gig: GigFacts
  worker: { state: string }
  accounts: AccountFacts[]
  history: WorkRow[]
  settings: CooldownSettings
  now: Date
  clientName?: (id: string) => string
}): Evaluation[] {
  const { gig, worker, accounts, history, settings, now } = args
  const person = personBlocks(gig, history, settings, now)
  return accounts.map((account) => {
    const hard = hardBlocks(gig, account, worker, history, now)
    const soft = [...person, ...accountBlocks(gig, account.id, history, settings, now, args.clientName)]
    return { accountId: account.id, ok: !hard.length && !soft.length, hard, soft, facts: factsFor(gig, account, history, now) }
  })
}

/**
 * What a worker is told when none of their accounts can take a gig (R19): the soonest way in,
 * stated as a rule and a date. Hard blocks only show if nothing else would ever unlock.
 */
export function workerBlockReason(evals: Evaluation[], now: Date): { message: string; unlockAt: Date | null; rule: RuleKey } | null {
  if (!evals.length) return { message: 'Add an account for this platform on My accounts.', unlockAt: null, rule: 'platform' }
  if (evals.some((e) => e.ok)) return null
  const softOnly = evals.filter((e) => !e.hard.length)
  if (softOnly.length) {
    const unlockOf = (e: Evaluation) => {
      if (e.soft.some((b) => !b.unlockAt)) return Number.POSITIVE_INFINITY
      return Math.max(...e.soft.map((b) => b.unlockAt?.getTime() ?? now.getTime()))
    }
    const best = softOnly.sort((a, b) => unlockOf(a) - unlockOf(b))[0] as Evaluation
    // The binding rule is the one that lifts last.
    const binding = [...best.soft].sort((a, b) => (b.unlockAt?.getTime() ?? Number.POSITIVE_INFINITY) - (a.unlockAt?.getTime() ?? Number.POSITIVE_INFINITY))[0] as Block
    return { message: binding.workerMessage, unlockAt: binding.unlockAt, rule: binding.rule }
  }
  const first = evals[0]?.hard[0] as Block
  return { message: first.workerMessage, unlockAt: first.unlockAt, rule: first.rule }
}

/** Cooling down without a specific gig in mind: what the roster shows (R3). */
export function readiness(accountId: string, history: WorkRow[], s: CooldownSettings, now: Date) {
  const blocks = [...personBlocks(null, history, s, now), ...accountBlocks(null, accountId, history, s, now)].filter((b) => b.rule !== 'open_assignments')
  const until = blocks.reduce<Date | null>((m, b) => (b.unlockAt && (!m || b.unlockAt > m) ? b.unlockAt : m), null)
  return { cooling: blocks.length > 0, until, blocks }
}

export type Candidate = {
  accountId: string
  handle: string
  evaluation: Evaluation
  community: string | null
}

const LEVEL_RANK: Record<string, number> = { warmup: 0, L1: 1, L2: 2, L3: 3, L4: 4 }

/**
 * Best fit first (R9): no flags, then never in this community, then longest since client work,
 * then higher level, then better approval record. The human still decides.
 */
export function rankCandidates<T extends Candidate>(cands: T[]): T[] {
  const score = (c: T) => {
    const f = c.evaluation.facts
    const decided = f.approved + f.rejected
    return [
      c.evaluation.hard.length ? 1 : 0,
      c.evaluation.soft.length,
      f.lastInCommunityAt ? 1 : 0,
      -(f.daysSinceClientWork ?? 100_000),
      -(LEVEL_RANK[f.level ?? 'warmup'] ?? 0),
      -(decided ? f.approved / decided : 0.5),
    ]
  }
  return [...cands].sort((a, b) => {
    const x = score(a)
    const y = score(b)
    for (let i = 0; i < x.length; i++) {
      const d = (x[i] ?? 0) - (y[i] ?? 0)
      if (d) return d
    }
    return a.handle.localeCompare(b.handle)
  })
}

/** "u/foo · L3 · 14 days since last client post · never posted in r/india" */
export function reasonLine(c: Candidate, now: Date) {
  const f = c.evaluation.facts
  const parts = [`u/${c.handle}`]
  if (f.level) parts.push(f.level === 'warmup' ? 'warm-up' : f.level)
  parts.push(f.daysSinceClientWork == null ? 'no client posts yet' : `${f.daysSinceClientWork} day${f.daysSinceClientWork === 1 ? '' : 's'} since last client post`)
  if (c.community) {
    parts.push(
      f.lastInCommunityAt
        ? `posted in ${communityLabel(c.community)} ${Math.floor((now.getTime() - f.lastInCommunityAt.getTime()) / DAY_MS)} days ago`
        : `never posted in ${communityLabel(c.community)}`,
    )
  }
  return parts.join(' · ')
}
