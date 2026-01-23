import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Clock, CheckCircle, Zap } from 'lucide-react'
import { useSOARStore } from '@/store'
import { useMemo } from 'react'

export function PlaybookMetrics() {
  const { runs } = useSOARStore()

  const metrics = useMemo(() => {
    const completed = runs.filter(r => r.status === 'completed')
    // failed variable removed as unused
    
    const avgExecutionTime = completed.length > 0
      ? completed.reduce((acc, run) => {
          if (run.finished_at) {
            const duration = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
            return acc + duration
          }
          return acc
        }, 0) / completed.length / 1000
      : 0

    const successRate = runs.length > 0 
      ? (completed.length / runs.length) * 100 
      : 0

    return {
      totalRuns: runs.length,
      avgExecutionTime: Math.round(avgExecutionTime),
      successRate: Math.round(successRate),
      completedToday: completed.filter(r => {
        const today = new Date().toDateString()
        return new Date(r.started_at).toDateString() === today
      }).length
    }
  }, [runs])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Toplam Çalıştırma
          </CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{metrics.totalRuns}</div>
          <p className="text-xs text-muted-foreground">
            Tüm zamanlar
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Ortalama Süre
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgExecutionTime}s</div>
          <p className="text-xs text-muted-foreground">
            Execution time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Başarı Oranı
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{metrics.successRate}%</div>
          <Progress value={metrics.successRate} className="mt-2 h-1" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Bugün Tamamlanan
          </CardTitle>
         <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.completedToday}</div>
          <p className="text-xs text-muted-foreground">
            Son 24 saat
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
