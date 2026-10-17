import { useEffect, useRef } from 'react'

type Handler = (e: KeyboardEvent) => void

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/**
 * Single-key shortcuts (e.g. `j`, `a`, `shift+a`, `mod+k`). Ignored while typing
 * unless the binding uses a modifier.
 */
export function useHotkeys(bindings: Record<string, Handler>, enabled = true) {
  const ref = useRef(bindings)
  ref.current = bindings
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const parts = [mod && 'mod', e.shiftKey && 'shift', e.altKey && 'alt', e.key.toLowerCase()].filter(Boolean)
      const combo = parts.join('+')
      const handler = ref.current[combo] ?? (!mod && !e.altKey ? ref.current[e.key] : undefined)
      if (!handler) return
      if (!mod && isTyping(e.target)) return
      if (document.querySelector('[data-slot="dialog-content"], [data-slot="alert-dialog-content"], [data-slot="popover-content"], [data-slot="dropdown-menu-content"]') && !combo.startsWith('mod')) return
      e.preventDefault()
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
