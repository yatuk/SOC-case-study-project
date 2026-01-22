import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDataStore, useSOARStore } from '@/store'
import { KPICard } from '@/components/dashboard/KPICard'
import { formatTime, generateId } from '@/lib/utils'
import {
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import type { Playbook, PlaybookRun } from '@/types'

export default function Automations() {
  const { playbooks, isLoading } = useDataStore()
  const { runs, addRun, updateRun } = useSOARStore()
  const [runningPlaybook, setRunningPlaybook] = useState<string | null>(null)

  const totalRuns = runs.length
  const completedRuns = runs.filter((r) => r.status === 'completed').length
  const activeRuns = runs.filter((r) => r.status === 'running').length

  const runPlaybook = async (playbook: Playbook) => {
    setRunningPlaybook(playbook.id)

    const newRun: PlaybookRun = {
      id: generateId('run'),
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      started_at: new Date().toISOString(),
      status: 'running',
      steps: playbook.steps?.map((s) => ({ ...s, status: 'pending' })),
    }

    addRun(newRun)
    toast.info(`${playbook.name} başlatıldı`)

    // Simulate step execution
    const steps = playbook.steps || []
    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500))
      
      const updatedSteps = [...(newRun.steps || [])]
      updatedSteps[i] = { ...updatedSteps[i], status: 'completed' }
      
      updateRun(newRun.id, { steps: updatedSteps })
    }

    // Complete the run
    await new Promise((resolve) => setTimeout(resolve, 500))
    updateRun(newRun.id, {
      status: 'completed',
      finished_at: new Date().toISOString(),
    })

    toast.success(`${playbook.name} tamamlandı`)
    setRunningPlaybook(null)
  }

  const getStepIcon = (type: string) => {
    const icons: Record<string, typeof Zap> = {
      enrich: Zap,
      lookup: RefreshCw,
      action: Play,
      approval: CheckCircle,
    }
    return icons[type] || Zap
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Toplam Playbook"
          value={playbooks.length}
          icon={Play}
          iconColor="text-blue-400"
          loading={isLoading}
        />
        <KPICard
          title="Toplam Çalıştırma"
          value={totalRuns}
          icon={Zap}
          iconColor="text-purple-400"
        />
        <KPICard
          title="Tamamlanan"
          value={completedRuns}
          icon={CheckCircle}
          iconColor="text-green-400"
        />
        <KPICard
          title="Aktif"
          value={activeRuns}
          icon={Clock}
          iconColor="text-orange-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Playbooks */}
        <Card>
          <CardHeader>
            <CardTitle>Playbook Kütüphanesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {playbooks.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-8">
                  Playbook bulunamadı
                </p>
              )}
              
              {playbooks.map((playbook, index) => (
                <motion.div
                  key={playbook.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{playbook.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {playbook.description || 'Açıklama yok'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {playbook.category && (
                          <Badge variant="secondary" className="text-xs">
                            {playbook.category}
                          </Badge>
                        )}
                        {playbook.steps && (
                          <span className="text-xs text-muted-foreground">
                            {playbook.steps.length} adım
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => runPlaybook(playbook)}
                      disabled={runningPlaybook === playbook.id}
                    >
                      {runningPlaybook === playbook.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Çalıştır
                    </Button>
                  </div>

                  {/* Steps preview */}
                  {playbook.steps && playbook.steps.length > 0 && (
                    <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                      {playbook.steps.map((step, i) => {
                        const Icon = getStepIcon(step.type)
                        return (
                          <div key={step.id} className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-xs whitespace-nowrap">
                              <Icon className="h-3 w-3" />
                              {step.name}
                            </div>
                            {i < (playbook.steps?.length || 0) - 1 && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Run History */}
        <Card>
          <CardHeader>
            <CardTitle>Çalıştırma Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {runs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Henüz çalıştırma yok
                </p>
              )}

              {runs
                .slice()
                .reverse()
                .slice(0, 10)
                .map((run, index) => (
                  <motion.div
                    key={run.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {run.status === 'running' ? (
                        <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                      ) : run.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : run.status === 'failed' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {run.playbook_name || run.playbook_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(run.started_at)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        run.status === 'completed'
                          ? 'low'
                          : run.status === 'failed'
                            ? 'critical'
                            : 'medium'
                      }
                    >
                      {run.status === 'completed'
                        ? 'Tamamlandı'
                        : run.status === 'running'
                          ? 'Çalışıyor'
                          : run.status === 'failed'
                            ? 'Başarısız'
                            : 'Bekliyor'}
                    </Badge>
                  </motion.div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
