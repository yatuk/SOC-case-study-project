import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDataStore, useSOARStore } from '@/store'
import { PlaybookMetrics } from '@/components/soar/PlaybookMetrics'
import { PlaybookRunDetail } from '@/components/soar/PlaybookRunDetail'
import { formatTime, generateId } from '@/lib/utils'
import {
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  ArrowRight,
  RefreshCw,
  Eye,
} from 'lucide-react'
import type { Playbook, PlaybookRun } from '@/types'

export default function Automations() {
  const { playbooks, isLoading } = useDataStore()
  const { runs, addRun, updateRun } = useSOARStore()
  const [runningPlaybook, setRunningPlaybook] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<PlaybookRun | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

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
    toast.info(`🤖 ${playbook.name} başlatıldı`)

    // Simulate step execution with real-time updates
    const steps = playbook.steps || []
    for (let i = 0; i < steps.length; i++) {
      // Mark step as running
      const runningSteps = [...(newRun.steps || [])]
      runningSteps[i] = { ...runningSteps[i], status: 'running' }
      updateRun(newRun.id, { steps: runningSteps })

      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500))
      
      // Mark as completed
      const updatedSteps = [...runningSteps]
      updatedSteps[i] = { ...updatedSteps[i], status: 'completed' }
      updateRun(newRun.id, { steps: updatedSteps })
    }

    // Complete the run
    await new Promise((resolve) => setTimeout(resolve, 500))
    updateRun(newRun.id, {
      status: 'completed',
      finished_at: new Date().toISOString(),
    })

    toast.success(`✅ ${playbook.name} tamamlandı`)
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

  const handleRunClick = (run: PlaybookRun) => {
    setSelectedRun(run)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Metrics Dashboard */}
      <div>
        <h2 className="text-2xl font-bold mb-4">SOAR Automation</h2>
        <PlaybookMetrics />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Playbooks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Playbook Kütüphanesi
            </CardTitle>
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
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all hover:shadow-lg hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-medium text-primary">{playbook.name}</h3>
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
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {playbook.steps.length} adım
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => runPlaybook(playbook)}
                      disabled={runningPlaybook === playbook.id}
                      className="ml-4 terminal-glow"
                    >
                      {runningPlaybook === playbook.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {runningPlaybook === playbook.id ? 'Çalışıyor...' : 'Çalıştır'}
                    </Button>
                  </div>

                  {/* Visual Workflow Steps */}
                  {playbook.steps && playbook.steps.length > 0 && (
                    <div className="mt-4 p-3 rounded bg-muted/30 border border-dashed">
                      <p className="text-xs text-muted-foreground mb-2 font-mono">WORKFLOW:</p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {playbook.steps.map((step, i) => {
                          const Icon = getStepIcon(step.type)
                          return (
                            <div key={step.id} className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-card border text-xs whitespace-nowrap font-mono">
                                <Icon className="h-3.5 w-3.5 text-primary" />
                                <span>{step.name}</span>
                              </div>
                              {i < (playbook.steps?.length || 0) - 1 && (
                                <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Run History with enhanced interactivity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-400" />
              Çalıştırma Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
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
                    className="group flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => handleRunClick(run)}
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
                        <p className="text-sm font-medium font-mono">
                          {run.playbook_name || run.playbook_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(run.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          run.status === 'completed' ? 'low' :
                          run.status === 'failed' ? 'critical' : 'medium'
                        }
                      >
                        {run.status === 'completed' ? 'Tamamlandı' :
                         run.status === 'running' ? 'Çalışıyor' :
                         run.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                      </Badge>
                      <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run Detail Modal */}
      <PlaybookRunDetail
        run={selectedRun}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
