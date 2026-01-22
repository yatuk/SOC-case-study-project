import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Severity } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(ts: string | undefined | null): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleString('tr-TR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}

export function formatDate(ts: string | undefined | null): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ts
  }
}

export function numToSeverity(num: number): Severity {
  if (num >= 8) return 'critical'
  if (num >= 6) return 'high'
  if (num >= 4) return 'medium'
  if (num >= 2) return 'low'
  return 'info'
}

export function severityToNum(sev: Severity): number {
  const map: Record<Severity, number> = {
    critical: 9,
    high: 7,
    medium: 5,
    low: 3,
    info: 1,
  }
  return map[sev] || 1
}

export function getSeverityLabel(severity: Severity | number | undefined): string {
  const sev = typeof severity === 'number' ? numToSeverity(severity) : severity
  const labels: Record<string, string> = {
    critical: 'Kritik',
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük',
    info: 'Bilgi',
  }
  return labels[sev || 'info'] || 'N/A'
}

export function getSeverityColor(severity: Severity | number | undefined): string {
  const sev = typeof severity === 'number' ? numToSeverity(severity) : severity
  const colors: Record<string, string> = {
    critical: '#f85149',
    high: '#f0883e',
    medium: '#d29922',
    low: '#3fb950',
    info: '#8b949e',
  }
  return colors[sev || 'info'] || colors.info
}

export function getStatusLabel(status: string | undefined): string {
  const labels: Record<string, string> = {
    new: 'Yeni',
    in_progress: 'İnceleniyor',
    investigating: 'İnceleniyor',
    contained: 'Kontrol Altında',
    closed: 'Kapatıldı',
    pending: 'Bekliyor',
    running: 'Çalışıyor',
    waiting_approval: 'Onay Bekliyor',
    completed: 'Tamamlandı',
    failed: 'Başarısız',
  }
  return labels[status || ''] || status || 'N/A'
}

export function truncate(str: string, length: number): string {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function parseJSONL(text: string): unknown[] {
  return text
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key])
    if (!result[groupKey]) {
      result[groupKey] = []
    }
    result[groupKey].push(item)
    return result
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function downloadFile(content: string, filename: string, type: string = 'application/json'): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
