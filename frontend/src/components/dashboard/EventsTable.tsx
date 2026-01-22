import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, formatTime, numToSeverity, getSeverityLabel } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { Event, Severity } from '@/types'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
} from 'lucide-react'

interface EventsTableProps {
  events: Event[]
  loading?: boolean
  pageSize?: number
  compact?: boolean
}

export function EventsTable({
  events,
  loading = false,
  pageSize = 20,
  compact = false,
}: EventsTableProps) {
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const sources = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => {
      if (e.source) set.add(e.source)
      if (e.event_type) set.add(e.event_type)
    })
    return Array.from(set).sort()
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !search ||
        (event.summary || '')
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (event.event_id || event.id || '')
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (typeof event.user === 'string' ? event.user : event.user?.id || '')
          .toLowerCase()
          .includes(search.toLowerCase())

      const eventSource = event.source || event.event_type || ''
      const matchesSource = sourceFilter === 'all' || eventSource === sourceFilter

      return matchesSearch && matchesSource
    })
  }, [events, search, sourceFilter])

  const totalPages = Math.ceil(filteredEvents.length / pageSize)
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const getSourceColor = (source: string): string => {
    const colors: Record<string, string> = {
      email: 'bg-blue-500/20 text-blue-400',
      edr: 'bg-purple-500/20 text-purple-400',
      identity: 'bg-orange-500/20 text-orange-400',
      proxy: 'bg-cyan-500/20 text-cyan-400',
      azure_ad: 'bg-blue-600/20 text-blue-300',
      m365_defender: 'bg-red-500/20 text-red-400',
      windows: 'bg-sky-500/20 text-sky-400',
    }
    return colors[source.toLowerCase()] || 'bg-gray-500/20 text-gray-400'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Olay ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={sourceFilter}
          onValueChange={(val) => {
            setSourceFilter(val)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tüm Kaynaklar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kaynaklar</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-xs font-medium text-muted-foreground w-[140px]">
                Zaman
              </th>
              <th className="text-left p-3 text-xs font-medium text-muted-foreground w-[100px]">
                Kaynak
              </th>
              {!compact && (
                <th className="text-left p-3 text-xs font-medium text-muted-foreground w-[80px]">
                  Seviye
                </th>
              )}
              <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                Özet / Detay
              </th>
              {!compact && (
                <th className="text-left p-3 text-xs font-medium text-muted-foreground w-[120px]">
                  Etiketler
                </th>
              )}
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            <AnimatePresence mode="popLayout">
              {paginatedEvents.map((event, index) => {
                const severity =
                  typeof event.severity === 'number'
                    ? numToSeverity(event.severity)
                    : event.severity || 'info'
                const source = event.source || event.event_type || 'unknown'
                const userId =
                  typeof event.user === 'string'
                    ? event.user
                    : event.user?.id || event.user?.email || '—'

                return (
                  <motion.tr
                    key={event.event_id || event.id || index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-3 text-muted-foreground">
                      {formatTime(event.ts || event.timestamp)}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'inline-flex px-2 py-0.5 rounded text-[10px] font-medium',
                          getSourceColor(source)
                        )}
                      >
                        {source}
                      </span>
                    </td>
                    {!compact && (
                      <td className="p-3">
                        <Badge variant={severity as Severity} className="text-[10px]">
                          {getSeverityLabel(severity)}
                        </Badge>
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground truncate max-w-[400px]">
                          {event.summary ||
                            event.event_type ||
                            event.process?.cmdline ||
                            '—'}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {userId !== '—' && `User: ${userId}`}
                          {event.network?.src_ip && ` • IP: ${event.network.src_ip}`}
                          {event.network?.domain && ` • ${event.network.domain}`}
                        </span>
                      </div>
                    </td>
                    {!compact && (
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {event.tags?.slice(0, 2).map((tag, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary text-[10px]"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                          {(event.tags?.length || 0) > 2 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{(event.tags?.length || 0) - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                )
              })}
            </AnimatePresence>

            {paginatedEvents.length === 0 && (
              <tr>
                <td
                  colSpan={compact ? 3 : 5}
                  className="p-8 text-center text-muted-foreground"
                >
                  Olay bulunamadı
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredEvents.length.toLocaleString()} olaydan{' '}
            {((currentPage - 1) * pageSize + 1).toLocaleString()}-
            {Math.min(currentPage * pageSize, filteredEvents.length).toLocaleString()}{' '}
            arası
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
