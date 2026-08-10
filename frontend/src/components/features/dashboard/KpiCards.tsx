import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileSearch, Clock, Activity, ShieldAlert, Users, Monitor, TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react'
import { Abbr } from '@/components/ui/abbreviation'
import { useTranslation } from '@/i18n'
import type { KPIMetrics } from '@/types'

interface Props {
  kpi: KPIMetrics | null
  isLoading: boolean
}

export function KpiCards({ kpi, isLoading }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const delta = useMemo(() => {
    if (!kpi) return { alerts: null as number | null, incidents: null as number | null, mttd: null as number | null, mttr: null as number | null }
    const days = kpi.alert_volume_daily
    if (days.length < 2) return { alerts: null, incidents: null, mttd: null, mttr: null }
    const curr = days[days.length - 1].count
    const prev = days[days.length - 2].count
    const deltaPct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null
    return { alerts: deltaPct, incidents: null, mttd: null, mttr: null }
  }, [kpi])

  const cards = [
    { icon: AlertTriangle, label: t('dashboard.openAlerts'), labelFull: undefined as string | undefined, value: kpi?.open_alerts ?? '—', sub: `${kpi?.critical_alerts ?? 0} ${t('dashboard.criticalAlerts').toLowerCase()}`, delta: delta.alerts, route: '/alerts?status=new' },
    { icon: FileSearch, label: t('dashboard.activeIncidents'), labelFull: undefined as string | undefined, value: kpi?.active_incidents ?? '—', sub: `${kpi?.total_incidents ?? 0} ${t('dashboard.totalIncidents')?.toLowerCase?.() ?? 'toplam'}`, delta: null, route: '/incidents?status=open' },
    { icon: ShieldAlert, label: t('dashboard.fpRate'), labelFull: t('dashboard.fpRateDesc'), value: kpi ? `%${kpi.false_positive_rate}` : '—', sub: t('dashboard.fpRateSub'), delta: null, route: null },
    { icon: Users, label: t('dashboard.highRiskUsers'), labelFull: undefined, value: kpi?.high_risk_users ?? '—', sub: `${kpi?.total_users ?? 0} ${t('dashboard.totalUsers')?.toLowerCase?.() ?? 'toplam'}`, delta: null, route: '/users' },
    { icon: Clock, label: 'MTTD', labelFull: 'Mean Time To Detect — Tehdidin sistemde var olduğu andan tespit edildiği ana kadar geçen ortalama süre', value: kpi ? `${Math.round(kpi.mttd_seconds / 60)} ${t('dashboard.minutes')}` : '—', sub: t('dashboard.mttd'), delta: null, route: null },
    { icon: Activity, label: 'MTTR', labelFull: 'Mean Time To Respond — Tespit edilen tehdide müdahale edilene kadar geçen ortalama süre', value: kpi ? `${Math.round(kpi.mttr_seconds / 60)} ${t('dashboard.minutes')}` : '—', sub: t('dashboard.mttr'), delta: null, route: null },
    { icon: Monitor, label: t('dashboard.isolatedAssets'), labelFull: undefined, value: kpi?.isolated_assets ?? '—', sub: `${kpi?.total_assets ?? 0} ${t('dashboard.totalAssets')?.toLowerCase?.() ?? 'cihaz'}`, delta: null, route: '/endpoints' },
    { icon: AlertTriangle, label: t('dashboard.totalAlerts'), labelFull: undefined, value: kpi?.total_alerts ?? '—', sub: `${t('dashboard.openAlerts')}: ${kpi?.open_alerts ?? 0}`, delta: null, route: '/alerts' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ icon: Icon, label, labelFull, value, sub, delta: d, route }) => {
        const clickable = !!route
        const klik = () => { if (route) navigate(route) }
        return (
        <div key={label} onClick={clickable ? klik : undefined} className={`rounded-lg border border-border bg-card p-4 ${clickable ? 'cursor-pointer hover:border-primary/30 hover:-translate-y-0.5 transition-[transform,border-color] group' : ''}`}>
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs truncate">
              {labelFull ? <Abbr abbr={label} term={labelFull} /> : label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <span className="text-2xl font-bold tabular-nums">{value}</span>
            )}
            {d !== null && (
              <span className={`inline-flex items-center text-xs font-medium ${d > 0 ? 'text-severity-critical' : d < 0 ? 'text-severity-low' : 'text-muted-foreground'}`} aria-label={`${t('dashboard.vsYesterday')}: %${d}`}>
                {d > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : d < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                {d > 0 ? '↑' : d < 0 ? '↓' : '–'}{Math.abs(d)}%
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
          {clickable && <ArrowUpRight className="absolute top-3 right-3 w-3 h-3 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />}
        </div>
        )
      })}
    </div>
  )
}
