import { useEffect, useCallback } from 'react'
import { useDataStore } from '@/store'
import { parseJSONL } from '@/lib/utils'

const DATA_BASE_PATH = './dashboard_data'

interface FileConfig {
  file: string
  prop: keyof ReturnType<typeof useDataStore.getState>
  jsonl?: boolean
  isArray?: boolean | string
}

const FILES: FileConfig[] = [
  { file: 'summary.json', prop: 'summary' },
  { file: 'alerts.jsonl', prop: 'alerts', jsonl: true },
  { file: 'events.jsonl', prop: 'events', jsonl: true },
  { file: 'cases.json', prop: 'cases', isArray: true },
  { file: 'edr_devices.json', prop: 'devices', isArray: true },
  { file: 'iocs.json', prop: 'iocs', isArray: true },
  { file: 'iocs.jsonl', prop: 'normalizedIocs', jsonl: true },
  { file: 'playbooks.json', prop: 'playbooks', isArray: 'playbooks' },
  { file: 'playbook_runs.jsonl', prop: 'playbookRuns', jsonl: true },
  { file: 'risk_scores.json', prop: 'riskScores' },
  { file: 'correlations.json', prop: 'correlations' },
  { file: 'mitre_coverage.json', prop: 'mitreCoverage' },
  { file: 'dataset_profile.json', prop: 'datasetProfile' },
]

async function loadFile(config: FileConfig): Promise<unknown> {
  try {
    const res = await fetch(`${DATA_BASE_PATH}/${config.file}`)
    if (!res.ok) return null
    const text = await res.text()

    if (config.jsonl) {
      return parseJSONL(text)
    }

    const json = JSON.parse(text)
    if (config.isArray === true) {
      return Array.isArray(json)
        ? json
        : json.cases || json.devices || json.iocs || []
    }
    if (typeof config.isArray === 'string') {
      return json[config.isArray] || []
    }
    return json
  } catch (error) {
    console.warn(`Failed to load ${config.file}:`, error)
    return null
  }
}

export function useData() {
  const store = useDataStore()

  const loadAllData = useCallback(async () => {
    store.setLoading(true)
    store.setError(null)

    try {
      const results = await Promise.allSettled(
        FILES.map((config) => loadFile(config))
      )

      let successCount = 0
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value !== null) {
          store.setData(FILES[index].prop as keyof Parameters<typeof store.setData>[0], result.value)
          successCount++
        }
      })

      if (successCount === 0) {
        store.setError('Veri dosyaları bulunamadı. Pipeline çalıştırın.')
      }

      store.refresh()
    } catch (error) {
      store.setError('Veri yüklenirken hata oluştu.')
      console.error(error)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  return {
    ...store,
    reload: loadAllData,
  }
}

// Computed values hook
export function useComputedData() {
  const { summary, alerts, events, cases, devices } = useDataStore()

  const totalEvents = events.length || summary?.total_events || 0
  const totalAlerts = alerts.length
  const criticalAlerts = alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high' || (typeof a.severity === 'number' && a.severity >= 6)
  ).length
  const openCases = cases.filter((c) => c.status !== 'closed').length
  const totalDevices = devices.length
  const isolatedDevices = 0 // Would come from EDR state

  const severityCounts = alerts.reduce(
    (acc, alert) => {
      const sev = typeof alert.severity === 'number'
        ? alert.severity >= 8 ? 'critical' : alert.severity >= 6 ? 'high' : alert.severity >= 4 ? 'medium' : 'low'
        : alert.severity || 'info'
      acc[sev] = (acc[sev] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const sourceCounts = events.reduce(
    (acc, event) => {
      const source = event.source || event.event_type || 'unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const topSources = Object.entries(sourceCounts)
    .map(([name, count]) => ({ name, count, percent: Math.round((count / totalEvents) * 100) }))
    .sort((a, b) => b.count - a.count)

  return {
    totalEvents,
    totalAlerts,
    criticalAlerts,
    openCases,
    totalDevices,
    isolatedDevices,
    severityCounts,
    sourceCounts,
    topSources,
  }
}
