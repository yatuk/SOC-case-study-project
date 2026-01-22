import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store'
import { formatTime } from '@/lib/utils'
import {
  Mail,
  Key,
  Globe,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'

const attackPhases = [
  {
    id: 1,
    phase: 'Initial Access',
    title: 'Phishing Email Alındı',
    description: 'Kullanıcıya kötü amaçlı link içeren e-posta gönderildi',
    icon: Mail,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    mitre: 'T1566.002',
    status: 'completed',
  },
  {
    id: 2,
    phase: 'Credential Access',
    title: 'Kimlik Bilgileri Çalındı',
    description: 'Sahte giriş sayfası üzerinden kimlik bilgileri ele geçirildi',
    icon: Key,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
    mitre: 'T1078',
    status: 'completed',
  },
  {
    id: 3,
    phase: 'Defense Evasion',
    title: 'Impossible Travel Detected',
    description: 'Coğrafi olarak imkansız lokasyonlardan giriş tespit edildi',
    icon: Globe,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
    mitre: 'T1078.004',
    status: 'active',
  },
  {
    id: 4,
    phase: 'Persistence',
    title: 'Mailbox Rule Oluşturuldu',
    description: 'E-posta kuralı ile kalıcılık sağlandı',
    icon: Settings,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    mitre: 'T1098.002',
    status: 'pending',
  },
]

export default function Timeline() {
  const { alerts } = useDataStore()

  return (
    <div className="space-y-6">
      {/* Attack Chain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Saldırı Zinciri Analizi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-border" />

            <div className="space-y-8">
              {attackPhases.map((phase, index) => (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.15 }}
                  className="relative flex gap-6"
                >
                  {/* Icon */}
                  <div
                    className={`relative z-10 shrink-0 p-3 rounded-xl ${phase.bgColor} ${phase.color}`}
                  >
                    <phase.icon className="h-6 w-6" />
                    {phase.status === 'active' && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 p-4 rounded-lg border ${
                      phase.status === 'active'
                        ? `${phase.borderColor} bg-card`
                        : 'border-border bg-card/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase">
                            {phase.phase}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {phase.mitre}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold">{phase.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {phase.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {phase.status === 'completed' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {phase.status === 'active' && (
                          <AlertTriangle className="h-5 w-5 text-orange-500 animate-pulse" />
                        )}
                        {phase.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-muted" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Alerts Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>İlgili Uyarılar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.slice(0, 10).map((alert, index) => (
              <motion.div
                key={alert.alert_id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground w-32">
                  {formatTime(alert.timestamp || alert.ts)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {alert.alert_name || alert.name || alert.title}
                  </p>
                  {alert.user && (
                    <p className="text-xs text-muted-foreground">
                      Kullanıcı: {alert.user}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    typeof alert.severity === 'number'
                      ? alert.severity >= 8
                        ? 'critical'
                        : alert.severity >= 6
                          ? 'high'
                          : 'medium'
                      : (alert.severity as 'critical' | 'high' | 'medium')
                  }
                >
                  {typeof alert.severity === 'number'
                    ? alert.severity >= 8
                      ? 'Kritik'
                      : alert.severity >= 6
                        ? 'Yüksek'
                        : 'Orta'
                    : alert.severity}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
