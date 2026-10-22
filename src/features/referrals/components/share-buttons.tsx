import { Send, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { Button } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/shared/whatsapp-icon'

/** One-tap share targets for a referral link. Native share sheet when the browser has one. */
export function ShareButtons({ link, message }: { link: string; message: string }) {
  const [canShare, setCanShare] = useState(false)
  useEffect(() => setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), [])
  const text = `${message} ${link}`
  const targets = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(text)}`, icon: <WhatsAppIcon /> },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
      icon: <Send className="size-4 text-[#229ed9]" />,
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`,
      icon: <PlatformIcon platform="x" />,
    },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {canShare ? (
        <Button
          type="button"
          onClick={() => navigator.share({ title: 'Join TinyGig', text: message, url: link }).catch(() => undefined)}
        >
          <Share2 /> Share
        </Button>
      ) : null}
      {targets.map((t) => (
        <Button key={t.label} asChild variant="outline">
          <a href={t.href} target="_blank" rel="noreferrer noopener">
            {t.icon}
            {t.label}
          </a>
        </Button>
      ))}
    </div>
  )
}
