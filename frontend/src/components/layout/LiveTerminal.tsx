import { useState, useEffect, useRef } from 'react'
import { Terminal, X, Minimize2, Maximize2, Pause, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Log {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
  source: string
  message: string
}

const LOG_LEVELS = ['INFO', 'WARN', 'ERROR', 'SUCCESS'] as const
const SOURCES = ['FIREWALL', 'IDS', 'AUTH', 'SYSTEM', 'DATABASE', 'NETWORK']

const MOCK_MESSAGES = [
  "Packet allowed from 192.168.1.105 on port 443",
  "Failed login attempt for user 'admin' from 10.0.0.5",
  "Database connection pool optimization starting...",
  "Suspicious payload detected in HTTP request: /api/v1/query?id=' OR 1=1",
  "User 'jdoe' elevated privileges to root",
  "Backup completed successfully: archive_2024.tar.gz",
  "High latency detected on interface eth0",
  "Service 'nginx' restarted by watchdog",
  "New device connected: MAC AA:BB:CC:DD:EE:FF",
  "SSL certificate validation failed for endpoint",
]

export default function LiveTerminal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [logs, setLogs] = useState<Log[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Toggle terminal visibility (can be triggered globally if needed)
  useEffect(() => {
    const handleToggle = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleToggle)
    return () => window.removeEventListener('keydown', handleToggle)
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current && !isPaused) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isPaused])

  // Generate logs
  useEffect(() => {
    if (isPaused) return

    const generateLog = () => {
      const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)]
      const source = SOURCES[Math.floor(Math.random() * SOURCES.length)]
      const message = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]
      
      const newLog: Log = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        level,
        source,
        message
      }

      setLogs((prev) => [...prev.slice(-100), newLog]) // Keep last 100 logs
    }

    const interval = setInterval(generateLog, 1500)
    return () => clearInterval(interval)
  }, [isPaused])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black/90 text-primary border border-primary/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-110 transition-transform"
        title="Open Live Terminal (Ctrl + `)"
      >
        <Terminal className="h-6 w-6" />
      </button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={cn(
          "fixed z-50 bg-[#0c0c0c]/95 border-t-2 border-primary/50 backdrop-blur shadow-2xl transition-all duration-300 ease-in-out font-mono text-xs",
          isMinimized 
            ? "bottom-4 right-20 w-80 h-10 rounded-lg border-2" 
            : "bottom-0 left-0 w-full h-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-primary/20 cursor-pointer"
             onClick={() => !isMinimized && setIsMinimized(true)}>
          <div className="flex items-center gap-2 text-primary">
            <Terminal className="h-4 w-4" />
            <span className="font-bold tracking-wider">SYSTEM_LOGS // LIVE_FEED</span>
            {!isMinimized && (
              <span className="ml-2 text-[10px] bg-primary/20 px-1 rounded animate-pulse">Running...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
             <button
              onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
              className="p-1 hover:bg-primary/20 rounded text-primary/80 hover:text-primary transition-colors"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-1 hover:bg-primary/20 rounded text-primary/80 hover:text-primary transition-colors"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="p-1 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Log Content */}
        {!isMinimized && (
          <div className="h-[calc(100%-40px)] overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 hover:bg-white/5 p-0.5 rounded">
                <span className="text-gray-500 select-none">[{log.timestamp}]</span>
                <span className={cn(
                  "font-bold w-16 select-none",
                  log.level === 'INFO' && "text-blue-400",
                  log.level === 'WARN' && "text-yellow-400",
                  log.level === 'ERROR' && "text-red-500",
                  log.level === 'SUCCESS' && "text-green-400",
                )}>
                  {log.level}
                </span>
                <span className="text-purple-400 w-24 select-none shrink-0">{log.source}</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
            <div ref={bottomRef} />
             {/* Cursor Effect */}
             <div className="flex items-center gap-2 mt-2">
                <span className="text-primary">root@soc-core:~#</span>
                <span className="w-2 h-4 bg-primary/50 animate-pulse" />
             </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
