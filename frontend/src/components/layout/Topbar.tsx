import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SimulationToggle } from '@/components/dashboard/SimulationToggle'
import { useDataStore, useUIStore } from '@/store'
import { useTheme } from '@/hooks/useTheme'
import {
  Search,
  RefreshCw,
  Download,
  Sun,
  Moon,
  Bell,
  CheckCircle,
  AlertCircle,
  Command,
} from 'lucide-react'

interface TopbarProps {
  title?: string
}

export function Topbar({ title = 'SOC Dashboard' }: TopbarProps) {
  const navigate = useNavigate()
  const { isLoading, error, lastLoaded, alerts } = useDataStore()
  const { searchQuery, setSearchQuery } = useUIStore()
  const { isDark, toggleTheme } = useTheme()
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const criticalCount = alerts.filter(
    (a) =>
      a.severity === 'critical' ||
      (typeof a.severity === 'number' && a.severity >= 8)
  ).length

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/alerts?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      alerts: alerts.slice(0, 100),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soc-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      {/* Left - Title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      {/* Center - Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Ara... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="pl-9 pr-12"
          />
          {!isSearchFocused && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
              <Command className="h-3 w-3" />
              <span className="text-xs">K</span>
            </div>
          )}
        </div>
      </form>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Simulation Toggle */}
        <SimulationToggle />

        {/* Status Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50">
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs">Yükleniyor...</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive">Hata</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    {lastLoaded
                      ? new Date(lastLoaded).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {error || `Son güncelleme: ${lastLoaded?.toLocaleString('tr-TR') || '—'}`}
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {criticalCount > 0 && (
                <Badge
                  variant="critical"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] pulse-green"
                >
                  {criticalCount > 9 ? '9+' : criticalCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Bildirimler</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {criticalCount} kritik, toplam {alerts.length} uyarı
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts
              .filter(a => a.severity === 'critical' || a.severity === 'high')
              .slice(0, 5)
              .map((alert) => (
                <DropdownMenuItem 
                  key={alert.alert_id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  onClick={() => navigate(`/cases/${alert.alert_id}`)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={`h-2 w-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'}`} />
                    <span className="font-medium truncate flex-1">{alert.title || alert.alert_name || 'Uyarı'}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(alert.timestamp || alert.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {alert.src_ip || alert.device || 'Bilinmeyen Cihaz'} {alert.user ? `• ${alert.user}` : ''}
                  </p>
                </DropdownMenuItem>
              ))}
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Kritik veya yüksek öncelikli uyarı yok.
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="w-full justify-center text-primary cursor-pointer font-medium"
              onClick={() => navigate('/alerts')}
            >
              Tüm Uyarıları Gör
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Refresh */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Verileri Yenile</TooltipContent>
        </Tooltip>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleExport}>
              <Download className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Dışa Aktar</TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDark ? 'Açık Tema' : 'Koyu Tema'}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
