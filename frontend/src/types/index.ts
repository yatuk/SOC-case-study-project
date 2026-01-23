// Data types for SOC Dashboard

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type CaseStatus = 'new' | 'in_progress' | 'investigating' | 'contained' | 'closed'

export interface Alert {
  alert_id: string
  alert_name?: string
  name?: string
  title?: string
  timestamp?: string
  ts?: string
  severity: Severity | number
  confidence?: string | number
  user?: string
  affected_user?: string
  src_ip?: string
  source_ip?: string
  device?: string
  mitre_techniques?: string[]
  techniques?: string[]
  hypothesis?: string
  description?: string
  evidence_event_ids?: string[]
  evidence?: string[]
  recommended_actions?: string[]
  case_id?: string
}

export interface Case {
  case_id: string
  title: string
  severity: Severity
  status: CaseStatus
  alert_ids?: string[]
  affected_users?: string[]
  start_ts?: string
  narrative?: string
}

export interface Event {
  event_id?: string
  id?: string
  ts?: string
  timestamp?: string
  source?: string
  event_type?: string
  severity?: Severity | number
  user?: string | { id?: string; display?: string; email?: string }
  device?: string | { id?: string; hostname?: string; os?: string }
  network?: {
    src_ip?: string
    dst_ip?: string
    src_geo?: string
    dst_geo?: string
    domain?: string
  }
  src_ip?: string
  process?: { name?: string; pid?: number; parent_name?: string; cmdline?: string }
  artifact?: { file_path?: string; hash?: string }
  tags?: string[]
  raw?: Record<string, unknown>
  summary?: string
}

export interface Device {
  device_id?: string
  id?: string
  hostname: string
  os?: string
  owner?: string
  owner_user?: string
  location?: string
  first_seen?: string
  last_seen?: string
  risk_score?: number
  open_alerts?: number
  recent_processes?: ProcessInfo[]
  recent_connections?: ConnectionInfo[]
}

export interface ProcessInfo {
  process: string
  parent?: string
  timestamp?: string
  pid?: number
}

export interface ConnectionInfo {
  domain?: string
  dst_domain?: string
  ip?: string
  dst_ip?: string
  timestamp?: string
}

export interface IOC {
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | string

  // canonical field
  value: string

  // aliases / enrichment (Intel.tsx uyumu + farklı datasetler)
  indicator?: string
  domain?: string
  label?: string

  severity?: 'critical' | 'high' | 'medium' | 'low' | string
  confidence?: number | string
  tags?: string[]
  source?: string
  first_seen?: string
  description?: string
  last_seen?: string
}

export interface Playbook {
  id: string
  name: string
  category?: string
  description?: string
  triggers?: string[]
  requires_approval?: boolean
  estimated_time?: string
  steps?: PlaybookStep[]
}

export interface PlaybookStep {
  id: string
  type: 'enrich' | 'lookup' | 'hunt' | 'action' | 'approval' | 'decision' | 'note'
  name: string
  description?: string
  auto?: boolean
  edr_action?: string
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

export interface PlaybookRun {
  id: string
  playbook_id: string
  playbook_name?: string
  case_id?: string
  started_at: string
  finished_at?: string
  status: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed'
  steps?: PlaybookStep[]
}

export interface RiskScore {
  total_score?: number
  score?: number
  factors?: RiskFactor[]
}

export interface RiskFactor {
  name: string
  score?: number
  weight?: number
}

export interface Summary {
  total_events?: number
  total_alerts?: number
  critical_alerts?: number
  unique_users?: number
  unique_devices?: number
  time_range?: { start: string; end: string }
}

export interface MitreCoverage {
  techniques?: MitreTechnique[]
}

export interface MitreTechnique {
  id: string
  name: string
  tactic: string
  count?: number
}

export interface DatasetProfile {
  total_files?: number
  total_events_normalized?: number
  total_iocs?: number
  files?: FileProfile[]
}

export interface FileProfile {
  filename: string
  family: string
  rows: number
  errors: number
}

export interface KPITimeseries {
  hourly_events?: Record<string, number>
  hourly_alerts?: Record<string, number>
  daily_risk?: Record<string, number>
}

// State types
export interface EDRState {
  [deviceId: string]: {
    isolated: boolean
    actions: { action: string; time: string }[]
  }
}

export interface SOARState {
  runs: PlaybookRun[]
  active: string | null
}

export interface Settings {
  language: 'tr' | 'en'
  timezone: string
  dateFormat: string
  theme: 'dark' | 'light' | 'system'
  sidebarExpanded: boolean
  tableDensity: 'compact' | 'normal' | 'comfortable'
  notifications: {
    desktop: boolean
    sound: boolean
    criticalPopup: boolean
  }
  sessionTimeout: number
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  created: string
}
