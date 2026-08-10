import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadEntity } from '@/lib/data'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { Shield, Filter, Banknote, Binary, Droplets, Eye, Flame, Ghost, Lock, MessageCircle, PackageSearch, ShieldAlert, Skull, Zap } from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{className?: string}>> = { banknote: Banknote, binary: Binary, droplets: Droplets, eye: Eye, flame: Flame, ghost: Ghost, lock: Lock, 'message-circle': MessageCircle, 'package-search': PackageSearch, 'shield-alert': ShieldAlert, skull: Skull, zap: Zap }

interface ThreatActor {
  id: string; name: string; aliases: string[]; origin: { country: string; attribution_confidence: string }; motivation: string[]; active_since: string; status: string; targeted_sectors: string[]; matched_incidents?: { incident_id: string; ttp_overlap_percent: number }[]; glyph: { color: string; icon: string }; description: string
}

const MOTIVATION_LABELS: Record<string, string> = { espionage: 'Casusluk', financial: 'Finansal', destruction: 'Yıkım', hacktivism: 'Hacktivizm', unknown: 'Bilinmiyor' }

export default function ThreatActors() {
  const [actors, setActors] = useState<ThreatActor[]>([])
  const [loading, setLoading] = useState(true)
  const [motFilter, setMotFilter] = useState('all')

  useEffect(() => { loadEntity<ThreatActor[]>('threat_actors.json').then(setActors).catch((err) => { console.error('Tehdit aktörü verisi yüklenemedi:', err) }).finally(() => setLoading(false)) }, [])

  const filtered = useMemo(() => motFilter === 'all' ? actors : actors.filter(a => a.motivation.includes(motFilter)), [actors, motFilter])
  const motivations = useMemo(() => [...new Set(actors.flatMap(a => a.motivation))], [actors])

  if (loading) return <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>)}</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Tehdit Aktörleri</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Public domain attribution verileri. Eğitim amaçlıdır.</p>
        </div>
        <span className="text-xs text-muted-foreground">{actors.length} aktör · {motivations.length} motivasyon</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-3 h-3 text-muted-foreground" />
        <button onClick={()=>setMotFilter('all')} className={`px-2 py-1 rounded-md text-xs border transition-colors ${motFilter==='all'?'bg-primary/10 border-primary/30 text-primary':'border-border text-muted-foreground hover:bg-accent'}`}>Tümü</button>
        {motivations.map(m=><button key={m} onClick={()=>setMotFilter(m)} className={`px-2 py-1 rounded-md text-xs border transition-colors ${motFilter===m?'bg-primary/10 border-primary/30 text-primary':'border-border text-muted-foreground hover:bg-accent'}`}>{MOTIVATION_LABELS[m]??m}</button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(a=>{
          const Icon = ICON_MAP[a.glyph.icon] ?? Shield
          const matchCount = a.matched_incidents?.length ?? 0
          return (
            <Link key={a.id} to={`/threat-actors/${a.id}`} className="flex flex-col p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors group">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{backgroundColor:`${a.glyph.color}15`,color:a.glyph.color}}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold group-hover:text-primary transition-colors">{a.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.aliases.slice(0,2).join(', ')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
                <span className="bg-muted px-1.5 py-0.5 rounded">{a.origin.country}</span>
                <span className="text-muted-foreground">{a.active_since}'den beri</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded font-medium ${a.status==='active'?'bg-green-500/10 text-green-400':'bg-muted text-muted-foreground'}`}>{a.status==='active'?'Aktif':a.status}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {a.motivation.slice(0,2).map(m=><span key={m} className="text-2xs bg-muted px-1 rounded text-muted-foreground">{MOTIVATION_LABELS[m]??m}</span>)}
                {a.motivation.length>2 && <span className="text-2xs text-muted-foreground">+{a.motivation.length-2}</span>}
              </div>
              {matchCount>0 && <div className="mt-auto pt-2 text-xs text-primary/70">{matchCount} incident eşleşmesi</div>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
