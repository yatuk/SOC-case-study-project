import { Card, Title, Text, Metric, AreaChart, DonutChart, BarList } from '@tremor/react'
import { useDataStore } from '@/store'
import { useComputedData } from '@/hooks/useData'
import { generateTimeSeriesData, generateMitreStats } from '@/lib/mockData'
import { TrendingUp, AlertTriangle, Shield, Clock } from 'lucide-react'

export default function ExecutiveOverview() {
  const { alerts, cases } = useDataStore()
  const { totalEvents, totalAlerts, criticalAlerts, openCases } = useComputedData()

  const timeSeriesData = generateTimeSeriesData(24)
  const mitreStats = generateMitreStats()

  // KPI data
  const kpis = [
    {
      title: 'Toplam Olaylar',
      metric: totalEvents.toLocaleString(),
      icon: TrendingUp,
      color: 'blue',
    },
    {
      title: 'Aktif Uyarılar',
      metric: totalAlerts.toLocaleString(),
      icon: AlertTriangle,
      color: 'orange',
    },
    {
      title: 'Kritik Uyarılar',
      metric: criticalAlerts.toLocaleString(),
      icon: Shield,
      color: 'red',
    },
    {
      title: 'Açık Vakalar',
      metric: openCases.toLocaleString(),
      icon: Clock,
      color: 'purple',
    },
  ]

  // Severity distribution for donut chart
  const severityData = [
    { name: 'Kritik', value: alerts.filter((a) => a.severity === 'critical').length },
    { name: 'Yüksek', value: alerts.filter((a) => a.severity === 'high').length },
    { name: 'Orta', value: alerts.filter((a) => a.severity === 'medium').length },
    { name: 'Düşük', value: alerts.filter((a) => a.severity === 'low').length },
  ]

  // Event trend data
  const eventTrendData = timeSeriesData.map((d) => ({
    Saat: `${d.hour}:00`,
    'Olaylar': d.events,
    'Uyarılar': d.alerts,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Title>Executive Overview</Title>
        <Text>Güvenlik operasyonlarının üst düzey görünümü</Text>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} decoration="top" decorationColor={kpi.color as any}>
            <div className="flex items-start justify-between">
              <div>
                <Text>{kpi.title}</Text>
                <Metric className="text-glow-cyan">{kpi.metric}</Metric>
              </div>
              <kpi.icon className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Event Trend */}
        <Card>
          <Title>24 Saatlik Olay Trendi</Title>
          <AreaChart
            className="mt-4 h-72"
            data={eventTrendData}
            index="Saat"
            categories={['Olaylar', 'Uyarılar']}
            colors={['cyan', 'amber']}
            valueFormatter={(value) => value.toLocaleString()}
          />
        </Card>

        {/* Severity Distribution */}
        <Card>
          <Title>Severity Dağılımı</Title>
          <DonutChart
            className="mt-4 h-72"
            data={severityData}
            category="value"
            index="name"
            colors={['red', 'orange', 'yellow', 'emerald']}
            valueFormatter={(value) => value.toLocaleString()}
          />
        </Card>
      </div>

      {/* MITRE ATT&CK Coverage */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <Title>MITRE ATT&amp;CK Tactic Dağılımı</Title>
            <Text>
              Toplam {mitreStats.coverage.detected}/{mitreStats.coverage.total} teknik tespit edildi (
              {mitreStats.coverage.percent}%)
            </Text>
          </div>
          <div className="text-right">
            <Metric>{mitreStats.coverage.percent}%</Metric>
            <Text>Kapsama</Text>
          </div>
        </div>
        <BarList
          data={mitreStats.tactics.map((t) => ({
            name: t.name,
            value: t.count,
            color: t.color,
          }))}
          className="mt-4"
        />
      </Card>

      {/* Recent Cases Summary */}
      <Card>
        <Title>Son Vakalar</Title>
        <div className="mt-4 space-y-3">
          {cases.slice(0, 5).map((c) => (
            <div key={c.case_id} className="flex items-center justify-between border-l-4 border-orange-500 pl-4 py-2">
              <div>
                <Text className="font-medium">{c.title}</Text>
                <Text className="text-sm text-gray-500">{c.narrative}</Text>
              </div>
              <div className="text-right">
                <Text className="text-sm font-medium capitalize">{c.severity}</Text>
                <Text className="text-xs text-gray-500">{c.status}</Text>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
