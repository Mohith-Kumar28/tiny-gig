import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  ClipboardCheck,
  Gift,
  Inbox,
  LayoutDashboard,
  Mail,
  Search,
  Settings,
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
}

export const WORKER_NAV: NavItem[] = [
  { to: '/w', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/w/gigs', label: 'Find gigs', icon: Search },
  { to: '/w/work', label: 'My work', icon: ClipboardCheck, badgeKey: 'active' },
  { to: '/w/payments', label: 'Payments', icon: Wallet },
  { to: '/w/referrals', label: 'Referrals', icon: Gift },
  { to: '/w/profile', label: 'Profile', icon: UserRound },
]

export const ADMIN_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Work',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { to: '/admin/review', label: 'Review inbox', icon: Inbox, badgeKey: 'needs_review' },
      { to: '/admin/gigs', label: 'Gigs', icon: Briefcase },
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
    ],
  },
]
