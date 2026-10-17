import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/shared/theme-provider'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <fieldset className="inline-flex items-center gap-0.5 self-start rounded-full border p-0.5 sm:self-auto">
      <legend className="sr-only">Colour theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          aria-label={`${label} theme`}
          onClick={() => setTheme(value)}
          className={cn(
            'flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60',
            theme === value && 'bg-accent text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </fieldset>
  )
}
