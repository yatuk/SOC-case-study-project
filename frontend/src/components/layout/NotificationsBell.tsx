import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, StickyNote, AlertTriangle, FileText, Play, Ruler } from 'lucide-react'
import { loadEntity } from '@/lib/data'
import { cn } from '@/lib/utils'

interface Notification { id: string; type: string; title: string; detail?: string; link?: string; timestamp: string; unread: boolean; severity?: string }

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  mehmet_note: { icon: StickyNote, label: 'Mehmet' },
  alert: { icon: AlertTriangle, label: 'Uyarı' },
  incident_change: { icon: FileText, label: 'Durum' },
  playbook_run: { icon: Play, label: 'Playbook' },
}

const SEVERITY_BORDER: Record<string, string> = { critical: 'border-l-severity-critical', high: 'border-l-severity-high', medium: 'border-l-severity-medium', low: 'border-l-severity-low', info: 'border-l-severity-info' }

const FAKE_INDEX_KEY = 'soc-fake-notif-index'

export function NotificationsBell() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [shake, setShake] = useState(false)
  const [fakeIdx, setFakeIdx] = useState(() => parseInt(localStorage.getItem(FAKE_INDEX_KEY) ?? '0'))

  useEffect(() => { loadEntity<Notification[]>('notifications.json').then(setNotifs) }, [])

  // Fake real-time: add a new unread notif after 45-90 seconds
  useEffect(() => {
    const unseen = notifs.filter(n => !n.unread && n.id > `n${fakeIdx}`)
    if (unseen.length === 0) return
    const delay = 45000 + Math.random() * 45000
    const timer = setTimeout(() => {
      const next = unseen[0]
      setNotifs(prev => prev.map(n => n.id === next.id ? { ...n, unread: true } : n))
      setFakeIdx(prev => { const v = prev + 1; localStorage.setItem(FAKE_INDEX_KEY, String(v)); return v })
      setShake(true); setTimeout(() => setShake(false), 600)
    }, delay)
    return () => clearTimeout(timer)
  }, [notifs, fakeIdx])

  const unreadCount = useMemo(() => notifs.filter(n => n.unread).length, [notifs])

  const markAllRead = () => { setNotifs(prev => prev.map(n => ({ ...n, unread: false }))); setOpen(false) }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn('relative p-1.5 rounded-md hover:bg-accent transition-colors', shake && 'animate-shake')}
        aria-label={`Bildirimler (${unreadCount} okunmamış)`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-severity-critical text-2xs font-bold flex items-center justify-center text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="text-xs font-semibold">Bildirimler</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <CheckCheck className="w-3 h-3" /> Tümü okundu
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">Şu an sessizlik. Bu ya iyi haber ya bir şey eksik.</p>
            ) : (
              notifs.slice(0, 15).map(n => (
                <Link
                  key={n.id}
                  to={n.link ?? '#'}
                  onClick={() => { setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x)); setOpen(false) }}
                  className={cn('block p-3 border-b border-border last:border-0 hover:bg-accent transition-colors border-l-2', n.unread ? `${SEVERITY_BORDER[n.severity ?? 'info']} bg-muted/20` : 'border-l-transparent')}
                >
                  <div className="text-xs font-medium leading-tight">{n.title}</div>
                  {n.detail && <div className="text-2xs text-muted-foreground mt-0.5">{n.detail}</div>}
                  <div className="text-2xs text-muted-foreground/60 mt-1 inline-flex items-center gap-1">
                    {(() => { const cfg = TYPE_CONFIG[n.type]; if (cfg) return <><cfg.icon className="w-3 h-3" /><span>{cfg.label}</span></>; return <><Ruler className="w-3 h-3" /><span>Kural</span></> })()} · {new Date(n.timestamp).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
