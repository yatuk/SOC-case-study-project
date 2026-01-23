import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPICard } from '@/components/dashboard/KPICard'
import { AlertsTable } from '@/components/dashboard/AlertsTable'
import { useDataStore } from '@/store'
import { useComputedData } from '@/hooks/useData'
import {
  ShieldAlert,
  FileText,
  Users,
  Monitor,
  AlertTriangle,
  TrendingUp,
  Mail,
  Key,
  Globe,
  Settings,
} from 'lucide-react'

export default function Overview() {
  const { alerts, isLoading } = useDataStore()
  const {
    totalEvents,
    totalAlerts,
    criticalAlerts,
    openCases,
    totalDevices,
    isolatedDevices,
    severityCounts,
    topSources,
  } = useComputedData()

  const incidentSteps = [
    { 
      icon: Mail, 
      label: 'Phishing Email', 
      desc: 'Kötü amaçlı link tıklandı',
      color: 'text-blue-400',
      bg: 'bg-blue-500/20'
    },
    { 
      icon: Key, 
      label: 'Credential Theft', 
      desc: 'Kimlik bilgileri çalındı',
      color: 'text-orange-400',
      bg: 'bg-orange-500/20'
    },
    { 
      icon: Globe, 
      label: 'Impossible Travel', 
      desc: 'Şüpheli konum değişikliği',
      color: 'text-purple-400',
      bg: 'bg-purple-500/20'
    },
    { 
      icon: Settings, 
      label: 'Mailbox Rule', 
      desc: 'Kural oluşturuldu - kalıcılık',
      color: 'text-red-400',
      bg: 'bg-red-500/20'
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards - EDR & SIEM Metrics */}
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <KPICard
          title="Toplam Olay"
          value={totalEvents}
          icon={FileText}
          iconColor="text-blue-400"
          loading={isLoading}
        />
        <KPICard
          title="Aktif Uyarılar"
          value={totalAlerts}
          icon={ShieldAlert}
          iconColor="text-orange-400"
          loading={isLoading}
        />
        <KPICard
          title="Kritik Uyarılar"
          value={criticalAlerts}
          icon={AlertTriangle}
          iconColor="text-red-400"
          loading={isLoading}
        />
        <KPICard
          title="Açık Vakalar"
          value={openCases}
          icon={TrendingUp}
          iconColor="text-purple-400"
          loading={isLoading}
        />
        <KPICard
          title="İzole Cihazlar"
          value={isolatedDevices}
          icon={Monitor}
          iconColor="text-yellow-400"
          trend={isolatedDevices > 0 ? 'up' : 'neutral'}
          trendValue={isolatedDevices > 0 ? 'Karantina' : 'Normal'}
          loading={isLoading}
        />
        <KPICard
          title="Aktif Cihazlar"
          value={totalDevices}
          icon={Users}
          iconColor="text-cyan-400"
          loading={isLoading}
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Incident Narrative */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Olay Akışı - Phishing Saldırı Zinciri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
              
              <div className="space-y-6">
                {incidentSteps.map((step, index) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-start gap-4 relative"
                  >
                    <div className={`shrink-0 p-2 rounded-lg ${step.bg} ${step.color} relative z-10`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-medium">{step.label}</h4>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                    <div className="text-xs text-muted-foreground pt-1">
                      Adım {index + 1}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seviye Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: 'critical', label: 'Kritik', color: 'bg-[#f85149]' },
                { key: 'high', label: 'Yüksek', color: 'bg-[#f0883e]' },
                { key: 'medium', label: 'Orta', color: 'bg-[#d29922]' },
                { key: 'low', label: 'Düşük', color: 'bg-[#3fb950]' },
              ].map((item) => {
                const count = severityCounts[item.key] || 0
                const percent = totalAlerts > 0 ? Math.round((count / totalAlerts) * 100) : 0
                
                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${item.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kaynak Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSources.slice(0, 6).map((source, index) => (
                <motion.div
                  key={source.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: [
                          '#3b82f6',
                          '#8b5cf6',
                          '#f97316',
                          '#06b6d4',
                          '#84cc16',
                          '#ec4899',
                        ][index % 6],
                      }}
                    />
                    <span className="text-sm">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {source.count.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {source.percent}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Son Uyarılar</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertsTable alerts={alerts.slice(0, 5)} loading={isLoading} pageSize={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
