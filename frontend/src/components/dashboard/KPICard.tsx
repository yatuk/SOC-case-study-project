import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number | string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  loading?: boolean
  className?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  trendValue,
  loading = false,
  className,
}: KPICardProps) {
  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('overflow-hidden hover:shadow-lg transition-shadow', className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <motion.p
                className="text-3xl font-bold tracking-tight"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
              </motion.p>
              {(subtitle || trendValue) && (
                <div className="flex items-center gap-2">
                  {trend && (
                    <span
                      className={cn(
                        'flex items-center text-xs font-medium',
                        trend === 'up' && 'text-red-500',
                        trend === 'down' && 'text-green-500',
                        trend === 'neutral' && 'text-muted-foreground'
                      )}
                    >
                      {trend === 'up' && <ArrowUp className="h-3 w-3 mr-0.5" />}
                      {trend === 'down' && <ArrowDown className="h-3 w-3 mr-0.5" />}
                      {trend === 'neutral' && <Minus className="h-3 w-3 mr-0.5" />}
                      {trendValue}
                    </span>
                  )}
                  {subtitle && (
                    <span className="text-xs text-muted-foreground">{subtitle}</span>
                  )}
                </div>
              )}
            </div>
            {Icon && (
              <div className={cn('p-3 rounded-lg bg-secondary/50', iconColor)}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Mini KPI for inline display
export function MiniKPI({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', color)}>{value}</span>
    </div>
  )
}
