import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadEntity } from '@/lib/data'
import { SkeletonTable } from '@/components/ui/skeleton-card'
import { EmptyState } from '@/components/ui/empty-state'
import { SeverityPill } from '@/components/ui/severity-pill'
import { StatusPill } from '@/components/ui/status-pill'
import { FileSearch, User, Monitor } from 'lucide-react'

interface Case {
  case_id: string
  title: string
  severity: string
  status: string
  owner: string
  created_at: string
  updated_at: string
  affected_users: string[]
  affected_devices: string[]
  mitre_techniques: string[]
  narrative: string
  alert_ids: string[]
  evidence_count: number
}

export default function Cases() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [sevFilter, setSevFilter] = useState('all')

  useEffect(() => {
    loadEntity<Case[]>('cases.json')
      .then(setCases)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() =>
    sevFilter === 'all' ? cases : cases.filter(c => c.severity === sevFilter),
    [cases, sevFilter]
  )

  if (loading) return <div className="p-6"><SkeletonTable rows={9} /></div>

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Vaka Yönetimi</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{cases.length} vaka · SOC vaka takip sistemi</p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSevFilter(s)}
            className={`px-2 py-1 rounded-md text-xs border transition-colors ${sevFilter === s ? 'bg-primary/10 border-primary/30 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-accent'}`}
            aria-pressed={sevFilter === s}
          >
            {s === 'all' ? 'Tümü' : s === 'critical' ? 'Kritik' : s === 'high' ? 'Yüksek' : s === 'medium' ? 'Orta' : 'Düşük'}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} vaka</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileSearch className="w-8 h-8" />} title="Vaka bulunamadı" />
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.case_id} className="p-4 rounded-lg border border-border bg-card hover:border-border hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{c.case_id}</span>
                    <SeverityPill severity={c.severity as 'critical'|'high'|'medium'|'low'|'info'} />
                    <StatusPill status={c.status} />
                  </div>
                  <Link to={`/cases/${c.case_id}`} className="text-sm font-medium mt-1 hover:text-primary transition-colors">{c.title}</Link>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{c.narrative}</p>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.affected_users.length} kullanıcı</span>
                <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{c.affected_devices.length} cihaz</span>
                <span>Kanıt: {c.evidence_count}</span>
                <span className="flex items-center gap-1 flex-wrap">
                  {c.mitre_techniques.slice(0, 4).map(t => (
                    <span key={t} className="px-1 py-0.5 rounded bg-muted font-mono text-2xs">{t}</span>
                  ))}
                  {c.mitre_techniques.length > 4 && <span>+{c.mitre_techniques.length - 4}</span>}
                </span>
                <Link to={`/alerts?case=${c.case_id}`} className="ml-auto text-primary hover:underline">
                  {c.alert_ids.length} uyarı →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
