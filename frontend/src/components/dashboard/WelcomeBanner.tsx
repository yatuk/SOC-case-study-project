import { useState, useEffect } from 'react'
import { Card, Text, Metric, ProgressBar, Flex, Title } from '@tremor/react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Server, Activity } from 'lucide-react'
import { useDataStore } from '@/store'

export function WelcomeBanner() {
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const { alerts, devices } = useDataStore()

  useEffect(() => {
    // 10 seconds = 10000ms
    // Update every 100ms -> 1% increment
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => setVisible(false), 500) // Small delay before hiding
          return 100
        }
        return prev + 1
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-6 right-6 z-50 w-[400px]"
        >
          <Card decoration="top" decorationColor="emerald" className="shadow-2xl shadow-emerald-500/20 glass-panel border-emerald-500/30">
            <Flex alignItems="start" className="mb-4">
              <div>
                <Title className="text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Hoşgeldin Analist
                </Title>
                <Text className="mt-1">SOC Dashboard Hazırlanıyor...</Text>
              </div>
              <div className="text-right">
                <Metric className="text-white">{progress}%</Metric>
              </div>
            </Flex>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white/5 p-2 rounded-lg">
                <Text className="flex items-center gap-2 text-xs">
                  <Activity className="h-3 w-3 text-red-400" />
                  Aktif Uyarılar
                </Text>
                <Metric className="text-lg text-red-400">{alerts.length}</Metric>
              </div>
              <div className="bg-white/5 p-2 rounded-lg">
                <Text className="flex items-center gap-2 text-xs">
                  <Server className="h-3 w-3 text-blue-400" />
                  İzlenen Cihazlar
                </Text>
                <Metric className="text-lg text-blue-400">{devices.length}</Metric>
              </div>
            </div>

            <ProgressBar value={progress} color="emerald" className="mt-2" />
            
            <Text className="text-xs text-center mt-2 opacity-50">
              Sistem kontrolleri tamamlanıyor...
            </Text>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
