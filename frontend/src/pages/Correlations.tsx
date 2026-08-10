import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, type Node, type Edge } from 'reactflow'
import 'reactflow/dist/style.css'
import { loadEntity } from '@/lib/data'
import { SkeletonChart } from '@/components/ui/skeleton-card'
import { X, User, Monitor, Globe, AlertTriangle, ClipboardList, ShieldAlert, FileText } from 'lucide-react'

interface CorrEdge {
  source: string
  target: string
  type: string
  weight: number
}

interface NodeDetail {
  id: string
  kind: string
  related: { id: string; type: string }[]
}

type NodeKind = 'user' | 'device' | 'ip' | 'alert' | 'case' | 'incident' | 'event'

const NODE_TYPES: Record<NodeKind, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  user:     { color: '#58a6ff', icon: User, label: 'User' },
  device:   { color: '#3fb950', icon: Monitor, label: 'Device' },
  ip:       { color: '#f0883e', icon: Globe, label: 'IP' },
  alert:    { color: '#f85149', icon: AlertTriangle, label: 'Alert' },
  case:     { color: '#8b5cf6', icon: ClipboardList, label: 'Case' },
  incident: { color: '#f59e0b', icon: ShieldAlert, label: 'Incident' },
  event:    { color: '#8b949e', icon: FileText, label: 'Event' },
}

const EDGE_COLORS: Record<string, string> = {
  user_ip: '#58a6ff',
  case_alert: '#8b5cf6',
  alert_evidence: '#f85149',
}

function detectKind(id: string): NodeKind {
  if (id.includes('@')) return 'user'
  if (id.startsWith('DEV') || id.startsWith('AST')) return 'device'
  if (id.startsWith('ALR')) return 'alert'
  if (id.startsWith('CASE')) return 'case'
  if (id.startsWith('INC')) return 'incident'
  if (id.startsWith('EVT')) return 'event'
  // IPv4 / IPv6 pattern
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(id) || id.includes(':')) return 'ip'
  return 'ip'
}

export default function Correlations() {
  const [edges, setEdges] = useState<CorrEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null)
  const [visibleKinds, setVisibleKinds] = useState<Set<NodeKind>>(new Set(['user', 'device', 'ip', 'alert', 'case', 'incident', 'event']))

  useEffect(() => {
    loadEntity<{ edges: CorrEdge[] }>('correlations.json')
      .then(data => setEdges(data.edges ?? []))
      .catch(() => setEdges([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleKind = (kind: NodeKind) => {
    setVisibleKinds(prev => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodeSet = new Set<string>()
    edges.forEach(e => { nodeSet.add(e.source); nodeSet.add(e.target) })

    // Build adjacency for detail panel
    const nodeEdges = new Map<string, { id: string; type: string }[]>()
    edges.forEach(e => {
      if (!nodeEdges.has(e.source)) nodeEdges.set(e.source, [])
      if (!nodeEdges.has(e.target)) nodeEdges.set(e.target, [])
      nodeEdges.get(e.source)!.push({ id: e.target, type: e.type })
      nodeEdges.get(e.target)!.push({ id: e.source, type: e.type })
    })

    const nodes: Node[] = Array.from(nodeSet)
      .map((id, i) => {
        const kind = detectKind(id)
        const t = NODE_TYPES[kind]
        return {
          id,
          position: { x: (i % 8) * 170 + 40, y: Math.floor(i / 8) * 110 + 40 },
          data: {
            label: id.length > 24 ? id.slice(0, 21) + '...' : id,
            kind,
            detail: { id, kind, related: nodeEdges.get(id) ?? [] },
          },
          style: {
            background: `${t.color}18`,
            border: `1.5px solid ${t.color}`,
            color: t.color,
            padding: '6px 14px',
            borderRadius: '10px',
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
          },
        }
      })

    // Filter visible kinds
    const visibleNodes = nodes.filter(n => visibleKinds.has(n.data.kind as NodeKind))
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id))

    const rfEdges: Edge[] = edges
      .filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
      .map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.type.replace(/_/g, ' '),
        style: { stroke: EDGE_COLORS[e.type] || '#8b949e', strokeWidth: Math.max(0.5, e.weight * 1.5) },
        labelStyle: { fontSize: '7px', fill: '#8b949e' },
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 3,
      }))

    return { initialNodes: visibleNodes.slice(0, 120), initialEdges: rfEdges.slice(0, 300) }
  }, [edges, visibleKinds])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [rfEdges, , onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data.detail as NodeDetail)
  }, [])

  if (loading) return <div className="p-6"><SkeletonChart height="h-[70vh]" /></div>

  const nodeKindCounts = Object.fromEntries(
    (Object.keys(NODE_TYPES) as NodeKind[]).map(k => {
      const count = nodes.filter(n => n.data.kind === k).length
      return [k, count] as [NodeKind, number]
    })
  )

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">İlişki Grafiği</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{nodes.length} düğüm · {rfEdges.length} bağlantı</p>
      </div>

      {/* Legend + Filter */}
      <div className="flex items-center gap-2 flex-wrap text-2xs">
        {(Object.entries(NODE_TYPES) as [NodeKind, typeof NODE_TYPES['user']][]).map(([kind, t]) => {
          const active = visibleKinds.has(kind)
          const count = nodeKindCounts[kind] ?? 0
          return (
            <button
              key={kind}
              onClick={() => toggleKind(kind)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors border ${active ? 'bg-card border-border text-foreground' : 'border-transparent text-muted-foreground/40 line-through'}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              {<t.icon className="w-3 h-3" />}
              <span>{t.label}</span>
              {count > 0 && <span className="text-muted-foreground">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Graph */}
      <div className="rounded-lg border border-border overflow-hidden h-[65vh] relative">
        <ReactFlow
          nodes={nodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
          minZoom={0.1}
          maxZoom={2}
        >
          <Background color="hsl(var(--muted-foreground) / 0.08)" gap={24} />
          <Controls className="[&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button]:!rounded-md" />
          <MiniMap
            nodeColor={(n) => NODE_TYPES[(n.data?.kind as NodeKind) ?? 'ip']?.color ?? '#8b949e'}
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            maskColor="hsl(var(--background) / 0.7)"
          />
        </ReactFlow>
      </div>

      {/* Node detail sidebar */}
      {selectedNode && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedNode(null)} onKeyDown={(e) => e.key === 'Escape' && setSelectedNode(null)} role="button" tabIndex={0} aria-label="Kapat" />
          <aside className="fixed right-0 top-0 z-50 h-full w-80 bg-card border-l border-border overflow-y-auto animate-slide-in-right" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                {(() => { const Icon = NODE_TYPES[selectedNode.kind as NodeKind]?.icon; return Icon ? <Icon className="w-3.5 h-3.5" /> : null })()}
                <span className="text-sm font-semibold">{NODE_TYPES[selectedNode.kind as NodeKind]?.label}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-accent" aria-label="Kapat"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">ID</div>
                <div className="font-mono text-xs break-all bg-muted/30 rounded p-2">{selectedNode.id}</div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Bağlantılar ({selectedNode.related.length})
                </div>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {selectedNode.related.map((r, i) => {
                    const rKind = detectKind(r.id)
                    const t = NODE_TYPES[rKind]
                    return (
                      <div key={`${r.id}-${i}`} className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs hover:bg-accent transition-colors">
                        {<t.icon className="w-3 h-3 shrink-0" />}
                        <span className="font-mono text-xs truncate flex-1">{r.id}</span>
                        <span className="text-2xs text-muted-foreground bg-muted px-1 rounded">{r.type.replace(/_/g, ' ')}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick links for known entity types */}
              {selectedNode.id.startsWith('ALR') && (
                <Link to={`/alerts/${selectedNode.id}`} onClick={() => setSelectedNode(null)} className="block w-full text-center px-3 py-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  Alerte Git →
                </Link>
              )}
              {selectedNode.id.startsWith('INC') && (
                <Link to={`/incidents/${selectedNode.id}`} onClick={() => setSelectedNode(null)} className="block w-full text-center px-3 py-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  Olaya Git →
                </Link>
              )}
              {selectedNode.id.startsWith('CASE') && (
                <Link to={`/cases/${selectedNode.id}`} onClick={() => setSelectedNode(null)} className="block w-full text-center px-3 py-2 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  Vakaya Git →
                </Link>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
