import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

export function ReviewScreenshots({ keys }: { keys: string[] }) {
  const [index, setIndex] = useState<number | null>(null)
  if (!keys.length) return null
  const current = index != null ? keys[index] : null
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {keys.map((k, i) => (
          <button
            key={k}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
          >
            <img
              src={`/api/uploads/${k}`}
              alt={`Screenshot ${i + 1}`}
              loading="lazy"
              className="size-full object-cover object-top transition group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>
      <Dialog open={index != null} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent className="max-w-[min(1100px,95vw)] gap-3 p-3 sm:max-w-[min(1100px,95vw)]">
          <DialogTitle className="sr-only">Screenshot</DialogTitle>
          {current ? (
            <img src={`/api/uploads/${current}`} alt="Screenshot" className="max-h-[80vh] w-full rounded-md object-contain" />
          ) : null}
          {keys.length > 1 && index != null ? (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setIndex((index - 1 + keys.length) % keys.length)}>
                <ChevronLeft /> Prev
              </Button>
              <span className="text-sm text-muted-foreground tabular">
                {index + 1} / {keys.length}
              </span>
              <Button variant="outline" size="sm" onClick={() => setIndex((index + 1) % keys.length)}>
                Next <ChevronRight />
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
