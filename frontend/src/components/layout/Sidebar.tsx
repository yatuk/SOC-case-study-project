import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useUIStore } from '@/store'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, AlertTriangle, FileSearch, Shield,
  Play, Monitor, Target, Crosshair, Settings, Users,
  Bug, ChevronLeft, ChevronRight, X,
} from 'lucide-react'

export function Sidebar() {
  const { t } = useTranslation()
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggle = useUIStore((s) => s.toggleSidebar)

  const links = useMemo(() => [
    { to: '/',           icon: LayoutDashboard, label: t('sidebar.overview') },
    { to: '/alerts',     icon: AlertTriangle,   label: t('sidebar.alerts') },
    { to: '/incidents',  icon: FileSearch,       label: t('sidebar.incidents') },
    { to: '/iocs',       icon: Shield,           label: t('sidebar.iocs') },
    { to: '/playbooks',  icon: Play,             label: t('sidebar.playbooks') },
    { to: '/endpoints',  icon: Monitor,          label: t('sidebar.endpoints') },
    { to: '/mitre',      icon: Target,           label: t('sidebar.mitre') },
    { to: '/threat-actors', icon: Users,         label: t('sidebar.threatActors') },
    { to: '/users',     icon: Users,         label: t('sidebar.users') },
    { to: '/logs',      icon: FileSearch,     label: t('sidebar.logExplorer') },
    { to: '/cases',     icon: FileSearch,     label: t('sidebar.cases') },
    { to: '/correlations', icon: Target,      label: t('sidebar.correlations') },
    { to: '/vulnerabilities', icon: Bug,      label: t('sidebar.vulnerabilities') },
    { to: '/detections', icon: Crosshair,        label: t('sidebar.detections') },
    { to: '/settings',   icon: Settings,         label: t('sidebar.settings') },
  ], [t])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !collapsed) toggle()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [collapsed, toggle])

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={toggle}
          onKeyDown={(e) => e.key === 'Escape' && toggle()}
          role="button"
          tabIndex={0}
          aria-label={t('app.menuClose')}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-background border-r border-border/50 flex flex-col transition-[transform,width] duration-200',
          'lg:translate-x-0',
          collapsed ? '-translate-x-full lg:w-14 lg:translate-x-0' : 'translate-x-0 w-56'
        )}
        role="navigation"
        aria-label={t('app.mainNav')}
        aria-expanded={!collapsed}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            {!collapsed && (
              <span className="font-semibold text-sm tracking-tight whitespace-nowrap">{t('app.title')}</span>
            )}
          </div>
          <button
            onClick={toggle}
            className="lg:hidden p-1 rounded hover:bg-muted transition-colors"
            aria-label={t('app.menuClose')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-1.5 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => {
                if (window.innerWidth < 1024 && !collapsed) toggle()
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center h-8 mx-2 px-2 rounded-sm text-xs transition-none',
                  collapsed && 'lg:justify-center',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary -ml-[6px] pl-[6px]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent -ml-[6px] pl-[6px]'
                )
              }
              aria-label={label}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="ml-2 truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={toggle}
          className="hidden lg:flex items-center justify-center h-9 border-t border-border/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label={collapsed ? t('app.menuExpand') : t('app.menuCollapse')}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  )
}
