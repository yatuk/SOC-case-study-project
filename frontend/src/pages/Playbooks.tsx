import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePlaybookDefStore, usePlaybookRunStore } from '@/store'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { Play, Clock, Activity } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = { phishing: 'Oltalama', account_compromise: 'Hesap Ele Geçirme', malware: 'Zararlı Yazılım', data_exfiltration: 'Veri Sızdırma' }

export default function Playbooks() {
  const { data: definitions, isLoading: dLoading, load: loadDef } = usePlaybookDefStore()
  const { data: runs, isLoading: rLoading, load: loadRuns } = usePlaybookRunStore()

  useEffect(() => { loadDef(); loadRuns() }, [loadDef, loadRuns])

  const playbookStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; failed: number; lastRun: typeof runs[0] | null }> = {}
    definitions.forEach((d) => {
      const pbRuns = runs.filter((r) => r.playbook_id === d.playbook_id)
      map[d.playbook_id] = {
        total: pbRuns.length,
        completed: pbRuns.filter((r) => r.status === 'completed').length,
        failed: pbRuns.filter((r) => r.status === 'failed').length,
        lastRun: pbRuns.sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null,
      }
    })
    return map
  }, [definitions, runs])

  if (dLoading || rLoading) return <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>

  return (
    <div className="p-6 space-y-4">
      {/* Playbook definitions */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Playbook Tanımları ({definitions.length})</h2>
        {definitions.length === 0 ? (
          <EmptyState icon={<Play className="w-6 h-6" />} title="Tanımlı playbook yok" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {definitions.map((pb) => {
              const stats = playbookStats[pb.playbook_id]
              return (
                <Link key={pb.playbook_id} to={`/playbooks/${pb.playbook_id}`} className="flex flex-col p-4 rounded-lg border border-border hover:border-border hover:bg-muted/30 transition-colors group">
                  <div className="flex items-start gap-3 mb-3">
                    <Play className="w-4 h-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium group-hover:text-primary transition-colors">{pb.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{pb.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto">
                    <span className="bg-muted px-1.5 py-0.5 rounded">{CATEGORY_LABELS[pb.category] ?? pb.category}</span>
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{pb.steps.length} adım</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{pb.estimated_duration_seconds}s</span>
                    {stats && (
                      <span className="ml-auto font-mono">
                        <span className="text-status-completed">{stats.completed}</span>
                        {stats.failed > 0 && <span className="text-status-failed">/{stats.failed}</span>}
                        /{stats.total} run
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Run history */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Çalıştırma Geçmişi ({runs.length})</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Run ID</th>
                <th className="text-left px-3 py-2 font-medium">Playbook</th>
                <th className="text-left px-3 py-2 font-medium">Olay</th>
                <th className="text-left px-3 py-2 font-medium">Durum</th>
                <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Süre</th>
                <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Başlatan</th>
              </tr>
            </thead>
            <tbody>
              {[...runs].sort((a, b) => b.started_at.localeCompare(a.started_at)).map((r) => {
                const def = definitions.find((d) => d.playbook_id === r.playbook_id)
                return (
                  <tr key={r.run_id} className="border-b border-border last:border-0 even:bg-muted/5 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-3 py-2 font-mono text-xs">{r.run_id}</td>
                    <td className="px-3 py-2">
                      <Link to={`/playbooks/${r.playbook_id}`} className="hover:text-primary transition-colors">{def?.name ?? r.playbook_id}</Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link to={`/incidents/${r.incident_id}`} className="text-primary hover:underline">{r.incident_id}</Link>
                    </td>
                    <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{r.duration_seconds}s</td>
                    <td className="px-3 py-2 text-muted-foreground hidden lg:table-cell">{r.triggered_by}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
