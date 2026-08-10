import { useMemo } from 'react'
import { useUIStore, useSettingsStore } from '@/store'
import { useTranslation } from '@/i18n'
import { Menu, Moon, Sun, Search } from 'lucide-react'
import { NotificationsBell } from '@/components/layout/NotificationsBell'

export function Topbar() {
  const { t } = useTranslation()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const toggleCmdPalette = useUIStore((s) => s.toggleCmdPalette)
  const { settings, updateSetting } = useSettingsStore()
  const path = window.location.hash.replace('#', '') || '/'

  const pageTitles: Record<string, string> = useMemo(() => ({
    '/': t('topbar.overview'),
    '/alerts': t('topbar.alerts'),
    '/incidents': t('topbar.incidents'),
    '/iocs': t('topbar.iocs'),
    '/playbooks': t('topbar.playbooks'),
    '/endpoints': t('topbar.endpoints'),
    '/mitre': t('topbar.mitre'),
    '/detections': t('topbar.detections'),
    '/settings': t('topbar.settings'),
    '/threat-actors': t('topbar.threatActors'),
    '/users': t('topbar.users'),
    '/logs': t('topbar.logExplorer'),
    '/cases': t('topbar.cases'),
  }), [t])

  const title = pageTitles[path] || t('app.title')

  return (
    <header className="sticky top-0 z-30 flex items-center h-12 px-4 bg-background/95 border-b border-border/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-1 rounded hover:bg-muted transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold tracking-tight truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleCmdPalette}
          className="flex items-center gap-2 h-7 px-2.5 rounded text-muted-foreground text-xs hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open command palette (Ctrl+K)"
        >
          <Search className="w-3 h-3" />
          <span className="hidden sm:inline">{t('common.search')}</span>
          <kbd className="hidden md:inline text-[10px] px-1 rounded bg-muted border border-border/50 ml-2">
            Ctrl+K
          </kbd>
        </button>

        <NotificationsBell />

        <button
          onClick={() =>
            updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')
          }
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label={settings.theme === 'dark' ? t('settings.themeLight') : t('settings.themeDark')}
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <div
          className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary"
          aria-label="User: Emre Korkmaz"
          role="img"
        >
          EK
        </div>
      </div>
    </header>
  )
}
