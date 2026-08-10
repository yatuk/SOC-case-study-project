import { useState, useEffect, useCallback } from 'react'
import { Sparkles, CheckCircle, XCircle, HelpCircle, Info } from 'lucide-react'

interface AiSummaryData {
  verdict: string
  confidence: number
  summary: string
  related_techniques?: string[]
  next_steps: string[]
}

const LOADING_STEPS = [
  'Logları okuyor...',
  'Olay context\'ini analiz ediyor...',
  'Benzer incident\'leri tarıyor...',
  'Verdict oluşturuluyor...',
]

const VERDICT_LABELS: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  true_positive_likely: { label: 'Gerçek Pozitif', color: 'text-severity-critical', icon: XCircle },
  false_positive: { label: 'Yanlış Pozitif', color: 'text-severity-low', icon: CheckCircle },
  inconclusive: { label: 'Belirsiz', color: 'text-severity-medium', icon: HelpCircle },
}

interface Props {
  data: AiSummaryData | null
  isLoading: boolean
}

export function AiSummary({ data, isLoading }: Props) {
  const [phase, setPhase] = useState<'loading' | 'typing' | 'done'>('loading')
  const [loadingStep, setLoadingStep] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const fullText = data?.summary ?? ''

  // Loading sequence
  useEffect(() => {
    if (!isLoading) {
      setPhase('typing')
      return
    }
    setPhase('loading')
    setLoadingStep(0)
    const timer = setInterval(() => {
      setLoadingStep((s) => {
        if (s >= LOADING_STEPS.length - 1) return s
        return s + 1
      })
    }, 400)
    return () => clearInterval(timer)
  }, [isLoading])

  // Typing animation
  useEffect(() => {
    if (phase !== 'typing') return
    if (typedChars >= fullText.length) {
      setPhase('done')
      return
    }
    const timer = setTimeout(() => {
      setTypedChars((c) => c + Math.ceil((fullText.length - c) / 15))
    }, 30)
    return () => clearTimeout(timer)
  }, [phase, typedChars, fullText.length])

  const skip = useCallback(() => {
    setTypedChars(fullText.length)
    setPhase('done')
  }, [fullText.length])

  const toggleStep = (i: number) => {
    setCompletedSteps((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  if (!data && !isLoading && phase !== 'loading') return null

  const verdict = VERDICT_LABELS[data?.verdict ?? ''] ?? VERDICT_LABELS.inconclusive
  const VerdictIcon = verdict.icon
  const displayed = fullText.slice(0, typedChars)

  return (
    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-purple-400">
          <Sparkles className="w-3.5 h-3.5" /> AI Özet
        </h3>
        {phase === 'typing' && (
          <button onClick={skip} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Atla →
          </button>
        )}
      </div>

      {/* Loading sequence */}
      {phase === 'loading' && (
        <div className="space-y-1.5">
          {LOADING_STEPS.map((step, i) => (
            <div key={i} className={`text-xs transition-colors duration-300 ${i <= loadingStep ? 'text-primary/70' : 'text-muted-foreground/30'}`}>
              {i <= loadingStep ? '▸' : '○'} {step}
              {i === loadingStep && <span className="animate-pulse ml-1">▌</span>}
            </div>
          ))}
        </div>
      )}

      {/* Typing / done text */}
      {(phase === 'typing' || phase === 'done') && data && (
        <>
          <div className="text-xs leading-relaxed text-foreground/85 whitespace-pre-line">
            {displayed}
            {phase === 'typing' && <span className="animate-pulse text-primary/70">▌</span>}
          </div>

          {phase === 'done' && (
            <>
              {/* Verdict pill */}
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${verdict.color} border-current/20 bg-current/5`}>
                  <VerdictIcon className="w-3 h-3" /> {verdict.label}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Güven:</span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.round((data.confidence ?? 0.4) * 100)}%` }} />
                  </div>
                  <span className="font-mono">{Math.round(data.confidence * 100)}%</span>
                </div>
              </div>

              {/* Next steps */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Önerilen Aksiyonlar</h4>
                <ul className="space-y-1">
                  {data.next_steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <button
                        onClick={() => toggleStep(i)}
                        className={`mt-0.5 shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          completedSteps.has(i)
                            ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                            : 'border-border hover:border-purple-500/30'
                        }`}
                        aria-label={step}
                      >
                        {completedSteps.has(i) ? <CheckCircle className="w-3 h-3" /> : null}
                      </button>
                      <span className={completedSteps.has(i) ? 'line-through opacity-50' : ''}>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <p className="flex items-center gap-1.5 text-2xs text-muted-foreground/60">
                <Info className="w-3 h-3 shrink-0" />
                Bu analiz yapay zeka tarafından simüle edilmiştir. Karar desteği amaçlıdır.
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
