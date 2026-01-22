import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Download, Printer } from 'lucide-react'

// Simple markdown renderer
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    // Bold & Italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted p-4 rounded-lg my-4 overflow-x-auto font-mono text-sm"><code>$2</code></pre>')
    // Inline code
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Lists
    .replace(/^\s*[-*] (.*)$/gim, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.*)$/gim, '<li class="ml-4">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
    // Horizontal rule
    .replace(/^---$/gim, '<hr class="my-6 border-border" />')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="my-4">')

  return `<p class="my-4">${html}</p>`
}

export default function Reports() {
  const [execReport, setExecReport] = useState<string>('')
  const [techReport, setTechReport] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('executive')

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true)
      try {
        const [execRes, techRes] = await Promise.allSettled([
          fetch('./dashboard_data/report_executive.md'),
          fetch('./dashboard_data/report_technical.md'),
        ])

        if (execRes.status === 'fulfilled' && execRes.value.ok) {
          setExecReport(await execRes.value.text())
        }
        if (techRes.status === 'fulfilled' && techRes.value.ok) {
          setTechReport(await techRes.value.text())
        }
      } catch (error) {
        console.error('Failed to load reports:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Olay Raporları
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleDownload(
                  activeTab === 'executive' ? execReport : techReport,
                  activeTab === 'executive'
                    ? 'executive_report.md'
                    : 'technical_report.md'
                )
              }
            >
              <Download className="h-4 w-4 mr-2" />
              İndir
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="executive">Yönetici Özeti</TabsTrigger>
              <TabsTrigger value="technical">Teknik Rapor</TabsTrigger>
            </TabsList>

            <TabsContent value="executive" className="mt-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : execReport ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(execReport) }}
                />
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Yönetici raporu bulunamadı
                </div>
              )}
            </TabsContent>

            <TabsContent value="technical" className="mt-6">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : techReport ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(techReport) }}
                />
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Teknik rapor bulunamadı
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
