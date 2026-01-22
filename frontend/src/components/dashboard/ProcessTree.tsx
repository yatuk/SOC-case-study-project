import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ProcessInfo } from '@/types'
import { ChevronRight, AlertTriangle, Terminal } from 'lucide-react'

interface ProcessTreeProps {
  processes: ProcessInfo[]
  className?: string
}

interface TreeNode {
  process: string
  pid?: number
  timestamp?: string
  children: TreeNode[]
  suspicious: boolean
}

// Suspicious process patterns
const SUSPICIOUS_PATTERNS = [
  /powershell.*-enc/i,
  /cmd.*\/c/i,
  /wscript/i,
  /cscript/i,
  /mshta/i,
  /certutil/i,
  /bitsadmin/i,
  /regsvr32/i,
  /rundll32/i,
  /msiexec.*http/i,
]

function isSuspicious(processName: string): boolean {
  return SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(processName))
}

function buildProcessTree(processes: ProcessInfo[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create nodes
  processes.forEach((p) => {
    const node: TreeNode = {
      process: p.process,
      pid: p.pid,
      timestamp: p.timestamp,
      children: [],
      suspicious: isSuspicious(p.process),
    }
    nodeMap.set(p.process, node)
  })

  // Build tree
  processes.forEach((p) => {
    const node = nodeMap.get(p.process)!
    if (p.parent && nodeMap.has(p.parent)) {
      nodeMap.get(p.parent)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function ProcessNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth * 0.05 }}
      className="space-y-1"
    >
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-muted/50',
          node.suspicious && 'bg-red-500/10 border border-red-500/30'
        )}
        style={{ marginLeft: depth * 20 }}
      >
        {node.children.length > 0 && (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        {node.children.length === 0 && <div className="w-4" />}
        
        <Terminal
          className={cn(
            'h-4 w-4 shrink-0',
            node.suspicious ? 'text-red-500' : 'text-muted-foreground'
          )}
        />
        
        <span
          className={cn(
            'font-mono text-sm truncate',
            node.suspicious && 'text-red-400'
          )}
        >
          {node.process}
        </span>
        
        {node.pid && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            PID: {node.pid}
          </Badge>
        )}
        
        {node.suspicious && (
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
        )}
      </div>
      
      {node.children.map((child, i) => (
        <ProcessNode key={`${child.process}-${i}`} node={child} depth={depth + 1} />
      ))}
    </motion.div>
  )
}

export function ProcessTree({ processes, className }: ProcessTreeProps) {
  const tree = useMemo(() => buildProcessTree(processes), [processes])
  const hasSuspicious = useMemo(
    () => processes.some((p) => isSuspicious(p.process)),
    [processes]
  )

  if (processes.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        İşlem verisi yok
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {hasSuspicious && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-red-400">
            Şüpheli işlem tespit edildi!
          </span>
        </div>
      )}
      
      <div className="space-y-1">
        {tree.map((node, i) => (
          <ProcessNode key={`${node.process}-${i}`} node={node} />
        ))}
      </div>
    </div>
  )
}
