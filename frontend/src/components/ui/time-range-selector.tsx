import { cn } from '@/lib/utils'

type TimeRange = '24h' | '7d' | '30d' | '60d'

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (range: TimeRange) => void
  className?: string
}

const RANGES: { key: TimeRange; labelTR: string; labelEN: string }[] = [
  { key: '24h', labelTR: '24s', labelEN: '24h' },
  { key: '7d', labelTR: '7g', labelEN: '7d' },
  { key: '30d', labelTR: '30g', labelEN: '30d' },
  { key: '60d', labelTR: '60g', labelEN: '60d' },
]

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <div className={cn('inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5', className)} role="radiogroup" aria-label="Zaman aralığı">
      {RANGES.map(({ key, labelTR }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-sm transition-colors',
            value === key
              ? 'bg-card text-foreground border border-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
          role="radio"
          aria-checked={value === key}
        >
          {labelTR}
        </button>
      ))}
    </div>
  )
}

export type { TimeRange }
