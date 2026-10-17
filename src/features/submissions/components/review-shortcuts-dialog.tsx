import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'

const SHORTCUTS: [string, string][] = [
  ['J / ↓', 'Next submission'],
  ['K / ↑', 'Previous submission'],
  ['A', 'Approve (or start live check)'],
  ['C', 'Request changes'],
  ['R', 'Reject'],
  ['O', 'Open proof link in new tab'],
  ['X', 'Select / unselect for bulk'],
  ['Shift + A', 'Approve all selected'],
  ['⌘ K', 'Search everything'],
  ['?', 'Show this help'],
]

export function ReviewShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Review a whole queue without touching the mouse.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y text-sm">
          {SHORTCUTS.map(([k, label]) => (
            <li key={k} className="flex items-center justify-between py-2">
              <span>{label}</span>
              <Kbd>{k}</Kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
