import { useState } from 'react'
import { Card, Title, Text, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, DonutChart, BarList, Button, TextInput } from '@tremor/react'
import { useDataStore } from '@/store'
import { Download, Search } from 'lucide-react'

export default function ThreatIntelligence() {
  const { iocs } = useDataStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Filter IOCs with null safety
  const filteredIOCs = iocs.filter((ioc) => {
    if (!ioc) return false
    const matchesSearch = 
      ioc?.value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ioc?.tags && ioc.tags.some((tag) => tag?.toLowerCase().includes(searchQuery.toLowerCase())))
    const matchesType = selectedType === 'all' || ioc?.type === selectedType
    return matchesSearch && matchesType
  })

  // IOC type distribution
  const typeDistribution = [
    { name: 'Domain', value: iocs.filter((i) => i?.type === 'domain').length },
    { name: 'IP Address', value: iocs.filter((i) => i?.type === 'ip').length },
    { name: 'Hash', value: iocs.filter((i) => i?.type === 'hash').length },
    { name: 'URL', value: iocs.filter((i) => i?.type === 'url').length },
    { name: 'Email', value: iocs.filter((i) => i?.type === 'email').length },
  ].filter((d) => d.value > 0)

  // Top malicious domains
  const topDomains = iocs
    .filter((i) => i?.type === 'domain')
    .slice(0, 10)
    .map((i) => ({
      name: i.value,
      value: Math.floor(Math.random() * 50) + 10, // Simulated hit count
    }))

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Type', 'Value', 'Severity', 'Tags', 'First Seen'],
      ...filteredIOCs.map((ioc) => [
        ioc.type,
        ioc.value,
        ioc.severity || 'unknown',
        (ioc.tags || []).join(';'),
        ioc.first_seen || 'N/A',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iocs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title>Threat Intelligence</Title>
          <Text>IOC database ve threat intelligence merkezi</Text>
        </div>
        <Button icon={Download} onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <Title>IOC Tip Dağılımı</Title>
          <DonutChart
            className="mt-4 h-64"
            data={typeDistribution}
            category="value"
            index="name"
            colors={['cyan', 'violet', 'fuchsia', 'lime', 'amber']}
            valueFormatter={(value) => value.toLocaleString()}
          />
        </Card>

        <Card>
          <Title>En Çok Tespit Edilen Domainler</Title>
          <BarList data={topDomains} className="mt-4" />
        </Card>
      </div>

      {/* IOC Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Title>IOC Listesi ({filteredIOCs.length})</Title>
          <div className="flex gap-2">
            <TextInput
              icon={Search}
              placeholder="IOC ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Tüm Tipler</option>
              <option value="domain">Domain</option>
              <option value="ip">IP Address</option>
              <option value="hash">Hash</option>
              <option value="url">URL</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Tip</TableHeaderCell>
              <TableHeaderCell>Değer</TableHeaderCell>
              <TableHeaderCell>Severity</TableHeaderCell>
              <TableHeaderCell>Tags</TableHeaderCell>
              <TableHeaderCell>İlk Görülme</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIOCs.slice(0, 50).map((ioc, idx) => (
              <TableRow key={`${ioc.type}-${ioc.value}-${idx}`}>
                <TableCell>
                  <Badge color="slate">{ioc.type}</Badge>
                </TableCell>
                <TableCell>
                  <code className="text-sm">{ioc.value}</code>
                </TableCell>
                <TableCell>
                  <Badge color={getSeverityColor(ioc.severity)}>
                    {ioc.severity || 'unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(ioc.tags || []).slice(0, 3).map((tag) => (
                      <Badge key={tag} size="xs" color="blue">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Text className="text-sm">
                    {ioc.first_seen
                      ? new Date(ioc.first_seen).toLocaleDateString('tr-TR')
                      : 'N/A'}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredIOCs.length > 50 && (
          <div className="mt-4 text-center">
            <Text className="text-sm text-gray-500">
              İlk 50 sonuç gösteriliyor. Toplam {filteredIOCs.length} IOC bulundu.
            </Text>
          </div>
        )}
      </Card>
    </div>
  )
}
