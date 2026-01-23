import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Title, Text, Grid, Col, Metric, Badge, Flex, Tab, TabList, TabGroup, TabPanels, TabPanel } from '@tremor/react'
import { Shield, AlertTriangle, Cpu, Globe, ArrowLeft, Activity, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlaybookRunner } from '@/components/investigation/PlaybookRunner'
import { ActionCenter } from '@/components/investigation/ActionCenter'
import ForceGraph3D from 'react-force-graph-3d'

// Mock Evidence Data
const EVIDENCE = [
    { type: 'IP Address', value: '192.168.1.105', rep: 85, source: 'Firewall Logs' },
    { type: 'File Hash', value: 'a1b2c3d4...', rep: 100, source: 'EDR Agent' },
    { type: 'User', value: 'jdoe', rep: 20, source: 'Active Directory' },
]

export default function CaseDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // Find case or alert data (simulated)
  // In real app, fetch by ID
  const caseData = {
      title: "Suspicious PowerShell Activity detected on HR-PC01",
      severity: "critical",
      status: "open",
      assignedTo: "Analyst-1",
      created: "2024-03-15 14:32:00",
      description: "EDR agent detected encoded PowerShell command execution attempting to establish external C2 connection."
  }

  const playbookSteps = [
      { id: '1', title: 'Triage & Validate', description: 'Confirm if the PowerShell script is legitimate administrative activity.', completed: true },
      { id: '2', title: 'Analyze Payload', description: 'Decode base64 string and identify target IP/Domain.', completed: false },
      { id: '3', title: 'Isolate Endpoint', description: 'Disconnect host from network to prevent lateral movement.', completed: false },
      { id: '4', title: 'Contain User', description: 'Reset password for compromised user account.', completed: false },
      { id: '5', title: 'Remediation', description: 'Delete malicious artifacts and restore from backup if needed.', completed: false },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                 <ArrowLeft className="h-6 w-6" />
             </Button>
             <div>
                 <Flex justifyContent="start" className="gap-3">
                    <Title className="text-2xl text-red-500 flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        CASE-{id || '10234'} // WAR ROOM
                    </Title>
                    <Badge color="red" size="lg" className="animate-pulse">CRITICAL</Badge>
                    <Badge color="blue">OPEN</Badge>
                 </Flex>
                 <Text className="mt-1">{caseData.title}</Text>
             </div>
         </div>
         <div className="flex gap-4 text-right">
             <div>
                 <Text>SLA Timer</Text>
                 <Metric className="text-red-500 font-mono">00:45:12</Metric>
             </div>
         </div>
      </div>

      <Grid numItems={3} className="gap-6">
          {/* Left Column: Investigation & Evidence */}
          <Col numColSpan={2} className="space-y-6">
             {/* Key Facts */}
             <div className="grid grid-cols-3 gap-4">
                 <Card decoration="top" decorationColor="slate">
                     <Text>Etkilenen Cihaz</Text>
                     <Title className="flex items-center gap-2"><Cpu className="h-4 w-4" /> HR-PC01</Title>
                 </Card>
                 <Card decoration="top" decorationColor="slate">
                     <Text>Kullanıcı</Text>
                     <Title className="flex items-center gap-2"><Globe className="h-4 w-4" /> jdoe</Title>
                 </Card>
                 <Card decoration="top" decorationColor="slate">
                     <Text>Tespit Kaynağı</Text>
                     <Title className="flex items-center gap-2"><Shield className="h-4 w-4" /> CrowdStrike</Title>
                 </Card>
             </div>

             {/* Tabbed Investigation Panel */}
             <TabGroup>
                <TabList className="mt-4">
                    <Tab icon={Activity}>Timeline & Graph</Tab>
                    <Tab icon={FileText}>Evidence Board</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel>
                       <Card className="h-96 mt-4 p-0 overflow-hidden relative">
                           {/* Investigation Graph (Mini) */}
                           <div className="absolute inset-0 bg-[#0b1121]">
                                <ForceGraph3D
                                    width={800}
                                    height={400}
                                    graphData={{
                                        nodes: [
                                            { id: 'attacker', group: 'external', color: 'red' }, 
                                            { id: 'victim', group: 'internal', color: 'blue' },
                                            { id: 'router', group: 'network', color: 'green' }
                                        ] as any[],
                                        links: [
                                            { source: 'attacker', target: 'router' },
                                            { source: 'router', target: 'victim' }
                                        ]
                                    }}
                                    nodeColor="color"
                                    backgroundColor="#0b1121"
                                    showNavInfo={false}
                                />
                           </div>
                           <div className="absolute top-2 left-2 p-2 bg-black/50 rounded pointer-events-none">
                               <Text className="text-xs font-mono text-green-400">ATTACK VECTOR VISUALIZATION</Text>
                           </div>
                       </Card>
                    </TabPanel>
                    <TabPanel>
                        <Card className="mt-4">
                            <Title>Toplanan Kanıtlar</Title>
                            <div className="mt-4 space-y-2">
                                {EVIDENCE.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded">
                                        <div className="flex items-center gap-3">
                                            <Badge size="xs" color="slate">{item.type}</Badge>
                                            <code className="text-sm text-blue-400">{item.value}</code>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Text className="text-xs text-gray-400">{item.source}</Text>
                                            <Badge color={item.rep > 80 ? 'red' : 'green'}>
                                                Risk Score: {item.rep}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </TabPanel>
                </TabPanels>
             </TabGroup>
          </Col>

          {/* Right Column: Response Action */}
          <Col numColSpan={1} className="space-y-6">
              <PlaybookRunner title="Malware Outbreak Response" steps={playbookSteps} />
              <ActionCenter />
          </Col>
      </Grid>
    </div>
  )
}
