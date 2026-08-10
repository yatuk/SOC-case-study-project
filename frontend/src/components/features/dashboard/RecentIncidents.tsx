import { Link } from 'react-router-dom'
import { SeverityPill } from '@/components/ui/severity-pill'
import { StatusPill } from '@/components/ui/status-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { FileSearch } from 'lucide-react'
import type { Incident } from '@/types'

interface Props {
  incidents: Incident[]
  isLoading: boolean
}

export function RecentIncidents({ incidents, isLoading }: Props) {
  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Son Olaylar</h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-card animate-pulse"><div className="p-3"><div className="h-3 w-48 bg-muted rounded mb-2" /><div className="h-3 w-32 bg-muted rounded" /></div></div>
          ))}
        </div>
      </section>
    )
  }

  if (incidents.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-semibold mb-3">Son Olaylar</h2>
        <EmptyState icon={<FileSearch className="w-6 h-6" />} title="Henüz olay kaydı yok" description="Sakin bir gün. Kahvenizi yudumlayın." />
      </section>
    )
  }

  const recent = [...incidents].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Son Olaylar</h2>
        <Link to="/incidents" className="text-xs text-primary hover:underline">Tümü</Link>
      </div>
      <div className="space-y-2">
        {recent.map((inc) => (
          <Link
            key={inc.incident_id}
            to={`/incidents/${inc.incident_id}`}
            className="flex items-start gap-3 p-3 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-colors group"
          >
            <div className="shrink-0 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${inc.severity === 'critical' ? 'bg-severity-critical' : inc.severity === 'high' ? 'bg-severity-high' : 'bg-severity-medium'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-medium group-hover:text-primary transition-colors">{inc.title}</span>
                <SeverityPill severity={inc.severity} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{inc.incident_id}</span>
                <span>•</span>
                <StatusPill status={inc.status} />
                <span>•</span>
                <span>{new Date(inc.created_at).toLocaleDateString('tr-TR')}</span>
                <span>•</span>
                <span>{inc.assignee ?? 'Atanmamış'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{inc.summary}</p>
            </div>
            <span className="text-muted-foreground/30 text-xs shrink-0 mt-1 hidden sm:block">→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
