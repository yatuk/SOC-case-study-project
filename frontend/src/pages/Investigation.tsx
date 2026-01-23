import { useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import { Card, Title, Text, Metric, Grid, Badge, Flex } from '@tremor/react'
import { Shield, Server, Globe, AlertTriangle, Activity } from 'lucide-react'

// Generate mock graph data
const generateGraphData = (nodeCount = 50) => {
  const nodes = [...Array(nodeCount).keys()].map((i) => ({
    id: i,
    label: i === 0 ? 'SOC-Hub' : i < 5 ? `Server-${i}` : `Node-${i}`,
    group: i === 0 ? 'hub' : i < 5 ? 'server' : Math.random() > 0.8 ? 'external' : 'endpoint',
    val: i === 0 ? 20 : i < 5 ? 10 : 3,
    status: Math.random() > 0.9 ? 'compromised' : 'secure'
  }))

  const links = []
  for (let i = 1; i < nodeCount; i++) {
    links.push({
      source: i,
      target: i < 5 ? 0 : Math.floor(Math.random() * 5), // Connect to hub or servers
      value: 1
    })
    // Random extra connections
    if (Math.random() > 0.9) {
      links.push({
        source: i,
        target: Math.floor(Math.random() * nodeCount),
        value: 1
      })
    }
  }

  return { nodes, links }
}

export default function Investigation() {
  const fgRef = useRef<any>()
  const [data] = useState(generateGraphData(60))
  const [selectedNode, setSelectedNode] = useState<any>(null)
  
  // Calculate node colors based on group and status
  const getNodeColor = (node: any) => {
    if (node.id === 0) return '#3b82f6' // Blue (Hub)
    if (node.status === 'compromised') return '#ef4444' // Red
    if (node.group === 'external') return '#eab308' // Yellow
    if (node.group === 'server') return '#a855f7' // Purple
    return '#06b6d4' // Cyan (Endpoint)
  }

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <Title>Network Topology Investigation</Title>
          <Text>3D visualization of network assets and traffic flow</Text>
        </div>
        <div className="flex gap-2">
            <Badge color="blue" icon={Activity}>Active</Badge>
            <Badge color="red" icon={AlertTriangle}>{data.nodes.filter(n => n.status === 'compromised').length} Threats</Badge>
        </div>
      </div>

      <Grid numItems={4} className="gap-4">
        <Card decoration="top" decorationColor="blue">
            <Text>Total Nodes</Text>
            <Metric>{data.nodes.length}</Metric>
        </Card>
        <Card decoration="top" decorationColor="purple">
            <Flex justifyContent="start" className="space-x-2">
                <Server className="h-5 w-5 text-purple-500" />
                <Text>Server Infrastructure</Text>
            </Flex>
            <Metric>{data.nodes.filter(n => n.group === 'server').length}</Metric>
        </Card>
        <Card decoration="top" decorationColor="cyan">
             <Flex justifyContent="start" className="space-x-2">
                <Shield className="h-5 w-5 text-cyan-500" />
                <Text>Endpoints</Text>
            </Flex>
            <Metric>{data.nodes.filter(n => n.group === 'endpoint').length}</Metric>
        </Card>
         <Card decoration="top" decorationColor="yellow">
            <Flex justifyContent="start" className="space-x-2">
                <Globe className="h-5 w-5 text-yellow-500" />
                <Text>External Connections</Text>
            </Flex>
            <Metric>{data.nodes.filter(n => n.group === 'external').length}</Metric>
        </Card>
      </Grid>
      
      <Card className="flex-1 p-0 overflow-hidden relative border-t-4 border-blue-500/20">
         {/* Graph Container */}
         <div className="absolute inset-0 bg-[#0b1121]">
            <ForceGraph3D
                ref={fgRef}
                graphData={data}
                nodeLabel="label"
                nodeColor={getNodeColor}
                nodeVal="val"
                linkColor={() => '#1e293b'} // Dark slate lines
                linkWidth={0.5}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleColor={() => '#38bdf8'} // Cyan particles
                backgroundColor="#0b1121" // Match card bg
                onNodeClick={(node: any) => {
                    const distance = 40;
                    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
                    
                    if (fgRef.current) {
                        fgRef.current.cameraPosition(
                            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                            node, // lookAt ({ x, y, z })
                            3000  // ms transition duration
                        );
                    }
                    setSelectedNode(node)
                }}
            />
         </div>
         
         {/* Overlay Info Panel */}
         {selectedNode && (
             <div className="absolute top-4 right-4 w-64">
                <Card className="bg-black/80 backdrop-blur border border-primary/20">
                    <Title className="text-primary">{selectedNode.label}</Title>
                    <div className="mt-2 space-y-2">
                        <Flex justifyContent="between">
                            <Text className="text-gray-400">ID:</Text>
                            <Text className="font-mono">{selectedNode.id}</Text>
                        </Flex>
                        <Flex justifyContent="between">
                            <Text className="text-gray-400">Type:</Text>
                            <Badge size="xs" color="slate">{selectedNode.group}</Badge>
                        </Flex>
                        <Flex justifyContent="between">
                            <Text className="text-gray-400">Status:</Text>
                             <Badge size="xs" color={selectedNode.status === 'compromised' ? 'red' : 'green'}>{selectedNode.status.toUpperCase()}</Badge>
                        </Flex>
                    </div>
                </Card>
             </div>
         )}
      </Card>
    </div>
  )
}
