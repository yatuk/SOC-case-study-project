import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Alert,
  Case,
  Event,
  Device,
  IOC,
  Playbook,
  PlaybookRun,
  Summary,
  MitreCoverage,
  DatasetProfile,
  EDRState,
  Settings,
  SavedSearch,
  RiskScore,
} from '@/types'

// Default settings
const defaultSettings: Settings = {
  language: 'tr',
  timezone: 'Europe/Istanbul',
  dateFormat: 'DD.MM.YYYY HH:mm',
  theme: 'dark',
  sidebarExpanded: true,
  tableDensity: 'normal',
  notifications: {
    desktop: true,
    sound: false,
    criticalPopup: true,
  },
  sessionTimeout: 30,
}

// Data store
interface DataState {
  summary: Summary | null
  alerts: Alert[]
  events: Event[]
  cases: Case[]
  devices: Device[]
  iocs: IOC[]
  normalizedIocs: IOC[]
  playbooks: Playbook[]
  playbookRuns: PlaybookRun[]
  riskScores: Record<string, RiskScore>
  correlations: Record<string, unknown>
  mitreCoverage: MitreCoverage | null
  datasetProfile: DatasetProfile | null
  isLoading: boolean
  error: string | null
  lastLoaded: Date | null
  setData: (key: keyof Omit<DataState, 'isLoading' | 'error' | 'lastLoaded' | 'setData' | 'setLoading' | 'setError' | 'refresh'>, data: unknown) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  refresh: () => void
}

export const useDataStore = create<DataState>((set) => ({
  summary: null,
  alerts: [],
  events: [],
  cases: [],
  devices: [],
  iocs: [],
  normalizedIocs: [],
  playbooks: [],
  playbookRuns: [],
  riskScores: {},
  correlations: {},
  mitreCoverage: null,
  datasetProfile: null,
  isLoading: false,
  error: null,
  lastLoaded: null,
  setData: (key, data) => set({ [key]: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  refresh: () => set({ lastLoaded: new Date() }),
}))

// UI State store
interface UIState {
  currentView: string
  sidebarCollapsed: boolean
  drawerOpen: boolean
  drawerType: string | null
  drawerData: unknown
  searchQuery: string
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentView: (view: string) => void
  openDrawer: (type: string, data?: unknown) => void
  closeDrawer: () => void
  setSearchQuery: (query: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'overview',
  sidebarCollapsed: false,
  drawerOpen: false,
  drawerType: null,
  drawerData: null,
  searchQuery: '',
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentView: (view) => set({ currentView: view }),
  openDrawer: (type, data) => set({ drawerOpen: true, drawerType: type, drawerData: data }),
  closeDrawer: () => set({ drawerOpen: false, drawerType: null, drawerData: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))

// Persisted stores (settings, EDR state, SOAR state)
interface SettingsState {
  settings: Settings
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  updateNestedSetting: <K extends keyof Settings>(
    parent: K,
    key: string,
    value: unknown
  ) => void
  resetSettings: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      updateNestedSetting: (parent, key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [parent]: {
              ...(state.settings[parent] as Record<string, unknown>),
              [key]: value,
            },
          },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'soc-settings',
    }
  )
)

// EDR State
interface EDRStateStore {
  edrState: EDRState
  performAction: (deviceId: string, action: string) => void
  clearState: () => void
}

export const useEDRStore = create<EDRStateStore>()(
  persist(
    (set) => ({
      edrState: {},
      performAction: (deviceId, action) =>
        set((state) => {
          const device = state.edrState[deviceId] || { isolated: false, actions: [] }
          const newState = { ...device }
          
          if (action === 'isolate') newState.isolated = true
          if (action === 'release') newState.isolated = false
          
          newState.actions = [
            ...newState.actions,
            { action, time: new Date().toISOString() },
          ]
          
          return {
            edrState: { ...state.edrState, [deviceId]: newState },
          }
        }),
      clearState: () => set({ edrState: {} }),
    }),
    {
      name: 'soc-edr-state',
    }
  )
)

// SOAR State
interface SOARStateStore {
  runs: PlaybookRun[]
  activeRun: string | null
  addRun: (run: PlaybookRun) => void
  updateRun: (runId: string, updates: Partial<PlaybookRun>) => void
  setActiveRun: (runId: string | null) => void
  clearRuns: () => void
}

export const useSOARStore = create<SOARStateStore>()(
  persist(
    (set) => ({
      runs: [],
      activeRun: null,
      addRun: (run) =>
        set((state) => ({ runs: [...state.runs, run] })),
      updateRun: (runId, updates) =>
        set((state) => ({
          runs: state.runs.map((r) =>
            r.id === runId ? { ...r, ...updates } : r
          ),
        })),
      setActiveRun: (runId) => set({ activeRun: runId }),
      clearRuns: () => set({ runs: [], activeRun: null }),
    }),
    {
      name: 'soc-soar-state',
    }
  )
)

// Saved Searches
interface SavedSearchesStore {
  searches: SavedSearch[]
  addSearch: (search: SavedSearch) => void
  removeSearch: (id: string) => void
  clearSearches: () => void
}

export const useSavedSearchesStore = create<SavedSearchesStore>()(
  persist(
    (set) => ({
      searches: [],
      addSearch: (search) =>
        set((state) => ({ searches: [...state.searches, search] })),
      removeSearch: (id) =>
        set((state) => ({
          searches: state.searches.filter((s) => s.id !== id),
        })),
      clearSearches: () => set({ searches: [] }),
    }),
    {
      name: 'soc-saved-searches',
    }
  )
)
