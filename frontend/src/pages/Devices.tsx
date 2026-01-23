import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeviceDetailModal } from '@/components/edr/DeviceDetailModal'
import { useDataStore, useEDRStore } from '@/store'
import { KPICard } from '@/components/dashboard/KPICard'
import { Badge } from '@/components/ui/badge'
import { Monitor, ShieldOff, AlertTriangle, Shield, Eye } from 'lucide-react'
import type { Device } from '@/types'

export default function Devices() {
  const { devices, isLoading } = useDataStore()
  const { edrState } = useEDRStore()
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const isolatedCount = useMemo(() => {
    return Object.values(edrState).filter((s) => s.isolated).length
  }, [edrState])

  const highRiskCount = useMemo(() => {
    return devices.filter((d) => (d.risk_score || 0) >= 70).length
  }, [devices])

  const totalAlerts = useMemo(() => {
    return devices.reduce((sum, d) => sum + (d.open_alerts || 0), 0)
  }, [devices])

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device)
    setDetailOpen(true)
  }

  const getRiskColor = (score?: number) => {
    if (!score) return 'bg-gray-500/20'
    if (score >= 80) return 'bg-red-500/20 border-red-500/30'
    if (score >= 60) return 'bg-orange-500/20 border-orange-500/30'
    if (score >= 40) return 'bg-yellow-500/20 border-yellow-500/30'
    return 'bg-green-500/20 border-green-500/30'
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">EDR - Endpoint Detection & Response</h2>
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
      </div>

      {/* Devices Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Cihaz Envanteri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {devices.map((device, index) => {
              const deviceId = device.id || device.device_id || ''
              const isIsolated = edrState[deviceId]?.isolated || false
              
              return (
                <motion.div
                  key={deviceId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleDeviceClick(device)}
                  className={`
                    group p-4 rounded-lg border cursor-pointer transition-all
                    hover:shadow-lg hover:border-primary/30
                    ${getRiskColor(device.risk_score)}
                    ${isIsolated ? 'border-red-500' : ''}
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-mono font-semibold text-primary">
                        {device.hostname}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {device.os} • {device.owner || device.owner_user}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {isIsolated && (
                      <Badge variant="critical" className="text-xs">
                        ⛔ ISOLATED
                      </Badge>
                    )}
                    {device.risk_score && device.risk_score >= 70 && (
                      <Badge variant="critical" className="text-xs">
                        ⚠️ High Risk
                      </Badge>
                    )}
                    {device.open_alerts && device.open_alerts > 0 && (
                      <Badge variant="medium" className="text-xs">
                        🔔 {device.open_alerts} Alerts
                      </Badge>
                    )}
                  </div>

                  {device.risk_score !== undefined && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Risk Score</span>
                        <span className="font-bold">{device.risk_score}/100</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Device Detail Modal */}
      <DeviceDetailModal
        device={selectedDevice}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
