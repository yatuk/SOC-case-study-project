import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDataStore } from '@/store'
import { KPICard } from '@/components/dashboard/KPICard'
import {
  Search,
  Globe,
  Link,
  Hash,
  Shield,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { IOC } from '@/types'

export default function Intel() {
  const { iocs, normalizedIocs, isLoading } = useDataStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Combine IOCs
  const allIOCs = useMemo(() => {
    const combined = [...iocs, ...normalizedIocs]
    return combined
  }, [iocs, normalizedIocs])

  // Filter IOCs
  const filteredIOCs = useMemo(() => {
    return allIOCs.filter((ioc) => {
      const value = ioc.indicator || ioc.value || ioc.domain || ''
      const matchesSearch =
        !search || value.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || ioc.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [allIOCs, search, typeFilter])

  const totalPages = Math.ceil(filteredIOCs.length / pageSize)
  const paginatedIOCs = filteredIOCs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Stats
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {}
    allIOCs.forEach((ioc) => {
      const type = ioc.type || 'unknown'
      stats[type] = (stats[type] || 0) + 1
    })
    return stats
  }, [allIOCs])

  const phishingCount = allIOCs.filter(
    (ioc) => ioc.label === 'phishing' || ioc.tags?.includes('phishing')
  ).length

  const getTypeIcon = (type: string) => {
    const icons: Record<string, typeof Globe> = {
      domain: Globe,
      url: Link,
      ip: Shield,
      hash: Hash,
    }
    return icons[type] || Globe
  }

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      domain: 'bg-blue-500/20 text-blue-400',
      url: 'bg-purple-500/20 text-purple-400',
      ip: 'bg-orange-500/20 text-orange-400',
      hash: 'bg-cyan-500/20 text-cyan-400',
    }
    return colors[type] || 'bg-gray-500/20 text-gray-400'
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Toplam IOC"
          value={allIOCs.length}
          icon={Shield}
          iconColor="text-blue-400"
          loading={isLoading}
        />
        <KPICard
          title="Domain"
          value={typeStats['domain'] || 0}
          icon={Globe}
          iconColor="text-purple-400"
          loading={isLoading}
        />
        <KPICard
          title="URL"
          value={typeStats['url'] || 0}
          icon={Link}
          iconColor="text-cyan-400"
          loading={isLoading}
        />
        <KPICard
          title="Phishing"
          value={phishingCount}
          icon={AlertTriangle}
          iconColor="text-red-400"
          loading={isLoading}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Tehdit İstihbaratı (IOC)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="IOC ara..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'domain', 'url', 'ip', 'hash'].map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTypeFilter(type)
                    setCurrentPage(1)
                  }}
                >
                  {type === 'all' ? 'Tümü' : type.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* IOC List */}
          <div className="space-y-2">
            {paginatedIOCs.map((ioc, index) => {
              const Icon = getTypeIcon(ioc.type)
              const value = ioc.indicator || ioc.value || ioc.domain || '—'

              return (
                <motion.div
                  key={`${ioc.type}-${value}-${index}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${getTypeColor(ioc.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono text-sm truncate max-w-[400px]">
                        {value}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {ioc.type}
                        </Badge>
                        {ioc.label && (
                          <Badge
                            variant={ioc.label === 'phishing' ? 'critical' : 'secondary'}
                            className="text-xs"
                          >
                            {ioc.label}
                          </Badge>
                        )}
                        {ioc.source && (
                          <span className="text-xs text-muted-foreground">
                            {ioc.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ioc.confidence && (
                      <Badge variant="secondary">
                        %{typeof ioc.confidence === 'number' 
                          ? ioc.confidence 
                          : parseInt(ioc.confidence) || 0}
                      </Badge>
                    )}
                    {ioc.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )
            })}

            {paginatedIOCs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                IOC bulunamadı
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                {filteredIOCs.length} IOC'den {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredIOCs.length)} arası
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
        </CardContent>
      </Card>
    </div>
  )
}
