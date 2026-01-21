/**
 * SOC Dashboard - Main Application Logic
 * Loads and visualizes SOC pipeline outputs
 */

// ===== State Management =====
const state = {
    summary: null,
    alerts: [],
    riskScores: null,
    correlations: null,
    selectedAlert: null,
    filters: {
        severity: 'all',
        searchTerm: ''
    }
};

// ===== Data Paths (works for both local and GitHub Pages) =====
const DATA_PATH = 'dashboard_data/';

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    renderDashboard();
    attachEventListeners();
});

// ===== Data Loading =====
async function loadAllData() {
    try {
        // Load summary
        const summaryResponse = await fetch(`${DATA_PATH}summary.json`);
        state.summary = await summaryResponse.json();

        // Load alerts (JSONL format)
        const alertsResponse = await fetch(`${DATA_PATH}alerts.jsonl`);
        const alertsText = await alertsResponse.text();
        state.alerts = alertsText.trim().split('\n').map(line => JSON.parse(line));

        // Load risk scores
        const riskResponse = await fetch(`${DATA_PATH}risk_scores.json`);
        state.riskScores = await riskResponse.json();

        // Load correlations
        const corrResponse = await fetch(`${DATA_PATH}correlations.json`);
        state.correlations = await corrResponse.json();

    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load dashboard data. Please ensure pipeline has been run.');
    }
}

// ===== Main Rendering =====
function renderDashboard() {
    if (!state.summary) return;

    renderHeader();
    renderKPIs();
    renderAlertList();
    renderTimeline();
    renderMITREHeatmap();
}

// ===== Header Rendering =====
function renderHeader() {
    document.getElementById('incident-id').textContent = state.summary.incident_id;
    
    const statusBadge = document.getElementById('incident-status');
    statusBadge.textContent = state.summary.status.replace(/_/g, ' ');
    statusBadge.className = `status-badge ${state.summary.severity}`;
}

// ===== KPI Rendering =====
function renderKPIs() {
    const metrics = state.summary.metrics;
    
    document.getElementById('kpi-total-events').textContent = metrics.total_events_analyzed;
    document.getElementById('kpi-total-alerts').textContent = metrics.total_alerts_generated;
    
    const highSeverity = metrics.alerts_by_severity.critical + metrics.alerts_by_severity.high;
    document.getElementById('kpi-high-severity').textContent = highSeverity;
    document.getElementById('kpi-unique-users').textContent = metrics.affected_users;
}

// ===== Alert List Rendering =====
function renderAlertList() {
    const container = document.getElementById('alert-list');
    const filtered = getFilteredAlerts();

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <p>No alerts match current filters</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((alert, index) => `
        <div class="alert-item" data-alert-id="${alert.alert_id}" onclick="selectAlert('${alert.alert_id}')">
            <div class="alert-header">
                <div class="alert-name">${escapeHtml(alert.name)}</div>
                <span class="severity-badge ${alert.severity}">${alert.severity}</span>
            </div>
            <div class="alert-meta">
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    ${escapeHtml(alert.entity.user)}
                </span>
                <span>Confidence: ${alert.confidence}</span>
            </div>
        </div>
    `).join('');
}

// ===== Alert Selection & Details =====
function selectAlert(alertId) {
    const alert = state.alerts.find(a => a.alert_id === alertId);
    if (!alert) return;

    state.selectedAlert = alert;

    // Update UI selection
    document.querySelectorAll('.alert-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.alertId === alertId);
    });

    renderAlertDetails(alert);
}

function renderAlertDetails(alert) {
    const container = document.getElementById('details-content');
    
    container.innerHTML = `
        <div class="detail-section">
            <h3>Overview</h3>
            <div class="detail-field">
                <div class="field-label">Alert Name</div>
                <div class="field-value">${escapeHtml(alert.name)}</div>
            </div>
            <div class="detail-field">
                <div class="field-label">Severity / Confidence</div>
                <div class="field-value">
                    <span class="severity-badge ${alert.severity}">${alert.severity}</span>
                    <span style="margin-left: 0.5rem;">Confidence: ${alert.confidence}</span>
                </div>
            </div>
            <div class="detail-field">
                <div class="field-label">Affected Entity</div>
                <div class="field-value mono" style="cursor: pointer;" onclick="showRiskScore('${escapeHtml(alert.entity.user)}')">${escapeHtml(alert.entity.user)}</div>
                <small style="color: var(--text-muted);">Click to view risk score breakdown</small>
            </div>
            <div class="detail-field">
                <div class="field-label">Time Window</div>
                <div class="field-value mono">${alert.time_window.start} → ${alert.time_window.end}</div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Hypothesis</h3>
            <div class="field-value">${escapeHtml(alert.hypothesis)}</div>
        </div>

        <div class="detail-section">
            <h3>MITRE ATT&CK Techniques</h3>
            <div class="mitre-tags">
                ${alert.mitre.map(technique => `
                    <div class="mitre-tag">
                        <strong>${technique.id}</strong>
                        <div>${escapeHtml(technique.name)}</div>
                        <span class="tactic">${escapeHtml(technique.tactic)}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="detail-section">
            <h3>Evidence (Event IDs)</h3>
            <div class="evidence-list">
                ${alert.evidence.slice(0, 10).map(id => `
                    <div class="evidence-item">${id}</div>
                `).join('')}
                ${alert.evidence.length > 10 ? `<div class="evidence-item">+ ${alert.evidence.length - 10} more events</div>` : ''}
            </div>
        </div>

        <div class="detail-section">
            <h3>Recommended Actions</h3>
            <ul class="actions-list">
                ${alert.recommended_actions.map(action => `
                    <li>${escapeHtml(action)}</li>
                `).join('')}
            </ul>
            <button class="copy-btn" onclick="copyActions()">📋 Copy Actions to Clipboard</button>
        </div>
    `;
}

// ===== Timeline Rendering =====
function renderTimeline() {
    const container = document.getElementById('timeline');
    
    // Map alerts to timeline events with proper ordering
    const timelineEvents = [
        {
            title: 'Phishing Email Received',
            time: '2026-01-10T08:15:23Z',
            desc: 'Malicious phishing email delivered to user inbox',
            severity: 'medium'
        },
        {
            title: 'Phishing Link Clicked',
            time: '2026-01-10T08:17:45Z',
            desc: 'User clicked malicious link and submitted credentials',
            severity: 'high'
        },
        {
            title: 'Suspicious Login (Impossible Travel)',
            time: '2026-01-10T08:47:18Z',
            desc: 'Attacker authenticated from Romania after credential theft',
            severity: 'critical'
        },
        {
            title: 'Mailbox Rule Created (Persistence)',
            time: '2026-01-10T08:52:30Z',
            desc: 'Forwarding rule created to exfiltrate sensitive emails',
            severity: 'critical'
        },
        {
            title: 'SOC Detection & Containment',
            time: '2026-01-10T10:05:00Z',
            desc: 'Sessions revoked, password reset, malicious rule removed',
            severity: 'low'
        }
    ];

    container.innerHTML = timelineEvents.map(event => `
        <div class="timeline-item">
            <div class="timeline-marker ${event.severity}"></div>
            <div class="timeline-content">
                <div class="timeline-title">${escapeHtml(event.title)}</div>
                <div class="timeline-time">${formatTime(event.time)}</div>
                <div class="timeline-desc">${escapeHtml(event.desc)}</div>
            </div>
        </div>
    `).join('');
}

// ===== MITRE ATT&CK Heatmap =====
function renderMITREHeatmap() {
    const container = document.getElementById('mitre-grid');
    
    // Extract all unique MITRE techniques from summary
    const techniques = state.summary.mitre_techniques.map(tech => {
        const [id, name] = tech.split(' - ');
        return { id, name };
    });

    // Get techniques used in alerts for highlighting
    const usedTechniques = new Set();
    state.alerts.forEach(alert => {
        alert.mitre.forEach(m => usedTechniques.add(m.id));
    });

    container.innerHTML = techniques.map(tech => `
        <div class="mitre-cell ${usedTechniques.has(tech.id) ? 'active' : ''}">
            <div class="mitre-id">${tech.id}</div>
            <div class="mitre-name">${escapeHtml(tech.name)}</div>
        </div>
    `).join('');
}

// ===== Risk Score Modal =====
function showRiskScore(userEmail) {
    const userScore = state.riskScores.entity_scores[userEmail];
    if (!userScore) {
        alert('No risk score data available for this user');
        return;
    }

    const modal = document.getElementById('risk-modal');
    const modalBody = document.getElementById('risk-modal-body');

    modalBody.innerHTML = `
        <div class="risk-user">${escapeHtml(userEmail)}</div>
        <div class="risk-score-display">${userScore.score}</div>
        <div style="text-align: center; color: var(--text-secondary); margin-bottom: 1rem;">
            Total Risk Score (Severity: <span class="severity-badge ${userScore.severity}">${userScore.severity}</span>)
        </div>

        <div class="risk-factors">
            <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Contributing Factors</h4>
            ${userScore.reasons.map(reason => `
                <div class="risk-factor">
                    <div class="risk-factor-rule">
                        <span class="risk-factor-points">+${reason.points}</span>
                        ${escapeHtml(reason.rule.replace(/_/g, ' ').toUpperCase())}
                    </div>
                    <div class="risk-factor-desc">${escapeHtml(reason.description)}</div>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 0.375rem; font-size: 0.875rem; color: var(--text-secondary);">
            <strong>Risk Calculation:</strong> Individual event risk scores are aggregated based on detection rules. 
            Higher scores indicate stronger indicators of compromise requiring immediate investigation.
        </div>
    `;

    modal.classList.add('active');
}

// ===== Filtering =====
function getFilteredAlerts() {
    return state.alerts.filter(alert => {
        // Severity filter
        if (state.filters.severity !== 'all' && alert.severity !== state.filters.severity) {
            return false;
        }

        // Search filter
        if (state.filters.searchTerm) {
            const term = state.filters.searchTerm.toLowerCase();
            const searchableText = [
                alert.name,
                alert.entity.user,
                alert.entity.ips?.join(' ') || '',
                alert.hypothesis
            ].join(' ').toLowerCase();

            if (!searchableText.includes(term)) {
                return false;
            }
        }

        return true;
    });
}

// ===== Event Listeners =====
function attachEventListeners() {
    // Search input
    document.getElementById('alert-search').addEventListener('input', (e) => {
        state.filters.searchTerm = e.target.value;
        renderAlertList();
    });

    // Severity filter
    document.getElementById('severity-filter').addEventListener('change', (e) => {
        state.filters.severity = e.target.value;
        renderAlertList();
    });

    // Close details panel
    document.getElementById('close-details').addEventListener('click', () => {
        state.selectedAlert = null;
        document.querySelectorAll('.alert-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.getElementById('details-content').innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                </svg>
                <p>Select an alert to view details</p>
            </div>
        `;
    });

    // Close risk modal
    document.getElementById('close-risk-modal').addEventListener('click', () => {
        document.getElementById('risk-modal').classList.remove('active');
    });

    // Close modal on backdrop click
    document.getElementById('risk-modal').addEventListener('click', (e) => {
        if (e.target.id === 'risk-modal') {
            document.getElementById('risk-modal').classList.remove('active');
        }
    });
}

// ===== Utility Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
}

function copyActions() {
    if (!state.selectedAlert) return;

    const actions = state.selectedAlert.recommended_actions.join('\n');
    navigator.clipboard.writeText(actions).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = 'var(--severity-low)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = 'var(--accent-blue)';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

function showError(message) {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; color: var(--text-primary);">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h2 style="margin-top: 1rem;">${message}</h2>
            <p style="margin-top: 0.5rem; color: var(--text-secondary);">Run the pipeline with: <code style="background: var(--bg-secondary); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">python run_pipeline.py</code></p>
        </div>
    `;
}

// ===== Global function exposure for onclick handlers =====
window.selectAlert = selectAlert;
window.showRiskScore = showRiskScore;
window.copyActions = copyActions;
