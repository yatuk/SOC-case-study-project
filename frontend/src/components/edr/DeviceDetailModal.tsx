import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEDRStore } from '@/store'
import {
  ShieldOff,
  ShieldCheck,
  Skull,
  HardDrive,
  Network,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react'
import type { Device } from '@/types'

interface DeviceDetailModalProps {
  device: Device | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeviceDetailModal({ device, open, onOpenChange }: DeviceDetailModalProps) {
  const { edrState, isolateDevice, restoreDevice, killProcess } = useEDRStore()
  const [killingProcess, setKillingProcess] = useState<number | null>(null)

  if (!device) return null

  const deviceState = edrState[device.id || device.device_id || '']
  const isIsolated = deviceState?.isolated || false

  const handleIsolate = () => {
    const deviceId = device.id || device.device_id || ''
    isolateDevice(deviceId)
    toast.success(`🔒 ${device.hostname} izole edildi`)
  }

  const handleRestore = () => {
    const deviceId = device.id || device.device_id || ''
    restoreDevice(deviceId)
    toast.success(`✅ ${device.hostname} ağa bağlandı`)
  }

  const handleKillProcess = async (pid: number, processName: string) => {
    setKillingProcess(pid)
    const deviceId = device.id || device.device_id || ''
    
    // Simulate process kill
    await new Promise(resolve => setTimeout(resolve, 500))
    killProcess(deviceId, pid)
    
    toast.success(`☠️ Process killed: ${processName}`)
    setKillingProcess(null)
  }

  const getRiskColor = (score?: number) => {
    if (!score) return 'text-gray-400'
    if (score >= 80) return 'text-red-500'
    if (score >= 60) return 'text-orange-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isIsolated ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
              {isIsolated ? (
                <ShieldOff className="h-5 w-5 text-red-500" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold font-mono">{device.hostname}</h2>
              <p className="text-sm text-muted-foreground font-normal">
                {device.os} • {device.owner || device.owner_user}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Device Status & Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Risk Score</p>
            <p className={`text-2xl font-bold ${getRiskColor(device.risk_score)}`}>
              {device.risk_score || 0}/100
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Status</p>
            <Badge variant={isIsolated ? 'critical' : 'low'} className="text-sm">
              {isIsolated ? 'ISOLATED' : 'CONNECTED'}
            </Badge>
          </div>

          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Open Alerts</p>
            <p className="text-2xl font-bold text-orange-400">
              {device.open_alerts || 0}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {isIsolated ? (
            <Button
              onClick={handleRestore}
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Restore Connection
            </Button>
          ) : (
            <Button
              onClick={handleIsolate}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Isolate Device
            </Button>
          )}
          
          <Button variant="outline" disabled>
            <HardDrive className="h-4 w-4 mr-2" />
            Collect Forensics
          </Button>
        </div>

        {/* Recent Processes */}
        {device.recent_processes && device.recent_processes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Skull className="h-4 w-4" />
              Recent Processes
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {device.recent_processes.map((proc, idx) => {
                const isSuspicious = proc.process?.toLowerCase().includes('powershell') ||
                                    proc.process?.toLowerCase().includes('cmd')
                
                return (
                  <motion.div
                    key={`${proc.pid || idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`
                      p-3 rounded-lg border flex items-center justify-between
                      ${isSuspicious ? 'border-red-500/30 bg-red-500/5' : 'border-border'}
                    `}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-semibold">
                          {proc.process}
                        </code>
                        {isSuspicious && (
                          <Badge variant="critical" className="text-xs">
                            Suspicious
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        {proc.pid && <span>PID: {proc.pid}</span>}
                        {proc.parent && <span>Parent: {proc.parent}</span>}
                        {proc.timestamp && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(proc.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {proc.pid && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleKillProcess(proc.pid!, proc.process)}
                        disabled={killingProcess === proc.pid}
                        className="text-red-500 hover:bg-red-500/10"
                      >
                        {killingProcess === proc.pid ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Network Connections */}
        {device.recent_connections && device.recent_connections.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Network className="h-4 w-4" />
              Recent Connections
            </h3>
            <div className="space-y-2">
              {device.recent_connections.slice(0, 5).map((conn, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border flex items-center justify-between text-sm"
                >
                  <code className="text-xs font-mono">
                    {conn.domain || conn.dst_domain || conn.ip || conn.dst_ip}
                  </code>
                  {conn.timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(conn.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDR Actions History */}
        {deviceState?.actions && deviceState.actions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Action History
            </h3>
            <div className="space-y-2">
              {deviceState.actions.slice(0, 5).reverse().map((action, idx) => (
                <div key={idx} className="p-2 rounded border flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="flex-1 font-mono text-xs">{action.action}</span>
                  <span className="text-xs text-muted-foreground">{action.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
