import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSettingsStore, useUIStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  ShieldAlert,
  FileText,
  Monitor,
  Play,
  Clock,
  Target,
  Search,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  TrendingUp,
  Users,
  CheckCircle,
  Globe,
  FileCode,
  Network,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Genel Bakış' },
  { to: '/executive', icon: TrendingUp, label: 'Executive Overview' },
  { to: '/threat-intel', icon: Shield, label: 'Threat Intelligence' },
  { to: '/user-analytics', icon: Users, label: 'User Analytics' },
  { to: '/compliance', icon: CheckCircle, label: 'Compliance' },
  { divider: true },
  { to: '/investigation', icon: Network, label: 'Ağ Analizi' },
  { to: '/map', icon: Globe, label: 'Canlı Saldırı Haritası' },
  { to: '/sigma', icon: FileCode, label: 'Sigma Kuralları' },
  { divider: true },
  { to: '/alerts', icon: ShieldAlert, label: 'Uyarılar' },
  { to: '/events', icon: FileText, label: 'Olaylar (SIEM)' },
  { to: '/devices', icon: Monitor, label: 'Cihazlar (EDR)' },
  { to: '/automations', icon: Play, label: 'Otomasyonlar (SOAR)' },
  { to: '/timeline', icon: Clock, label: 'Zaman Çizelgesi' },
  { to: '/mitre', icon: Target, label: 'MITRE ATT&CK' },
  { to: '/intel', icon: Search, label: 'Tehdit İstihbaratı' },
  { to: '/reports', icon: FileBarChart, label: 'Raporlar' },
]

export function Sidebar() {
  const { settings, updateSetting } = useSettingsStore()
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore()
  const expanded = settings.sidebarExpanded && !sidebarCollapsed

  const toggleSidebar = () => {
    if (settings.sidebarExpanded) {
      setSidebarCollapsed(!sidebarCollapsed)
    } else {
      updateSetting('sidebarExpanded', true)
    }
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300',
        expanded ? 'w-64' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          {expanded && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold whitespace-nowrap text-glow-green text-primary">SOC Dashboard</h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Bilgi Teknolojileri A.Ş.</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={toggleSidebar}
        >
          {expanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
            {navItems.map((item, idx) =>
            'divider' in item && item.divider ? (
              <li key={`divider-${idx}`} className="my-2">
                <div className="border-t border-border" />
              </li>
            ) : (
              <li key={item.to}>
                {expanded ? (
                  <NavLink
                    to={item.to!}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )
                    }
                  >
                    {item.icon && <item.icon className="h-5 w-5 shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ) : (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.to!}
                        className={({ isActive }) =>
                          cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg transition-colors mx-auto',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          )
                        }
                      >
                        {item.icon && <item.icon className="h-5 w-5" />}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )}
              </li>
            )
          )}
        </ul>
      </nav>

      {/* Settings at bottom */}
      <div className="border-t p-2">
        {expanded ? (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Ayarlar</span>
          </NavLink>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-colors mx-auto',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <Settings className="h-5 w-5" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">Ayarlar</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  )
}
