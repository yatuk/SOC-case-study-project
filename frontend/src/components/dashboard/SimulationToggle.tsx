import { useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { useDataStore } from '@/store'
import { realTimeSimulator } from '@/services/realTimeSimulator'
import { toast } from 'sonner'
import { Radio } from 'lucide-react'
import type { Event } from '@/types'

export function SimulationToggle() {
  const { simulationEnabled, toggleSimulation, addSimulatedEvent } = useDataStore()

  useEffect(() => {
    const unsubscribe = realTimeSimulator.subscribe((event: Event) => {
      addSimulatedEvent(event)
      // No toast - too noisy at 1 event/sec
    })

    return () => { unsubscribe() }
  }, [addSimulatedEvent])

  useEffect(() => {
    if (simulationEnabled) {
      realTimeSimulator.start()
      toast.success('📡 Live Simulation başlatıldı', {
        description: '1 event/saniye - Bildirimler kapalı',
      })
    } else {
      realTimeSimulator.stop()
      if (realTimeSimulator.getStatus() === false) {
        toast.info('Live Simulation durduruldu')
      }
    }
  }, [simulationEnabled])

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
      <Radio className={`h-4 w-4 ${simulationEnabled ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
      <span className="text-sm font-medium">Live Simulation</span>
      <Switch
        checked={simulationEnabled}
        onCheckedChange={toggleSimulation}
      />
    </div>
  )
}
