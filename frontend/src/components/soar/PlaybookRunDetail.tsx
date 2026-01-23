import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle, Zap, RefreshCw, Play } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import type { PlaybookRun } from '@/types'

interface PlaybookRunDetailProps {
  run: PlaybookRun | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlaybookRunDetail({ run, open, onOpenChange }: PlaybookRunDetailProps) {
  if (!run) return null

  const completedSteps = run.steps?.filter(s => s.status === 'completed').length || 0
  const totalSteps = run.steps?.length || 0
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  const getStepStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
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

  const duration = run.finished_at 
    ? Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {run.playbook_name || run.playbook_id}
          </DialogTitle>
        </DialogHeader>

        {/* Run Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {run.status === 'running' && (
                <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
              )}
              {run.status === 'completed' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {run.status === 'failed' && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {run.status === 'completed' ? 'Tamamlandı' : 
                   run.status === 'running' ? 'Çalışıyor' : 
                   run.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(run.started_at)}
                  {duration && ` • ${duration}s`}
                </p>
              </div>
            </div>
            <Badge
              variant={
                run.status === 'completed' ? 'low' :
                run.status === 'failed' ? 'critical' : 'medium'
              }
            >
              {completedSteps}/{totalSteps} Adım
            </Badge>
          </div>

          {/* Progress Bar */}
          {run.status === 'running' && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                %{Math.round(progress)} tamamlandı
              </p>
            </div>
          )}
        </div>

        {/* Steps Timeline */}
        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-semibold">Adımlar</h3>
          <div className="space-y-2">
            {run.steps?.map((step, index) => {
              const Icon = getStepIcon(step.type)
              const isActive = step.status === 'running'
              const isCompleted = step.status === 'completed'
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border
                    ${isActive ? 'border-primary bg-primary/5' : ''}
                    ${isCompleted ? 'border-green-500/30 bg-green-500/5' : ''}
                  `}
                >
                  {/* Step Icon and Status */}
                  <div className="flex items-center gap-2">
                    {getStepStatusIcon(step.status)}
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{step.name}</span>
                    </div>
                  </div>

                  {/* Step Type Badge */}
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {step.type}
                  </Badge>
                </motion.div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
