import type { LucideIcon } from 'lucide-react'
import {
  AtSign,
  Briefcase,
  Building2,
  CircleUserRound,
  ClipboardCheck,
  Gift,
  House,
  Inbox,
  LayoutDashboard,
  Mail,
  Newspaper,
  Search,
  Settings,
  Sprout,
  UserCheck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badgeKey?: string
  /** Path prefix that marks this item active (defaults to `to`). */
  match?: string | string[]
}

export function isNavActive(item: NavItem, pathname: string) {
  if (item.exact) return pathname === item.to
  const bases = Array.isArray(item.match) ? item.match : [item.match ?? item.to]
  return bases.some((b) => pathname === b || pathname.startsWith(`${b}/`))
}

export const WORKER_NAV: NavItem[] = [
  { to: '/w', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/w/gigs', label: 'Find gigs', icon: Search },
  { to: '/w/work', label: 'My work', icon: ClipboardCheck, badgeKey: 'active' },
  { to: '/w/payments', label: 'Earnings', icon: Wallet },
  { to: '/w/accounts', label: 'My accounts', icon: AtSign },
  { to: '/w/warmup', label: 'Warm-up', icon: Sprout },
  { to: '/w/referrals', label: 'Referrals', icon: Gift },
  { to: '/w/profile', label: 'Profile', icon: UserRound },
]

/** Phone tab bar: the four daily destinations + a "Me" hub for everything else. */
export const WORKER_BOTTOM_NAV: NavItem[] = [
  { to: '/w', label: 'Home', icon: House, exact: true },
  { to: '/w/gigs', label: 'Gigs', icon: Search },
  { to: '/w/work', label: 'My work', icon: ClipboardCheck, badgeKey: 'active' },
  { to: '/w/payments', label: 'Earnings', icon: Wallet },
  { to: '/w/me', label: 'Me', icon: CircleUserRound, match: ['/w/me', '/w/accounts', '/w/warmup', '/w/profile', '/w/referrals', '/w/notifications'] },
]

export const ADMIN_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Work',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { to: '/admin/accounts', label: 'Accounts', icon: AtSign },
      { to: '/admin/review', label: 'Review inbox', icon: Inbox, badgeKey: 'needs_review' },
      { to: '/admin/gigs', label: 'Gigs', icon: Briefcase, badgeKey: 'to_select' },
      { to: '/admin/clients', label: 'Clients', icon: Building2 },
      { to: '/admin/posts', label: 'Post log', icon: Newspaper },
      { to: '/admin/warmup', label: 'Warm-up', icon: Sprout },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/applicants', label: 'Applicants', icon: UserCheck, badgeKey: 'pending_applicants' },
      { to: '/admin/workers', label: 'Workers', icon: Users },
      { to: '/admin/referrals', label: 'Referrals', icon: Gift, badgeKey: 'rewards_pending' },
    ],
  },
  {
    label: 'Money & system',
    items: [
      { to: '/admin/payouts', label: 'Payouts', icon: Wallet },
      { to: '/admin/emails', label: 'Email log', icon: Mail },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      { to: '/account/settings', label: 'Account', icon: CircleUserRound, match: '/account' },
    ],
  },
]
