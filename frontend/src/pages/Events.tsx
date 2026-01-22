import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventsTable } from '@/components/dashboard/EventsTable'
import { useDataStore } from '@/store'
import { useComputedData } from '@/hooks/useData'
import { KPICard } from '@/components/dashboard/KPICard'
import { FileText, Database, Tag, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Events() {
  const { events, isLoading } = useDataStore()
  const { totalEvents, topSources } = useComputedData()

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>()
    events.forEach((e) => {
      e.tags?.forEach((t) => tags.add(t))
    })
    return tags.size
  }, [events])

  const last24hEvents = useMemo(() => {
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    return events.filter((e) => {
      const ts = e.ts || e.timestamp
      if (!ts) return false
      return new Date(ts).getTime() > dayAgo
    }).length
  }, [events])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Toplam Olay"
          value={totalEvents}
          icon={FileText}
          iconColor="text-blue-400"
          loading={isLoading}
        />
        <KPICard
          title="Kaynak Sayısı"
          value={topSources.length}
          icon={Database}
          iconColor="text-purple-400"
          loading={isLoading}
        />
        <KPICard
          title="Benzersiz Etiket"
          value={uniqueTags}
          icon={Tag}
          iconColor="text-cyan-400"
          loading={isLoading}
        />
        <KPICard
          title="Son 24 Saat"
          value={last24hEvents}
          icon={Clock}
          iconColor="text-green-400"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kaynak Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSources.slice(0, 8).map((source, index) => (
                <motion.div
                  key={source.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[120px]">{source.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {source.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${source.percent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Olay Günlüğü (SIEM)</CardTitle>
          </CardHeader>
          <CardContent>
            <EventsTable events={events} loading={isLoading} pageSize={20} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
