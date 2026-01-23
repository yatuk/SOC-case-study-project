import { Card, Title, Text, ProgressCircle, CategoryBar, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react'
import { generateComplianceScores } from '@/lib/mockData'
import { useComputedData } from '@/hooks/useData'
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

export default function ComplianceDashboard() {
  const complianceScores = generateComplianceScores()
  const { totalAlerts, criticalAlerts } = useComputedData()

  // Overall compliance score (average of all frameworks)
  const overallScore = Math.round(
    complianceScores.reduce((sum, c) => sum + c.score, 0) / complianceScores.length
  )

  // SLA metrics (simulated)
  const slaMetrics = [
    {
      metric: 'MTTD (Mean Time To Detect)',
      value: '4.2 dakika',
      target: '< 5 dakika',
      status: 'on-track',
      percentage: 84,
    },
    {
      metric: 'MTTR (Mean Time To Respond)',
      value: '23 dakika',
      target: '< 30 dakika',
      status: 'on-track',
      percentage: 77,
    },
    {
      metric: 'MTTC (Mean Time To Contain)',
      value: '1.2 saat',
      target: '< 2 saat',
      status: 'on-track',
      percentage: 60,
    },
    {
      metric: 'Alert False Positive Rate',
      value: '12%',
      target: '< 15%',
      status: 'on-track',
      percentage: 88,
    },
  ]

  // Compliance requirements breakdown
  const requirementsStatus = [
    { status: 'Met', count: 306, color: 'green' },
    { status: 'Partial', count: 51, color: 'yellow' },
    { status: 'Not Met', count: 28, color: 'red' },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'non-compliant':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'green'
      case 'partial':
        return 'yellow'
      case 'non-compliant':
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Title>Compliance Dashboard</Title>
        <Text>Uyumluluk takibi ve SLA metrikleri</Text>
      </div>

      {/* Overall Compliance Score */}
      <Card decoration="top" decorationColor="blue">
        <div className="flex items-center justify-between">
          <div>
            <Title>Genel Uyumluluk Skoru</Title>
            <Text className="mt-2">
              {complianceScores.length} framework üzerinden ortalama skor
            </Text>
          </div>
          <ProgressCircle value={overallScore} size="xl" color="blue">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {overallScore}%
            </span>
          </ProgressCircle>
        </div>
      </Card>

      {/* Compliance by Framework */}
      <Card>
        <Title>Framework Uyumluluğu</Title>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Framework</TableHeaderCell>
              <TableHeaderCell>Skor</TableHeaderCell>
              <TableHeaderCell>Durum</TableHeaderCell>
              <TableHeaderCell>Gereksinimler</TableHeaderCell>
              <TableHeaderCell>Son Denetim</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {complianceScores.map((framework) => (
              <TableRow key={framework.framework}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(framework.status)}
                    <Text className="font-medium">{framework.framework}</Text>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <CategoryBar
                      values={[framework.score]}
                      colors={[framework.score >= 90 ? 'green' : framework.score >= 70 ? 'yellow' : 'red']}
                      className="w-32"
                    />
                    <Text className="font-semibold">{framework.score}%</Text>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge color={getStatusColor(framework.status)} size="lg">
                    {framework.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Text>
                    {framework.requirements.met}/{framework.requirements.total}
                    <span className="text-gray-500 ml-1">
                      ({Math.round((framework.requirements.met / framework.requirements.total) * 100)}%)
                    </span>
                  </Text>
                </TableCell>
                <TableCell>
                  <Text className="text-sm">
                    {new Date(framework.lastAudit).toLocaleDateString('tr-TR')}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Requirements Status */}
      <Card>
        <Title>Gereksinim Durumu</Title>
        <Text className="mt-1">
          Toplam {requirementsStatus.reduce((sum, r) => sum + r.count, 0)} gereksinim
        </Text>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {requirementsStatus.map((req) => (
            <div key={req.status} className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <Text className="text-sm text-gray-600 dark:text-gray-400">{req.status}</Text>
              <Title className={`text-3xl mt-1 text-${req.color}-600 dark:text-${req.color}-400`}>
                {req.count}
              </Title>
              <CategoryBar
                values={[req.count]}
                colors={[req.color as any]}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* SLA Metrics */}
      <Card>
        <Title>SLA Metrikleri</Title>
        <Text className="mt-1">Güvenlik operasyon hedefleri</Text>
        <div className="mt-4 space-y-4">
          {slaMetrics.map((sla) => (
            <div key={sla.metric}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Text className="font-medium">{sla.metric}</Text>
                  <Text className="text-sm text-gray-500">
                    Mevcut: <span className="font-semibold">{sla.value}</span> • Hedef: {sla.target}
                  </Text>
                </div>
                <Badge color={sla.status === 'on-track' ? 'green' : 'red'}>
                  {sla.status === 'on-track' ? 'Hedefte' : 'Risk'}
                </Badge>
              </div>
              <CategoryBar
                values={[sla.percentage]}
                colors={[sla.percentage >= 70 ? 'green' : sla.percentage >= 50 ? 'yellow' : 'red']}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Security Posture Summary */}
      <Card>
        <Title>Güvenlik Duruşu Özeti</Title>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center p-4 border rounded-lg">
            <Text className="text-sm text-gray-500">Toplam Uyarı</Text>
            <Title className="text-3xl mt-1">{totalAlerts}</Title>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <Text className="text-sm text-gray-500">Kritik Uyarı</Text>
            <Title className="text-3xl mt-1 text-red-600">{criticalAlerts}</Title>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <Text className="text-sm text-gray-500">False Positive</Text>
            <Title className="text-3xl mt-1">12%</Title>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <Text className="text-sm text-gray-500">Automation Rate</Text>
            <Title className="text-3xl mt-1 text-green-600">87%</Title>
          </div>
        </div>
      </Card>
    </div>
  )
}
