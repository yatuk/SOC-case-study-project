import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Drawer, AlertDrawerContent, DeviceDrawerContent } from '@/components/layout/Drawer'
import { useData } from '@/hooks/useData'
import { useTheme } from '@/hooks/useTheme'
import { useSettingsStore, useUIStore } from '@/store'
import { cn } from '@/lib/utils'

// Pages
import Overview from '@/pages/Overview'
import Alerts from '@/pages/Alerts'
import Events from '@/pages/Events'
import Devices from '@/pages/Devices'
import Automations from '@/pages/Automations'
import Timeline from '@/pages/Timeline'
import Mitre from '@/pages/Mitre'
import Intel from '@/pages/Intel'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
// New Tremor pages
import ExecutiveOverview from '@/pages/ExecutiveOverview'
import ThreatIntelligence from '@/pages/ThreatIntelligence'
import UserAnalytics from '@/pages/UserAnalytics'
import ComplianceDashboard from '@/pages/ComplianceDashboard'
// New SIEM Pages
import AttackMap from '@/pages/AttackMap'
import Investigation from '@/pages/Investigation'
import CaseDetails from '@/pages/CaseDetails'
import SigmaRules from '@/pages/SigmaRules'
import LiveTerminal from '@/components/layout/LiveTerminal'
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner'

// Page title mapping
const pageTitles: Record<string, string> = {
  '/': 'Genel Bakış',
  '/executive': 'Executive Overview',
  '/threat-intel': 'Threat Intelligence',
  '/user-analytics': 'User Analytics',
  '/compliance': 'Compliance Dashboard',
  '/alerts': 'Uyarılar',
  '/events': 'Olaylar (SIEM)',
  '/devices': 'Cihazlar (EDR)',
  '/automations': 'Otomasyonlar (SOAR)',
  '/timeline': 'Zaman Çizelgesi',
  '/mitre': 'MITRE ATT&CK',
  '/intel': 'Tehdit İstihbaratı',
  '/reports': 'Raporlar',
  '/settings': 'Ayarlar',
  '/map': 'Canlı Siber Saldırı Haritası',
  '/investigation': 'Ağ Topolojisi',
  '/case-details': 'Vaka İnceleme Masası',
  '/sigma': 'Sigma Kural Yöneticisi',
}

function App() {
  const { settings } = useSettingsStore()
  const { sidebarCollapsed, drawerType } = useUIStore()
  
  // Always call useData
  useData()
  
  // Initialize theme
  useTheme()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const expanded = settings.sidebarExpanded && !sidebarCollapsed

  return (
    <TooltipProvider delayDuration={0}>
        <div className="min-h-screen bg-background">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main
            className={cn(
              'min-h-screen transition-all duration-300',
              expanded ? 'pl-64' : 'pl-16'
            )}
          >
            <Topbar title={pageTitles[window.location.pathname] || 'SOC Dashboard'} />
            
            <div className="p-6">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/executive" element={<ExecutiveOverview />} />
                <Route path="/threat-intel" element={<ThreatIntelligence />} />
                <Route path="/user-analytics" element={<UserAnalytics />} />
                <Route path="/compliance" element={<ComplianceDashboard />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/events" element={<Events />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/mitre" element={<Mitre />} />
                <Route path="/intel" element={<Intel />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* New SIEM Routes */}
                <Route path="/map" element={<AttackMap />} />
                <Route path="/investigation" element={<Investigation />} />
                <Route path="/cases/:id" element={<CaseDetails />} />
                <Route path="/sigma" element={<SigmaRules />} />
              </Routes>
            </div>
          </main>

          {/* Drawer */}
          <Drawer
            title={
              drawerType === 'alert'
                ? 'Uyarı Detayları'
                : drawerType === 'device'
                  ? 'Cihaz Detayları'
                  : undefined
            }
          >
            {drawerType === 'alert' && <AlertDrawerContent />}
            {drawerType === 'device' && <DeviceDrawerContent />}
          </Drawer>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'bg-card border border-border text-foreground',
            }}
          />

          {/* Live Terminal */}
          <LiveTerminal />
          
          {/* Welcome Banner */}
          <WelcomeBanner />
        </div>
    </TooltipProvider>
  )
}

export default App
