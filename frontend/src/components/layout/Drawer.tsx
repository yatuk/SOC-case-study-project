import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store'

interface DrawerProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

const widthClasses = {
  sm: 'w-[400px]',
  md: 'w-[500px]',
  lg: 'w-[600px]',
  xl: 'w-[800px]',
}

export function Drawer({ children, title, subtitle, width = 'lg' }: DrawerProps) {
  const { drawerOpen, closeDrawer } = useUIStore()

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        closeDrawer()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen, closeDrawer])

  // Prevent body scroll when open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed right-0 top-0 z-50 h-screen bg-card border-l shadow-2xl flex flex-col',
              widthClasses[width]
            )}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between p-4 border-b">
                <div>
                  {title && (
                    <h2 className="text-lg font-semibold">{title}</h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDrawer}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Alert Drawer Content component
export function AlertDrawerContent() {
  const { drawerData, drawerType } = useUIStore()

  if (drawerType !== 'alert' || !drawerData) {
    return null
  }

  const alert = drawerData as Record<string, unknown>

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium">Detaylar</h3>
        <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
          {JSON.stringify(alert, null, 2)}
        </pre>
      </div>
    </div>
  )
}

// Device Drawer Content component  
export function DeviceDrawerContent() {
  const { drawerData, drawerType } = useUIStore()

  if (drawerType !== 'device' || !drawerData) {
    return null
  }

  const device = drawerData as Record<string, unknown>

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium">Cihaz Bilgileri</h3>
        <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto">
          {JSON.stringify(device, null, 2)}
        </pre>
      </div>
    </div>
  )
}
