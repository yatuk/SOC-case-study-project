import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DevicesTable } from '@/components/dashboard/DevicesTable'
import { useDataStore, useEDRStore } from '@/store'
import { KPICard } from '@/components/dashboard/KPICard'
import { Monitor, ShieldOff, AlertTriangle, Shield } from 'lucide-react'

export default function Devices() {
  const { devices, isLoading } = useDataStore()
  const { edrState } = useEDRStore()

  const isolatedCount = useMemo(() => {
    return Object.values(edrState).filter((s) => s.isolated).length
  }, [edrState])

  const highRiskCount = useMemo(() => {
    return devices.filter((d) => (d.risk_score || 0) >= 70).length
  }, [devices])

  const totalAlerts = useMemo(() => {
    return devices.reduce((sum, d) => sum + (d.open_alerts || 0), 0)
  }, [devices])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Toplam Cihaz"
          value={devices.length}
          icon={Monitor}
          iconColor="text-blue-400"
          loading={isLoading}
        />
        <KPICard
          title="İzole Edilmiş"
          value={isolatedCount}
          icon={ShieldOff}
          iconColor="text-orange-400"
          loading={isLoading}
        />
        <KPICard
          title="Yüksek Riskli"
          value={highRiskCount}
          icon={AlertTriangle}
          iconColor="text-red-400"
          loading={isLoading}
        />
        <KPICard
          title="Açık Uyarılar"
          value={totalAlerts}
          icon={Shield}
          iconColor="text-purple-400"
          loading={isLoading}
        />
      </div>

      {/* Devices Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Cihaz Envanteri (EDR)</CardTitle>
        </CardHeader>
        <CardContent>
          <DevicesTable devices={devices} loading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
