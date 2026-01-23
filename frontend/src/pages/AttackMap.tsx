import { useState, useEffect } from 'react'
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Zap, Globe, Target, Terminal } from 'lucide-react'

// World Map TopoJSON
const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

interface Attack {
  id: string
  source: [number, number]
  target: [number, number]
  sourceCountry: string
  targetCountry: string
  type: string
  timestamp: number
}

const ATTACK_TYPES = [
  { name: 'DDoS', color: '#ef4444' }, // Red
  { name: 'Brute Force', color: '#f97316' }, // Orange
  { name: 'SQL Injection', color: '#eab308' }, // Yellow
  { name: 'Malware C2', color: '#a855f7' }, // Purple
  { name: 'Port Scan', color: '#3b82f6' }, // Blue
]

const CITIES = [
  { name: "New York", coordinates: [-74.006, 40.7128] },
  { name: "London", coordinates: [-0.1276, 51.5074] },
  { name: "Tokyo", coordinates: [139.6917, 35.6895] },
  { name: "Beijing", coordinates: [116.4074, 39.9042] },
  { name: "Moscow", coordinates: [37.6173, 55.7558] },
  { name: "Sydney", coordinates: [151.2093, -33.8688] },
  { name: "Sao Paulo", coordinates: [-46.6333, -23.5505] },
  { name: "Istanbul", coordinates: [28.9784, 41.0082] },
  { name: "Dubai", coordinates: [55.2708, 25.2048] },
  { name: "Singapore", coordinates: [103.8198, 1.3521] },
]

export default function AttackMap() {
  const [attacks, setAttacks] = useState<Attack[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [stats, setStats] = useState({ total: 0, critical: 0, blocked: 0 })

  // Simulate incoming attacks
  useEffect(() => {
    const interval = setInterval(() => {
      const source = CITIES[Math.floor(Math.random() * CITIES.length)]
      let target = CITIES[Math.floor(Math.random() * CITIES.length)]
      while (target.name === source.name) {
        target = CITIES[Math.floor(Math.random() * CITIES.length)]
      }
      
      const type = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)]
      
      const newAttack: Attack = {
        id: Math.random().toString(36).substr(2, 9),
        source: source.coordinates as [number, number],
        target: target.coordinates as [number, number],
        sourceCountry: source.name,
        targetCountry: target.name,
        type: type.name,
        timestamp: Date.now(),
      }

      setAttacks(current => [...current.slice(-15), newAttack])
      setLogs(current => [`[${new Date().toLocaleTimeString()}] ${type.name} detected from ${source.name} to ${target.name}`, ...current.slice(0, 9)])
      
      setStats(prev => ({
        total: prev.total + 1,
        critical: type.name === 'DDoS' || type.name === 'Malware C2' ? prev.critical + 1 : prev.critical,
        blocked: Math.random() > 0.3 ? prev.blocked + 1 : prev.blocked
      }))
    }, 1200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-[calc(100vh-6rem)] grid grid-rows-[auto,1fr,auto] gap-4 overflow-hidden">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/50 backdrop-blur border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Live Threats</p>
            <h3 className="text-2xl font-bold font-mono text-red-500 animate-pulse">{attacks.length}</h3>
          </div>
          <Zap className="h-8 w-8 text-red-500/50" />
        </Card>
        <Card className="p-4 bg-card/50 backdrop-blur border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Analyzed</p>
            <h3 className="text-2xl font-bold font-mono">{stats.total.toLocaleString()}</h3>
          </div>
          <Globe className="h-8 w-8 text-blue-500/50" />
        </Card>
        <Card className="p-4 bg-card/50 backdrop-blur border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Threats Blocked</p>
            <h3 className="text-2xl font-bold font-mono text-green-500">{stats.blocked.toLocaleString()}</h3>
          </div>
          <Shield className="h-8 w-8 text-green-500/50" />
        </Card>
        <Card className="p-4 bg-card/50 backdrop-blur border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Critical Alerts</p>
            <h3 className="text-2xl font-bold font-mono text-orange-500">{stats.critical.toLocaleString()}</h3>
          </div>
          <Target className="h-8 w-8 text-orange-500/50" />
        </Card>
      </div>

      {/* Main Map Area */}
      <Card className="relative bg-[#020617] border-primary/20 overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.1)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#020617] to-[#020617]" />
        <div className="absolute top-4 left-4 z-10">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 tracking-widest flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-500 animate-spin-slow" />
            GLOBAL THREAT MAP
          </h2>
        </div>
        
        <div className="w-full h-full"> 
          <ComposableMap
            projectionConfig={{
              scale: 180,
              rotate: [-10, 0, 0],
            }}
            width={800}
            height={400}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#0f172a"
                    stroke="#1e293b"
                    strokeWidth={1}
                    style={{
                      default: { outline: "none", filter: "drop-shadow(0 0 5px rgba(15, 23, 42, 0.5))" },
                      hover: { fill: "#1e293b", stroke: "#38bdf8", strokeWidth: 2, outline: "none", transition: "all 0.3s" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            <AnimatePresence>
              {attacks.map((attack) => {
                const typeInfo = ATTACK_TYPES.find(t => t.name === attack.type)
                const color = typeInfo?.color || '#ef4444'
                
                return (
                  <g key={attack.id}>
                    <Line
                      from={attack.source}
                      to={attack.target}
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeOpacity={0.6}
                    />
                    <Marker coordinates={attack.source}>
                       <circle r={3} fill={color} opacity={0.8} />
                       <circle r={8} fill={color} opacity={0.3} className="animate-ping" />
                    </Marker>
                    <Marker coordinates={attack.target}>
                      <circle r={4} fill={color} />
                      <circle r={12} stroke={color} fill="none" strokeWidth={1} className="animate-ping" style={{ animationDuration: '2s' }} />
                    </Marker>
                  </g>
                )
              })}
            </AnimatePresence>
          </ComposableMap>
        </div>

        {/* Overlay Grid */}
        <div className="absolute inset-0 pointer-events-none bg-[url('/grid.svg')] opacity-10" />
      </Card>

      {/* Terminal / Logs Panel */}
      <Card className="h-48 bg-black/90 border-t border-primary/30 p-2 font-mono text-xs overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-2 px-2 text-primary/70 border-b border-primary/20 pb-2">
          <Terminal className="h-4 w-4" />
          <span>LIVE THREAT FEED // MONITORING IN PROGRESS...</span>
        </div>
        <div className="flex-1 overflow-y-hidden relative">
          <div className="absolute bottom-0 left-0 w-full space-y-1 px-2">
             <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-green-500/80 truncate"
                >
                  <span className="text-blue-400 mr-2">➜</span>
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  )
}
