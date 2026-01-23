import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
import type { Alert, Severity } from '@/types'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Monitor,
  ExternalLink,
} from 'lucide-react'

interface AlertsTableProps {
  alerts: Alert[]
  loading?: boolean
  pageSize?: number
}

export function AlertsTable({
  alerts,
  loading = false,
  pageSize = 10,
}: AlertsTableProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        !search ||
        (alert.alert_name || alert.name || alert.title || '')
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (alert.user || alert.affected_user || '')
          .toLowerCase()
          .includes(search.toLowerCase())

      const sev =
        typeof alert.severity === 'number'
          ? numToSeverity(alert.severity)
          : alert.severity
      const matchesSeverity =
        severityFilter === 'all' || sev === severityFilter

      return matchesSearch && matchesSeverity
    })
  }, [alerts, search, severityFilter])

  const totalPages = Math.ceil(filteredAlerts.length / pageSize)
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleAlertClick = (alert: Alert) => {
    navigate(`/cases/${alert.alert_id || '10234'}`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
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
            placeholder="Uyarı veya kullanıcı ara..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={severityFilter}
          onValueChange={(val) => {
            setSeverityFilter(val)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tüm Seviyeler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Seviyeler</SelectItem>
            <SelectItem value="critical">Kritik</SelectItem>
            <SelectItem value="high">Yüksek</SelectItem>
            <SelectItem value="medium">Orta</SelectItem>
            <SelectItem value="low">Düşük</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                Uyarı
              </th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground w-[100px]">
                Seviye
              </th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground w-[150px]">
                Kullanıcı/Cihaz
              </th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground w-[140px]">
                Zaman
              </th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {paginatedAlerts.map((alert, index) => {
                const severity =
                  typeof alert.severity === 'number'
                    ? numToSeverity(alert.severity)
                    : alert.severity || 'info'
                const name = alert.alert_name || alert.name || alert.title || 'Uyarı'
                const user = alert.user || alert.affected_user
                const device = alert.device

                return (
                  <motion.tr
                    key={alert.alert_id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className={cn(
                      'border-b cursor-pointer transition-colors hover:bg-muted/50',
                      severity === 'critical' && 'border-l-4 border-l-[#f85149]'
                    )}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <td className="p-4">
                      <div className="font-medium truncate max-w-[300px]">
                        {name}
                      </div>
                      {alert.hypothesis && (
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {alert.hypothesis}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={severity as Severity}>
                        {getSeverityLabel(severity)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-sm">
                        {user && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{user}</span>
                          </div>
                        )}
                        {device && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Monitor className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{device}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatTime(alert.timestamp || alert.ts)}
                    </td>
                    <td className="p-4">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>

            {paginatedAlerts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Uyarı bulunamadı
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
            {filteredAlerts.length} uyarıdan {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredAlerts.length)} arası
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
