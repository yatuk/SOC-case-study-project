import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDataStore } from '@/store'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Target, Shield } from 'lucide-react'

const MITRE_TACTICS = [
  'Reconnaissance',
  'Resource Development',
  'Initial Access',
  'Execution',
  'Persistence',
  'Privilege Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'Command and Control',
  'Exfiltration',
  'Impact',
]

export default function Mitre() {
  const { mitreCoverage, alerts } = useDataStore()

  // Extract techniques from alerts and coverage
  const techniques = useMemo(() => {
    const techMap = new Map<string, { id: string; name: string; tactic: string; count: number }>()

    // From mitre_coverage
    mitreCoverage?.techniques?.forEach((t) => {
      techMap.set(t.id, {
        id: t.id,
        name: t.name,
        tactic: t.tactic,
        count: t.count || 1,
      })
    })

    // From alerts
    alerts.forEach((alert) => {
      const techs = alert.mitre_techniques || alert.techniques || []
      techs.forEach((techId) => {
        if (techMap.has(techId)) {
          const existing = techMap.get(techId)!
          techMap.set(techId, { ...existing, count: existing.count + 1 })
        } else {
          techMap.set(techId, {
            id: techId,
            name: techId,
            tactic: 'Unknown',
            count: 1,
          })
        }
      })
    })

    return Array.from(techMap.values())
  }, [mitreCoverage, alerts])

  // Group by tactic
  const tacticGroups = useMemo(() => {
    const groups: Record<string, typeof techniques> = {}
    MITRE_TACTICS.forEach((tactic) => {
      groups[tactic] = techniques.filter(
        (t) => t.tactic.toLowerCase().includes(tactic.toLowerCase().split(' ')[0])
      )
    })
    return groups
  }, [techniques])

  const totalTechniques = techniques.length
  const coveredTactics = Object.values(tacticGroups).filter((g) => g.length > 0).length

  const getHeatColor = (count: number) => {
    if (count >= 5) return 'bg-red-500'
    if (count >= 3) return 'bg-orange-500'
    if (count >= 1) return 'bg-yellow-500'
    return 'bg-secondary'
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20 text-primary">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTechniques}</p>
                <p className="text-sm text-muted-foreground">Tespit Edilen Teknik</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/20 text-orange-400">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{coveredTactics}</p>
                <p className="text-sm text-muted-foreground">Etkilenen Taktik</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/20 text-green-400">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.round((coveredTactics / MITRE_TACTICS.length) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Taktik Kapsamı</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MITRE Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            MITRE ATT&CK Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[900px]">
              {MITRE_TACTICS.slice(0, 7).map((tactic, index) => (
                <div key={tactic} className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-2 rounded-lg bg-secondary text-center"
                  >
                    <h4 className="text-xs font-medium truncate">{tactic}</h4>
                  </motion.div>
                  <div className="space-y-1">
                    {tacticGroups[tactic]?.map((tech, i) => (
                      <Tooltip key={tech.id}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 + i * 0.02 }}
                            className={`p-2 rounded text-xs cursor-pointer transition-colors ${getHeatColor(
                              tech.count
                            )} text-white`}
                          >
                            <p className="font-mono text-[10px]">{tech.id}</p>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium">{tech.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tech.id} - {tech.count} kez tespit
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {tacticGroups[tactic]?.length === 0 && (
                      <div className="p-2 rounded bg-secondary/30 text-center">
                        <span className="text-[10px] text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Second row */}
            <div className="grid grid-cols-7 gap-2 min-w-[900px] mt-4">
              {MITRE_TACTICS.slice(7, 14).map((tactic, index) => (
                <div key={tactic} className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (index + 7) * 0.05 }}
                    className="p-2 rounded-lg bg-secondary text-center"
                  >
                    <h4 className="text-xs font-medium truncate">{tactic}</h4>
                  </motion.div>
                  <div className="space-y-1">
                    {tacticGroups[tactic]?.map((tech, i) => (
                      <Tooltip key={tech.id}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (index + 7) * 0.05 + i * 0.02 }}
                            className={`p-2 rounded text-xs cursor-pointer transition-colors ${getHeatColor(
                              tech.count
                            )} text-white`}
                          >
                            <p className="font-mono text-[10px]">{tech.id}</p>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-medium">{tech.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tech.id} - {tech.count} kez tespit
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {tacticGroups[tactic]?.length === 0 && (
                      <div className="p-2 rounded bg-secondary/30 text-center">
                        <span className="text-[10px] text-muted-foreground">—</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-4 mt-6 text-xs">
            <span className="text-muted-foreground">Yoğunluk:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span>1-2</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span>3-4</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>5+</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detected Techniques List */}
      <Card>
        <CardHeader>
          <CardTitle>Tespit Edilen Teknikler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {techniques.map((tech, index) => (
              <motion.div
                key={tech.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-mono text-sm">{tech.id}</p>
                  <p className="text-xs text-muted-foreground">{tech.name}</p>
                </div>
                <Badge variant="secondary">{tech.count}</Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
