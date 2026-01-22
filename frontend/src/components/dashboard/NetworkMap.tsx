import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ConnectionInfo } from '@/types'
import { Globe, AlertTriangle, ExternalLink } from 'lucide-react'

interface NetworkMapProps {
  connections: ConnectionInfo[]
  className?: string
}

// Known malicious/suspicious TLDs and patterns
const SUSPICIOUS_PATTERNS = [
  /\.(ru|cn|top|xyz|tk|ml|ga|cf|gq)$/i,
  /bit\.ly|tinyurl|goo\.gl/i,
  /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, // Direct IP
  /pastebin|temp|anon/i,
]

function isSuspiciousDomain(domain: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(domain))
}

interface ConnectionGroup {
  domain: string
  ips: string[]
  count: number
  suspicious: boolean
  timestamps: string[]
}

export function NetworkMap({ connections, className }: NetworkMapProps) {
  // Group connections by domain
  const grouped = useMemo(() => {
    const map = new Map<string, ConnectionGroup>()

    connections.forEach((conn) => {
      const domain = conn.domain || conn.dst_domain || conn.ip || conn.dst_ip || 'unknown'
      const ip = conn.ip || conn.dst_ip

      if (!map.has(domain)) {
        map.set(domain, {
          domain,
          ips: [],
          count: 0,
          suspicious: isSuspiciousDomain(domain),
          timestamps: [],
        })
      }

      const group = map.get(domain)!
      group.count++
      if (ip && !group.ips.includes(ip)) {
        group.ips.push(ip)
      }
      if (conn.timestamp) {
        group.timestamps.push(conn.timestamp)
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      // Suspicious first, then by count
      if (a.suspicious !== b.suspicious) return a.suspicious ? -1 : 1
      return b.count - a.count
    })
  }, [connections])

  const suspiciousCount = grouped.filter((g) => g.suspicious).length

  if (connections.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        Bağlantı verisi yok
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{grouped.length} benzersiz hedef</span>
        </div>
        {suspiciousCount > 0 && (
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span>{suspiciousCount} şüpheli</span>
          </div>
        )}
      </div>

      {/* Connection List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {grouped.map((group, index) => (
          <motion.div
            key={group.domain}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={cn(
              'flex items-start justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50',
              group.suspicious && 'border-red-500/50 bg-red-500/5'
            )}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  group.suspicious
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Globe className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-mono text-sm truncate',
                      group.suspicious && 'text-red-400'
                    )}
                  >
                    {group.domain}
                  </span>
                  {group.suspicious && (
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                </div>
                {group.ips.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.ips.slice(0, 3).map((ip) => (
                      <span
                        key={ip}
                        className="text-[10px] text-muted-foreground font-mono"
                      >
                        {ip}
                      </span>
                    ))}
                    {group.ips.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{group.ips.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={group.suspicious ? 'critical' : 'secondary'}
                className="text-xs"
              >
                {group.count}x
              </Badge>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-secondary" />
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Şüpheli</span>
        </div>
      </div>
    </div>
  )
}
