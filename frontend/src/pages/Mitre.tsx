import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Treemap, Tooltip, ResponsiveContainer } from 'recharts'
import { useMitreStore, useAlertStore, useDetectionStore } from '@/store'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { SeverityPill } from '@/components/ui/severity-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { useTranslation } from '@/i18n'
import { Target, X, ChevronRight, Search, Grid3X3, LayoutTemplate } from 'lucide-react'
import type { MitreTechnique } from '@/types'

type ViewMode = 'grid' | 'treemap'

const TACTIC_COLORS: Record<string, string> = {
  TA0001: '#3b82f6', TA0002: '#8b5cf6', TA0003: '#f59e0b',
  TA0004: '#f97316', TA0005: '#06b6d4', TA0006: '#ef4444',
  TA0007: '#84cc16', TA0008: '#ec4899', TA0009: '#14b8a6',
  TA0010: '#f43f5e', TA0011: '#6366f1', TA0040: '#0ea5e9',
}

function coverageScore(t: MitreTechnique): number {
  if (!t.is_covered) return 0
  // Normalize alert_count to 0-100 score. Max expected alerts per technique ~50
  const score = Math.min(100, Math.round((t.alert_count / 25) * 100))
  return Math.max(10, score) // minimum 10 for covered techniques (visually distinct from 0)
}

function scoreColor(score: number): string {
  if (score === 0) return 'hsl(var(--muted))'
  if (score < 20) return '#d29922'
  if (score < 50) return '#f0883e'
  if (score < 80) return '#f85149'
  return '#ab0000'
}

export default function Mitre() {
  const { t } = useTranslation()
  const { data: mitre, isLoading, load: loadMitre } = useMitreStore()
  const { data: alerts, load: loadAlerts } = useAlertStore()
  const { data: detectionRules, load: loadDetections } = useDetectionStore()
  const [selectedTech, setSelectedTech] = useState<MitreTechnique | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  useEffect(() => { loadMitre(); loadAlerts(); loadDetections() }, [loadMitre, loadAlerts, loadDetections])

  const grouped = useMemo(() => {
    if (!mitre) return []
    const map = new Map<string, MitreTechnique[]>()
    mitre.tactics.forEach((t) => map.set(t.tactic_id, []))
    mitre.techniques.forEach((tech) => {
      const arr = map.get(tech.tactic_id)
      if (arr) arr.push(tech)
      else map.set(tech.tactic_id, [tech])
    })
    const searchLower = search.toLowerCase()
    return mitre.tactics
      .map((tactic) => ({
        tactic,
        techniques: (map.get(tactic.tactic_id) ?? [])
          .filter((tech) => !searchLower || tech.technique_id.toLowerCase().includes(searchLower) || tech.name.toLowerCase().includes(searchLower)),
      }))
      .filter((g) => g.techniques.length > 0)
  }, [mitre, search])

  // Treemap hierarchical data
  const treemapData = useMemo(() => {
    if (!mitre) return { name: 'root', children: [] as Array<Record<string, unknown>> }
    return {
      name: 'MITRE ATT&CK',
      children: grouped.filter(g => g.techniques.length > 0).map((g) => ({
        name: g.tactic.name,
        children: g.techniques.map((tech) => ({
          name: tech.technique_id,
          size: Math.max(1, tech.alert_count),
          fill: scoreColor(coverageScore(tech)),
          technique: tech,
        })),
      })),
    }
  }, [mitre, grouped])

  const selectedAlerts = useMemo(() => {
    if (!selectedTech) return []
    return alerts.filter((a) => a.mitre_technique_ids?.includes(selectedTech.technique_id))
  }, [selectedTech, alerts])

  const selectedRules = useMemo(() => {
    if (!selectedTech) return []
    return detectionRules.filter((r) => r.mitre_technique_ids?.includes(selectedTech.technique_id))
  }, [selectedTech, detectionRules])

  if (isLoading) return <div className="p-6"><SkeletonCard className="h-96" /></div>
  if (!mitre) return <div className="p-6"><EmptyState icon={<Target className="w-8 h-8" />} title={t('error.dataLoad')} /></div>

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t('mitre.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {mitre.summary.covered_techniques}/{mitre.summary.total_techniques} {t('mitre.coverage').toLowerCase()}
            <span className="mx-2">•</span>
            %{mitre.summary.coverage_percent} {t('mitre.coverage').toLowerCase()}
            <span className="mx-2">•</span>
            {mitre.summary.total_observations} {t('mitre.alertCount').toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('mitre.searchTechnique')}
              className="pl-7 pr-3 py-1.5 text-xs rounded-md border border-border bg-muted/30 focus:bg-card focus:border-primary/50 focus:outline-none w-48"
            />
          </div>
          {/* View toggle */}
          <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5">
            <button onClick={() => setViewMode('grid')} className={`px-2 py-1 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-card text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`} aria-label={t('mitre.gridView')}>
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('treemap')} className={`px-2 py-1 rounded-sm transition-colors ${viewMode === 'treemap' ? 'bg-card text-foreground border border-border' : 'text-muted-foreground hover:text-foreground'}`} aria-label={t('mitre.treemapView')}>
              <LayoutTemplate className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend (score gradient) */}
      <div className="flex items-center gap-2 text-2xs text-muted-foreground">
        <span>{t('mitre.coverage')}:</span>
        <span className="flex items-center gap-0.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--muted))' }} />
          0%
        </span>
        <span className="w-16 h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #d29922, #f0883e, #f85149, #ab0000)' }} />
        <span className="flex items-center gap-0.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: '#ab0000' }} />
          100%
        </span>
      </div>

      {/* View: Grid */}
      {viewMode === 'grid' && (
        <div className="overflow-x-auto border border-border rounded-lg bg-card" role="grid" aria-label={t('mitre.title')}>
          <div className="flex" style={{ minWidth: grouped.length * 150 }}>
            {grouped.map(({ tactic, techniques }) => (
              <div key={tactic.tactic_id} className="flex-shrink-0 flex flex-col border-r border-border last:border-r-0" style={{ width: 150 }}>
                {/* Tactic header */}
                <div className="sticky top-0 z-10 px-2.5 py-2 bg-card border-b border-border" style={{ borderTopColor: TACTIC_COLORS[tactic.tactic_id] ?? 'hsl(var(--border))', borderTopWidth: 3 }}>
                  <div className="text-xs font-semibold leading-tight">{tactic.name}</div>
                  <div className="text-2xs text-muted-foreground">{tactic.technique_count} {t('mitre.tacticCols').toLowerCase()}</div>
                </div>
                {/* Technique cells */}
                <div className="flex-1 flex flex-col gap-px bg-muted/20 p-px">
                  {techniques.length === 0 && <div className="text-2xs text-muted-foreground p-3 text-center">{t('mitre.noMatch')}</div>}
                  {techniques.map((tech) => {
                    const score = coverageScore(tech)
                    const color = scoreColor(score)
                    const isSelected = selectedTech?.technique_id === tech.technique_id
                    return (
                      <button
                        key={tech.technique_id}
                        onClick={() => tech.is_covered && setSelectedTech(tech)}
                        disabled={!tech.is_covered}
                        className={`w-full text-left px-2 py-2 transition-[filter] border border-transparent ${
                          tech.is_covered ? 'hover:brightness-110 cursor-pointer' : 'opacity-30 cursor-default'
                        } ${isSelected ? 'ring-2 ring-primary z-10 relative' : ''}`}
                        style={{ background: color }}
                        aria-label={`${tech.technique_id}: ${tech.name} (${score}%)`}
                        title={`${tech.technique_id}: ${tech.name} — ${score}% coverage, ${tech.alert_count} alerts`}
                      >
                        <div className="font-mono font-bold text-2xs leading-tight">{tech.technique_id}</div>
                        <div className="text-2xs leading-tight mt-0.5 line-clamp-2">{tech.name}</div>
                        {tech.alert_count > 0 && (
                          <span className="inline-block mt-1.5 text-2xs bg-white/20 text-white px-1 rounded font-medium">{tech.alert_count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View: Treemap */}
      {viewMode === 'treemap' && (
        <div className="rounded-lg border border-border bg-card overflow-hidden" style={{ height: 480 }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap data={treemapData.children} dataKey="size" aspectRatio={4/3} stroke="hsl(var(--border))" fill="hsl(var(--muted))">
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: 11 }}
                formatter={(_val, _name, props) => {
                  const tech = (props?.payload as Record<string, unknown>)?.technique as MitreTechnique | undefined
                  if (!tech) return ['', '']
                  return [`${tech.alert_count} ${t('mitre.alertCount').toLowerCase()}`, `${tech.technique_id}: ${tech.name}`]
                }}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}

      {/* Mobile: accordion fallback */}
      <div className="lg:hidden space-y-2" role="list" aria-label={t('mitre.title')}>
        {grouped.map(({ tactic, techniques }) => (
          <details key={tactic.tactic_id} className="rounded-lg border border-border bg-card">
            <summary className="px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-accent transition-colors">{tactic.name} ({tactic.technique_count})</summary>
            <div className="px-3 pb-3 space-y-1">
              {techniques.map((tech) => {
                const score = coverageScore(tech)
                return (
                  <div key={tech.technique_id} className="flex items-center gap-2 text-xs py-1">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: scoreColor(score) }} />
                    <span className="font-mono">{tech.technique_id}</span>
                    <span className="text-muted-foreground">{tech.name}</span>
                    <span className="ml-auto text-xs">{tech.alert_count}</span>
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>

      {/* Technique detail drawer */}
      {selectedTech && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTech(null)} onKeyDown={(e) => e.key === 'Escape' && setSelectedTech(null)} role="button" tabIndex={0} aria-label={t('common.close')} />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border shadow-2xl overflow-y-auto animate-slide-in-right" role="dialog" aria-modal="true" aria-label={selectedTech.name}>
            <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <span className="font-mono text-xs text-primary">{selectedTech.technique_id}</span>
                <h3 className="text-sm font-semibold">{selectedTech.name}</h3>
              </div>
              <button onClick={() => setSelectedTech(null)} className="p-1 rounded hover:bg-accent" aria-label={t('common.close')}><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">{t('mitre.coverage')}:</span> <span className="font-bold" style={{ color: scoreColor(coverageScore(selectedTech)) }}>%{coverageScore(selectedTech)}</span></div>
                <div><span className="text-muted-foreground">{t('mitre.alertCount')}:</span> <span className="font-mono font-bold">{selectedTech.alert_count}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">{t('alerts.status')}:</span> {selectedTech.is_covered ? `✅ ${t('common.enabled')}` : `❌ ${t('common.disabled')}`}</div>
              </div>

              {/* Detection rules */}
              {selectedRules.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('detections.title')} ({selectedRules.length})</h4>
                  <div className="space-y-1.5">
                    {selectedRules.map((rule) => (
                      <div key={rule.rule_id} className="p-2 rounded-lg border border-border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{rule.rule_id}</span>
                          <SeverityPill severity={rule.severity} />
                        </div>
                        <div className="font-medium mt-0.5">{rule.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related alerts */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('incidentDetail.alerts')} ({selectedAlerts.length})</h4>
                {selectedAlerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('incidentDetail.noAlerts')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedAlerts.slice(0, 20).map((a) => (
                      <Link key={a.alert_id} to={`/alerts/${a.alert_id}`} onClick={() => setSelectedTech(null)} className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent transition-colors text-xs">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{a.title}</div>
                          <div className="text-muted-foreground font-mono mt-0.5">{a.alert_id} • {new Date(a.detected_at).toLocaleDateString('tr-TR')}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <SeverityPill severity={a.severity} />
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                    {selectedAlerts.length > 20 && (
                      <p className="text-xs text-muted-foreground text-center py-1">{t('alerts.title')}: +{selectedAlerts.length - 20} {t('alerts.title').toLowerCase()}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Linked incidents */}
              {selectedTech.incident_ids.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('incidents.title')}</h4>
                  <div className="space-y-1">
                    {selectedTech.incident_ids.map((iid) => (
                      <Link key={iid} to={`/incidents/${iid}`} onClick={() => setSelectedTech(null)} className="flex items-center gap-1 text-xs font-mono text-primary hover:underline">{iid}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
