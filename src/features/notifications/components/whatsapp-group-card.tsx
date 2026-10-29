import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { WhatsAppIcon } from '@/components/shared/whatsapp-icon'
import { Button } from '@/components/ui/button'
import { myWhatsappGroupQuery } from '../queries'

/** The group for the worker's level. Moves with them as their accounts level up. */
export function WhatsappGroupCard() {
  const { data: group } = useQuery(myWhatsappGroupQuery())
  if (!group) return null
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/12">
        <WhatsAppIcon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Your WhatsApp group: {group.label}</p>
        <p className="text-sm text-muted-foreground">
          Announcements, new gigs and help for {group.label} workers. Please don’t share the link.
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <a href={group.url} target="_blank" rel="noopener noreferrer">
          Join group <ExternalLink />
        </a>
      </Button>
    </div>
  )
}
