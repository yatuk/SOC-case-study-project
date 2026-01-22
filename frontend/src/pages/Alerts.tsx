import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertsTable } from '@/components/dashboard/AlertsTable'
import { useDataStore } from '@/store'
import { useComputedData } from '@/hooks/useData'
import { KPICard } from '@/components/dashboard/KPICard'
import { ShieldAlert, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

export default function Alerts() {
  const { alerts, isLoading } = useDataStore()
  const { totalAlerts, criticalAlerts, severityCounts } = useComputedData()

  const highAlerts = severityCounts['high'] || 0
  const openAlerts = alerts.length // Would filter by status in real app

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Toplam Uyarı"
          value={totalAlerts}
          icon={ShieldAlert}
          iconColor="text-blue-400"
          loading={isLoading}
        />
        <KPICard
          title="Kritik"
          value={criticalAlerts}
          icon={AlertTriangle}
          iconColor="text-red-400"
          loading={isLoading}
        />
        <KPICard
          title="Yüksek"
          value={highAlerts}
          icon={Clock}
          iconColor="text-orange-400"
          loading={isLoading}
        />
        <KPICard
          title="Açık"
          value={openAlerts}
          icon={CheckCircle}
          iconColor="text-green-400"
          loading={isLoading}
        />
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tüm Uyarılar</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertsTable alerts={alerts} loading={isLoading} pageSize={15} />
        </CardContent>
      </Card>
    </div>
  )
}
