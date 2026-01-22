import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'framer-motion'

interface SourceData {
  name: string
  count: number
  percent?: number
}

interface SourceDistributionProps {
  data: SourceData[]
  title?: string
  color?: string
  height?: number
  maxItems?: number
}

export function SourceDistribution({
  data,
  title = 'Kaynak Dağılımı',
  color = '#8b5cf6',
  height = 300,
  maxItems = 8,
}: SourceDistributionProps) {
  const displayData = data.slice(0, maxItems)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent
          className="flex items-center justify-center text-muted-foreground"
          style={{ height }}
        >
          Veri yok
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={displayData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={100}
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [value.toLocaleString(), 'Sayı']}
            />
            <Bar
              dataKey="count"
              fill={color}
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Simple bar list (no recharts)
export function SimpleBarList({
  data,
  title,
  maxItems = 6,
}: {
  data: SourceData[]
  title?: string
  maxItems?: number
}) {
  const displayData = data.slice(0, maxItems)
  const max = Math.max(...displayData.map((d) => d.count), 1)

  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-green-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-red-500',
  ]

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          {displayData.map((item, index) => {
            const percent = Math.round((item.count / max) * 100)
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[150px]">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.count.toLocaleString()}
                    {item.percent !== undefined && ` (${item.percent}%)`}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${colors[index % colors.length]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
