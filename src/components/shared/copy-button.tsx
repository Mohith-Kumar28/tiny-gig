import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CopyButton({
  value,
  label,
  className,
  variant = 'ghost',
  size = 'icon',
}: {
  value: string
  label?: string
  className?: string
  variant?: 'ghost' | 'outline' | 'secondary' | 'default'
  size?: 'icon' | 'sm' | 'default'
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 1500)
  }
  const Icon = copied ? Check : Copy
  return (
    <Button
      type="button"
      variant={variant}
      size={label ? size === 'icon' ? 'sm' : size : 'icon'}
      className={cn(!label && 'size-7', className)}
      onClick={copy}
      aria-label={label ?? 'Copy'}
    >
      <Icon className="size-3.5" />
      {label}
    </Button>
  )
}
