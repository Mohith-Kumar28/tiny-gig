import { INDIAN_STATES } from '@/db/schema/enums'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function StateSelect({ value, onChange, id }: { value?: string; onChange: (v: string) => void; id?: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select your state" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {INDIAN_STATES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
