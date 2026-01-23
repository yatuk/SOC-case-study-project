// Mock data generators for dashboard simulations

export interface ComplianceScore {
  framework: string
  score: number
  status: 'compliant' | 'partial' | 'non-compliant'
  lastAudit: string
  requirements: {
    total: number
    met: number
  }
}

export interface UserRiskScore {
  userId: string
  email: string
  riskScore: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  factors: string[]
  lastActivity: string
}

// Generate compliance scores for various frameworks
export function generateComplianceScores(): ComplianceScore[] {
  return [
    {
      framework: 'GDPR',
      score: 87,
      status: 'compliant',
      lastAudit: '2026-01-15',
      requirements: { total: 45, met: 39 },
    },
    {
      framework: 'ISO 27001',
      score: 92,
      status: 'compliant',
      lastAudit: '2026-01-10',
      requirements: { total: 114, met: 105 },
    },
    {
      framework: 'SOC 2 Type II',
      score: 78,
      status: 'partial',
      lastAudit: '2025-12-20',
      requirements: { total: 64, met: 50 },
    },
    {
      framework: 'PCI DSS',
      score: 95,
      status: 'compliant',
      lastAudit: '2026-01-05',
      requirements: { total: 12, met: 12 },
    },
    {
      framework: 'NIST CSF',
      score: 83,
      status: 'compliant',
      lastAudit: '2025-12-28',
      requirements: { total: 98, met: 81 },
    },
  ]
}

// Generate user risk scores
export function generateUserRiskScores(): UserRiskScore[] {
  const users = [
    { email: 'mehmet.yilmaz@example.tr', factors: ['Phishing victim', 'Credential theft'] },
    { email: 'ayse.kara@example.tr', factors: ['MFA fatigue', 'Multiple failed logins'] },
    { email: 'emre.demir@example.tr', factors: ['Impossible travel', 'Suspicious OAuth consent'] },
    { email: 'zeynep.sahin@example.tr', factors: ['Normal behavior'] },
    { email: 'ali.ozturk@example.tr', factors: ['Normal behavior'] },
  ]

  return users.map((user, idx) => {
    const riskScore = idx === 0 ? 95 : idx === 1 ? 87 : idx === 2 ? 72 : 25
    let riskLevel: UserRiskScore['riskLevel'] = 'low'
    if (riskScore >= 90) riskLevel = 'critical'
    else if (riskScore >= 70) riskLevel = 'high'
    else if (riskScore >= 50) riskLevel = 'medium'

    return {
      userId: `user-${idx + 1}`,
      email: user.email,
      riskScore,
      riskLevel,
      factors: user.factors,
      lastActivity: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    }
  })
}

// Generate random event for real-time simulation
export function generateRandomEvent() {
  const sources = [
    'email_gateway',
    'identity_provider',
    'cloud_mailbox',
    'endpoint_edr',
    'network_firewall',
  ]
  const severities = ['critical', 'high', 'medium', 'low', 'info']
  const users = [
    'mehmet.yilmaz@example.tr',
    'ayse.kara@example.tr',
    'emre.demir@example.tr',
    'zeynep.sahin@example.tr',
  ]
  const eventTypes = [
    'authentication',
    'email_click',
    'file_access',
    'network_connection',
    'privilege_escalation',
  ]

  const severity = severities[Math.floor(Math.random() * severities.length)]
  
  return {
    id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    source: sources[Math.floor(Math.random() * sources.length)],
    severity,
    event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    user: users[Math.floor(Math.random() * users.length)],
    description: `Simulated ${severity} severity event`,
    raw: {
      simulated: true,
      generatedAt: new Date().toISOString(),
    },
  }
}

// Generate time series data for charts
export function generateTimeSeriesData(hours = 24) {
  const data = []
  const now = Date.now()
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600000)
    data.push({
      timestamp: timestamp.toISOString(),
      hour: timestamp.getHours(),
      events: Math.floor(Math.random() * 100) + 50,
      alerts: Math.floor(Math.random() * 20) + 5,
      critical: Math.floor(Math.random() * 5),
      high: Math.floor(Math.random() * 8),
      medium: Math.floor(Math.random() * 12),
      low: Math.floor(Math.random() * 15),
    })
  }
  
  return data
}

// Generate MITRE ATT&CK data
export function generateMitreStats() {
  return {
    tactics: [
      { name: 'Initial Access', count: 12, color: '#3b82f6' },
      { name: 'Persistence', count: 8, color: '#8b5cf6' },
      { name: 'Privilege Escalation', count: 6, color: '#f97316' },
      { name: 'Defense Evasion', count: 15, color: '#06b6d4' },
      { name: 'Credential Access', count: 10, color: '#84cc16' },
      { name: 'Discovery', count: 7, color: '#ec4899' },
      { name: 'Lateral Movement', count: 4, color: '#f59e0b' },
      { name: 'Collection', count: 9, color: '#10b981' },
      { name: 'Exfiltration', count: 5, color: '#ef4444' },
    ],
    coverage: {
      total: 193, // Total MITRE techniques
      detected: 76,
      percent: 39,
    },
  }
}
