import { Card, Title, Text, AreaChart, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, ProgressBar } from '@tremor/react'
import { generateUserRiskScores, generateTimeSeriesData } from '@/lib/mockData'
import { Users, TrendingUp, AlertCircle } from 'lucide-react'

export default function UserAnalytics() {
  const userRiskScores = generateUserRiskScores()
  const timeSeriesData = generateTimeSeriesData(24)

  // High risk users
  const highRiskUsers = userRiskScores.filter((u) => u.riskLevel === 'critical' || u.riskLevel === 'high')

  // Risk trend data
  const riskTrendData = timeSeriesData.map((d, idx) => ({
    Saat: `${d.hour}:00`,
    'Ortalama Risk': 30 + Math.sin(idx / 3) * 20 + Math.random() * 10,
    'Kritik Kullanıcılar': Math.floor(Math.random() * 5) + 1,
  }))

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'red'
      case 'high':
        return 'orange'
      case 'medium':
        return 'yellow'
      case 'low':
        return 'green'
      default:
        return 'gray'
    }
  }

  const getRiskPercentage = (score: number) => {
    return score
  }

  return (
    <div className="space-y-6">
      <div>
        <Title>User Behavior Analytics</Title>
        <Text>Kullanıcı davranış analizi ve risk skorlaması</Text>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card decoration="top" decorationColor="blue">
          <div className="flex items-start justify-between">
            <div>
              <Text>Toplam Kullanıcı</Text>
              <Title className="text-3xl">{userRiskScores.length}</Title>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card decoration="top" decorationColor="orange">
          <div className="flex items-start justify-between">
            <div>
              <Text>Yüksek Risk</Text>
              <Title className="text-3xl">{highRiskUsers.length}</Title>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card decoration="top" decorationColor="red">
          <div className="flex items-start justify-between">
            <div>
              <Text>Ortalama Risk Skoru</Text>
              <Title className="text-3xl">
                {Math.round(userRiskScores.reduce((sum, u) => sum + u.riskScore, 0) / userRiskScores.length)}
              </Title>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Risk Trend */}
      <Card>
        <Title>24 Saatlik Risk Trendi</Title>
        <AreaChart
          className="mt-4 h-72"
          data={riskTrendData}
          index="Saat"
          categories={['Ortalama Risk', 'Kritik Kullanıcılar']}
          colors={['amber', 'rose']}
          valueFormatter={(value) => value.toFixed(1)}
        />
      </Card>

      {/* User Risk Table */}
      <Card>
        <Title>Kullanıcı Risk Skorları</Title>
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Kullanıcı</TableHeaderCell>
              <TableHeaderCell>Risk Skoru</TableHeaderCell>
              <TableHeaderCell>Risk Seviyesi</TableHeaderCell>
              <TableHeaderCell>Risk Faktörleri</TableHeaderCell>
              <TableHeaderCell>Son Aktivite</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userRiskScores
              .sort((a, b) => b.riskScore - a.riskScore)
              .map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <Text className="font-medium">{user.email}</Text>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Text className="font-semibold">{user.riskScore}</Text>
                        <Text className="text-sm text-gray-500">/100</Text>
                      </div>
                      <ProgressBar value={getRiskPercentage(user.riskScore)} color={getRiskColor(user.riskLevel)} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge color={getRiskColor(user.riskLevel)} size="lg">
                      {user.riskLevel.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {user.factors.map((factor, idx) => (
                        <Badge key={idx} color="slate" size="xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Text className="text-sm">
                      {new Date(user.lastActivity).toLocaleString('tr-TR')}
                    </Text>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* High Risk Users Detail */}
      {highRiskUsers.length > 0 && (
        <Card>
          <Title>Yüksek Riskli Kullanıcılar - Detay</Title>
          <div className="mt-4 space-y-4">
            {highRiskUsers.map((user) => (
              <div key={user.userId} className="border-l-4 border-red-500 pl-4 py-3 bg-red-50 dark:bg-red-950/20 rounded-r">
                <div className="flex items-center justify-between mb-2">
                  <Text className="font-semibold">{user.email}</Text>
                  <Badge color="red" size="lg">
                    Risk: {user.riskScore}
                  </Badge>
                </div>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Risk Faktörleri:
                </Text>
                <ul className="list-disc list-inside space-y-1">
                  {user.factors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                      {factor}
                    </li>
                  ))}
                </ul>
                <Text className="text-xs text-gray-500 mt-2">
                  Son aktivite: {new Date(user.lastActivity).toLocaleString('tr-TR')}
                </Text>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
