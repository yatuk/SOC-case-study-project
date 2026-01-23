import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Shield, Play, Save, Plus } from 'lucide-react'
import { toast } from 'sonner'

const MOCK_RULES = [
  {
    id: 1,
    title: "Suspicious PowerShell Download",
    severity: "High",
    status: "active",
    yaml: `title: Suspicious PowerShell Download
id: 5f1f759e-d9d3-4d6a-b7c9-1234567890ab
status: experimental
description: Detects suspicious PowerShell download patterns
author: SOC Analyst
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        Image|endswith: '\\powershell.exe'
        CommandLine|contains:
            - 'Net.WebClient'
            - 'DownloadFile'
            - 'DownloadString'
    condition: selection
falsepositives:
    - Admin scripts
level: high`
  },
  {
    id: 2,
    title: "RDP Brute Force Attempt",
    severity: "Medium",
    status: "active",
    yaml: `title: RDP Brute Force
id: 12345678-1234-1234-1234-123456789012
description: Detects multiple failed RDP logins
logsource:
    service: security
detection:
    selection:
        EventID: 4625
        LogonType: 10
    timeframe: 1m
    condition: selection | count() > 5
level: medium`
  }
]

export default function SigmaRules() {
  const [rules] = useState(MOCK_RULES)
  const [selectedRule, setSelectedRule] = useState(MOCK_RULES[0])
  const [editorContent, setEditorContent] = useState(MOCK_RULES[0].yaml)
  const [isTestRunning, setIsTestRunning] = useState(false)

  const handleRuleSelect = (rule: typeof MOCK_RULES[0]) => {
    setSelectedRule(rule)
    setEditorContent(rule.yaml)
  }

  const handleTestRule = () => {
    setIsTestRunning(true)
    setTimeout(() => {
      setIsTestRunning(false)
      toast.success("Rule syntax valid. No detection in last 24h logs.")
    }, 1500)
  }

  const handleSave = () => {
    toast.success("Sigma rule updated successfully")
  }

  return (
    <div className="h-[calc(100vh-6rem)] grid grid-cols-12 gap-6">
      {/* Rule List */}
      <Card className="col-span-3 flex flex-col h-full border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Rules</span>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </CardTitle>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search rules..." 
              className="w-full bg-background/50 border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ring-primary"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => handleRuleSelect(rule)}
                  className={`w-full text-left px-3 py-3 rounded-lg border transition-all ${
                    selectedRule.id === rule.id 
                      ? 'bg-primary/10 border-primary/50' 
                      : 'bg-card hover:bg-accent border-transparent hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate text-sm">{rule.title}</span>
                    {rule.status === 'active' && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${
                      rule.severity === 'High' ? 'text-red-400 border-red-900/50' : 'text-yellow-400 border-yellow-900/50'
                    }`}>
                      {rule.severity}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Windows</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Editor Area */}
      <div className="col-span-9 grid grid-rows-[auto,1fr] gap-4 h-full">
        {/* Toolbar */}
        <Card className="p-2 flex items-center justify-between border-primary/20">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-bold">{selectedRule.title}</h2>
            <Badge variant="secondary" className="ml-2">YAML</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleTestRule} disabled={isTestRunning}>
              {isTestRunning ? (
                <span className="animate-spin mr-2">⟳</span>
              ) : (
                <Play className="h-3.5 w-3.5 mr-2" />
              )}
              Test Rule
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-2">
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Monaco Editor */}
        <Card className="overflow-hidden border-primary/20 bg-[#1e1e1e]">
          <Editor
            height="100%"
            defaultLanguage="yaml"
            theme="vs-dark"
            value={editorContent}
            onChange={(val) => setEditorContent(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          />
        </Card>
      </div>
    </div>
  )
}
