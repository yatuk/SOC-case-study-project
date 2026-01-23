import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useUIStore, useEDRStore } from '@/store'
import type { Device } from '@/types'
import {
  Search,
  Monitor,
  Shield,
  ShieldOff,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'

interface DevicesTableProps {
  devices: Device[]
  loading?: boolean
}

export function DevicesTable({ devices, loading = false }: DevicesTableProps) {
  const { openDrawer } = useUIStore()
  const { edrState } = useEDRStore()
  const [search, setSearch] = useState('')

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      const hostname = device.hostname || ''
      const owner = device.owner || device.owner_user || ''
      return (
        !search ||
        hostname.toLowerCase().includes(search.toLowerCase()) ||
        owner.toLowerCase().includes(search.toLowerCase())
      )
    })
  }, [devices, search])

  const handleDeviceClick = (device: Device) => {
    openDrawer('device', device)
  }

  const getOSIcon = (os: string | undefined) => {
    if (!os) return <Monitor className="h-4 w-4" />
    const osLower = os.toLowerCase()
    if (osLower.includes('windows')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
        </svg>
      )
    }
    if (osLower.includes('mac') || osLower.includes('darwin')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      )
    }
    if (osLower.includes('linux') || osLower.includes('ubuntu')) {
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      )
    }
    return <Monitor className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cihaz veya kullanıcı ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Device Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredDevices.map((device, index) => {
            const deviceId = device.device_id || device.id || device.hostname
            const state = edrState[deviceId] || { isolated: false, actions: [] }
            const riskScore = device.risk_score || 0
            const openAlerts = device.open_alerts || 0

            return (
              <motion.div
                key={deviceId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={cn(
                  'group rounded-lg border bg-card p-4 cursor-pointer transition-all hover:shadow-lg hover:border-primary/50',
                  state.isolated && 'border-orange-500/50 bg-orange-500/5'
                )}
                onClick={() => handleDeviceClick(device)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        state.isolated
                          ? 'bg-orange-500/20 text-orange-500'
                          : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {getOSIcon(device.os)}
                    </div>
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        {device.hostname}
                        {state.isolated && (
                          <ShieldOff className="h-3 w-3 text-orange-500" />
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {device.owner || device.owner_user || 'Bilinmiyor'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm">
                  {/* Risk Score */}
                  <div className="flex items-center gap-1">
                    <Shield
                      className={cn(
                        'h-4 w-4',
                        riskScore >= 70
                          ? 'text-red-500'
                          : riskScore >= 40
                            ? 'text-yellow-500'
                            : 'text-green-500'
                      )}
                    />
                    <span className="text-muted-foreground">Risk:</span>
                    <span
                      className={cn(
                        'font-medium',
                        riskScore >= 70
                          ? 'text-red-500'
                          : riskScore >= 40
                            ? 'text-yellow-500'
                            : 'text-green-500'
                      )}
                    >
                      {riskScore}
                    </span>
                  </div>

                  {/* Open Alerts */}
                  {openAlerts > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-muted-foreground">Uyarı:</span>
                      <Badge variant="high" className="text-[10px] px-1.5">
                        {openAlerts}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{device.os || 'Bilinmeyen OS'}</span>
                  <span>
                    Son görülme: {formatTime(device.last_seen)}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredDevices.length === 0 && (
          <div className="col-span-full p-8 text-center text-muted-foreground">
            Cihaz bulunamadı
          </div>
        )}
      </div>
    </div>
  )
}
