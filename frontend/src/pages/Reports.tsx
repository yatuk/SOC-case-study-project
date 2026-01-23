import { useState } from 'react'
import { 
  Card, 
  Title, 
  Text, 
  Grid, 
  Metric, 
  Flex, 
  BadgeDelta,
  DonutChart,
  BarChart,
  List,
  ListItem,
  Icon,
} from '@tremor/react'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@tremor/react'
import { Download, Printer, ShieldAlert, CheckCircle, Activity, Server } from 'lucide-react'
import { useDataStore } from '@/store'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function Reports() {
  const { alerts, devices } = useDataStore()
  const [dateRange, setDateRange] = useState<any>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  })

  // Mock data derivation for Reports
  const severityCounts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  }

  const chartData = [
    { name: 'Kritik', value: severityCounts.critical },
    { name: 'Yüksek', value: severityCounts.high },
    { name: 'Orta', value: severityCounts.medium },
    { name: 'Düşük', value: severityCounts.low },
  ]

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-2xl font-bold">Raporlama Merkezi</Title>
          <Text>Güvenlik olayları ve sistem durum raporları</Text>
        </div>
        <div className="flex items-center gap-2">
           <DateRangePicker 
              className="max-w-sm" 
              value={dateRange}
              onValueChange={setDateRange}
              enableSelect={false}
              locale={tr}
           />
           <Button variant="outline" onClick={handlePrint}>
             <Printer className="h-4 w-4 mr-2" />
             Yazdır / PDF
           </Button>
           <Button>
             <Download className="h-4 w-4 mr-2" />
             Dışa Aktar (CSV)
           </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="rose">
          <Flex justifyContent="start" className="space-x-4">
            <Icon icon={ShieldAlert} variant="light" size="xl" color="rose" />
            <div className="truncate">
              <Text>Kritik Tehditler</Text>
              <Metric>{severityCounts.critical}</Metric>
            </div>
          </Flex>
          <BadgeDelta deltaType="increase" className="mt-2">
             Geçen haftaya göre +23%
          </BadgeDelta>
        </Card>
        <Card decoration="top" decorationColor="orange">
            <Flex justifyContent="start" className="space-x-4">
            <Icon icon={Activity} variant="light" size="xl" color="orange" />
            <div className="truncate">
              <Text>Toplam Olay</Text>
              <Metric>{alerts.length}</Metric>
            </div>
          </Flex>
        </Card>
        <Card decoration="top" decorationColor="blue">
            <Flex justifyContent="start" className="space-x-4">
            <Icon icon={Server} variant="light" size="xl" color="blue" />
            <div className="truncate">
              <Text>İzlenen Varlık</Text>
              <Metric>{devices.length}</Metric>
            </div>
          </Flex>
        </Card>
        <Card decoration="top" decorationColor="emerald">
            <Flex justifyContent="start" className="space-x-4">
            <Icon icon={CheckCircle} variant="light" size="xl" color="emerald" />
            <div className="truncate">
              <Text>Çözülen Vakalar</Text>
              <Metric>142</Metric>
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* Charts Section */}
      <Grid numItems={1} numItemsLg={2} className="gap-6">
        <Card>
          <Title>Olay Şiddet Dağılımı</Title>
          <DonutChart
            className="mt-6"
            data={chartData}
            category="value"
            index="name"
            colors={["rose", "orange", "yellow", "emerald"]}
            variant="pie"
          />
        </Card>
        <Card>
          <Title>Günlük Olay Aktivitesi</Title>
          <BarChart
            className="mt-6"
            data={[
              { date: 'Pzt', 'Olaylar': 12 },
              { date: 'Sal', 'Olaylar': 15 },
              { date: 'Çar', 'Olaylar': 8 },
              { date: 'Per', 'Olaylar': 24 },
              { date: 'Cum', 'Olaylar': 18 },
              { date: 'Cmt', 'Olaylar': 5 },
              { date: 'Paz', 'Olaylar': 7 },
            ]}
            index="date"
            categories={['Olaylar']}
            colors={['blue']}
          />
        </Card>
      </Grid>

      {/* Critical Incidents List */}
      <Card>
        <Title>Son Kritik İhlaller</Title>
        <List className="mt-4">
          {alerts
            .filter(a => a.severity === 'critical')
            .slice(0, 5)
            .map((alert) => (
            <ListItem key={alert.alert_id}>
              <div className="flex items-center gap-2">
                <div className="bg-rose-500/20 p-1 rounded">
                   <ShieldAlert className="h-4 w-4 text-rose-500" />
                </div>
                <div>
                   <Text className="font-medium text-white">{alert.title}</Text>
                   <Text className="text-xs">{alert.src_ip} &rarr; {alert.device}</Text>
                </div>
              </div>
              <Text>{alert.timestamp ? format(new Date(alert.timestamp), 'dd MMM HH:mm') : '-'}</Text>
            </ListItem>
          ))}
        </List>
      </Card>
    </div>
  )
}
