import { Send, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PlatformIcon } from '@/components/shared/platform-icon'
import { Button } from '@/components/ui/button'

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-[#25d366]">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.7.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  )
}

/** One-tap share targets for a referral link. Native share sheet when the browser has one. */
export function ShareButtons({ link, message }: { link: string; message: string }) {
  const [canShare, setCanShare] = useState(false)
  useEffect(() => setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), [])
  const text = `${message} ${link}`
  const targets = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(text)}`, icon: <WhatsAppIcon /> },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`, icon: <Send className="size-4 text-[#229ed9]" /> },
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
