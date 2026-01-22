// src/web/static/app.js

const state = {
    summary: null,
    alerts: [],
    riskScores: null,
    correlations: null,
    selectedAlert: null,
    currentView: 'overview',
    filters: {
        severity: 'all',
        searchTerm: ''
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initEventListeners();
    checkHealth();
    loadDashboardData();
});

// ===== Navigation =====
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    state.currentView = viewName;
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('hidden', view.id !== `view-${viewName}`);
    });
    
    // Load view-specific data
    loadViewData(viewName);
}

function loadViewData(viewName) {
    switch(viewName) {
        case 'overview':
            renderOverview();
            break;
        case 'alerts':
            renderAlerts();
            break;
        case 'entities':
            renderEntities();
            break;
        case 'timeline':
            renderTimeline();
            break;
        case 'mitre':
            renderMITRE();
            break;
        case 'reports':
            renderReports('executive');
            break;
    }
}

// ===== Event Listeners =====
function initEventListeners() {
    document.getElementById('run-pipeline-btn').addEventListener('click', runPipeline);
    document.getElementById('close-drawer').addEventListener('click', closeDrawer);
    document.getElementById('alert-search')?.addEventListener('input', handleAlertSearch);
    document.getElementById('severity-filter')?.addEventListener('change', handleSeverityFilter);
    document.getElementById('user-selector')?.addEventListener('change', handleUserSelect);
    
    // Report tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const report = btn.dataset.report;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReports(report);
        });
    });
}

// ===== Health Check =====
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        const indicator = document.getElementById('health-indicator');
        const dot = indicator.querySelector('.status-dot');
        const text = indicator.querySelector('.status-text');
        
        if (data.outputs_available) {
            dot.classList.add('healthy');
            text.textContent = 'Data Available';
        } else {
            dot.classList.add('unhealthy');
            text.textContent = 'Run Pipeline';
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
}

// ===== Load Dashboard Data =====
async function loadDashboardData() {
    try {
        const [summaryRes, alertsRes, riskRes, corrRes] = await Promise.all([
            fetch('/api/summary').catch(() => null),
            fetch('/api/alerts').catch(() => null),
            fetch('/api/risk').catch(() => null),
            fetch('/api/correlations').catch(() => null)
        ]);
        
        if (summaryRes?.ok) state.summary = await summaryRes.json();
        if (alertsRes?.ok) {
            const data = await alertsRes.json();
            state.alerts = data.alerts;
        }
        if (riskRes?.ok) state.riskScores = await riskRes.json();
        if (corrRes?.ok) state.correlations = await corrRes.json();
        
        renderCurrentView();
    } catch (error) {
        console.error('Failed to load data:', error);
        showEmptyState('No data available. Run the pipeline to generate incident data.');
    }
}

function renderCurrentView() {
    loadViewData(state.currentView);
}

// ===== Overview View =====
function renderOverview() {
    if (!state.summary) return;
    
    const metrics = state.summary.metrics;
    
    document.getElementById('incident-id').textContent = state.summary.incident_id;
    document.getElementById('kpi-events').textContent = metrics.total_events_analyzed;
    document.getElementById('kpi-alerts').textContent = metrics.total_alerts_generated;
    
    const highSeverity = metrics.alerts_by_severity.critical + metrics.alerts_by_severity.high;
    document.getElementById('kpi-high').textContent = highSeverity;
    document.getElementById('kpi-users').textContent = metrics.affected_users;
}

// ===== Alerts View =====
function renderAlerts() {
    const container = document.getElementById('alerts-table');
    const filtered = getFilteredAlerts();
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No alerts match filters</div>';
        return;
    }
    
    container.innerHTML = filtered.map(alert => `
        <div class="alert-row" onclick="openAlertDrawer('${alert.alert_id}')">
            <div>
                <div class="alert-name">${escapeHtml(alert.name)}</div>
                <div class="alert-user">${escapeHtml(alert.entity.user)}</div>
            </div>
            <div class="alert-user">${alert.time_window.start.substring(0, 16)}</div>
            <div>
                <span class="severity-badge ${alert.severity}">${alert.severity}</span>
            </div>
            <div class="confidence-text">Confidence: ${alert.confidence}</div>
        </div>
    `).join('');
}

function getFilteredAlerts() {
    return state.alerts.filter(alert => {
        if (state.filters.severity !== 'all' && alert.severity !== state.filters.severity) {
            return false;
        }
        
        if (state.filters.searchTerm) {
            const term = state.filters.searchTerm.toLowerCase();
            const searchable = [
                alert.name,
                alert.entity.user,
                alert.hypothesis
            ].join(' ').toLowerCase();
            
            if (!searchable.includes(term)) return false;
        }
        
        return true;
    });
}

function handleAlertSearch(e) {
    state.filters.searchTerm = e.target.value;
    renderAlerts();
}

function handleSeverityFilter(e) {
    state.filters.severity = e.target.value;
    renderAlerts();
}

// ===== Alert Drawer =====
function openAlertDrawer(alertId) {
    const alert = state.alerts.find(a => a.alert_id === alertId);
    if (!alert) return;
    
    state.selectedAlert = alert;
    
    const drawer = document.getElementById('evidence-drawer');
    const content = document.getElementById('drawer-content');
    
    // Get workflow state from localStorage
    const workflowState = localStorage.getItem(`alert-${alertId}-workflow`) || 'new';
    
    content.innerHTML = `
        <div class="drawer-section">
            <h4>Overview</h4>
            <div class="drawer-field">
                <div class="drawer-field-value" style="font-size: 1.25rem; font-weight: 600;">
                    ${escapeHtml(alert.name)}
                </div>
            </div>
            <div class="drawer-field">
                <span class="severity-badge ${alert.severity}">${alert.severity}</span>
                <span style="margin-left: 0.5rem; color: var(--text-secondary);">
                    Confidence: ${alert.confidence}
                </span>
            </div>
            <div class="drawer-field">
                <strong>Affected Entity:</strong><br>
                <code style="background: var(--bg-card); padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem;">
                    ${escapeHtml(alert.entity.user)}
                </code>
            </div>
            <div class="drawer-field">
                <strong>Time Window:</strong><br>
                <span style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--text-secondary);">
                    ${alert.time_window.start}<br>→ ${alert.time_window.end}
                </span>
            </div>
        </div>
        
        <div class="drawer-section">
            <h4>Hypothesis</h4>
            <div class="drawer-field-value">${escapeHtml(alert.hypothesis)}</div>
        </div>
        
        <div class="drawer-section">
            <h4>MITRE ATT&CK Techniques</h4>
            <div class="mitre-tags">
                ${alert.mitre.map(t => `
                    <div class="mitre-tag">
                        <span class="mitre-tag-id">${t.id}</span>
                        <span class="mitre-tag-name">${escapeHtml(t.name)}</span>
                        <span class="mitre-tag-tactic">${escapeHtml(t.tactic)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="drawer-section">
            <h4>Evidence (Event IDs)</h4>
            <div class="evidence-list">
                ${alert.evidence.slice(0, 15).map(id => `
                    <div class="evidence-item">${id}</div>
                `).join('')}
                ${alert.evidence.length > 15 ? `<div class="evidence-item">+ ${alert.evidence.length - 15} more</div>` : ''}
            </div>
            <button class="btn-copy" onclick="copyEvidence()">📋 Copy All Event IDs</button>
        </div>
        
        <div class="drawer-section">
            <h4>Recommended Actions</h4>
            <ul class="actions-list">
                ${alert.recommended_actions.map(action => `
                    <li>${escapeHtml(action)}</li>
                `).join('')}
            </ul>
            <button class="btn-copy" onclick="copyActions()">📋 Copy All Actions</button>
        </div>
        
        <div class="drawer-section">
            <h4>SOC Workflow</h4>
            <div class="workflow-buttons">
                <button class="btn-workflow ${workflowState === 'investigating' ? 'active' : ''}" 
                        onclick="setWorkflowState('${alertId}', 'investigating')">
                    Investigating
                </button>
                <button class="btn-workflow ${workflowState === 'closed' ? 'active' : ''}" 
                        onclick="setWorkflowState('${alertId}', 'closed')">
                    Closed
                </button>
            </div>
        </div>
    `;
    
    drawer.classList.add('open');
}

function closeDrawer() {
    document.getElementById('evidence-drawer').classList.remove('open');
}

function copyEvidence() {
    if (!state.selectedAlert) return;
    const text = state.selectedAlert.evidence.join('\n');
    navigator.clipboard.writeText(text);
    showNotification('Evidence IDs copied');
}

function copyActions() {
    if (!state.selectedAlert) return;
    const text = state.selectedAlert.recommended_actions.join('\n');
    navigator.clipboard.writeText(text);
    showNotification('Actions copied');
}

function setWorkflowState(alertId, state) {
    localStorage.setItem(`alert-${alertId}-workflow`, state);
    openAlertDrawer(alertId); // Refresh drawer
}

// ===== Entities View =====
function renderEntities() {
    if (!state.riskScores) return;
    
    const selector = document.getElementById('user-selector');
    const container = document.getElementById('entity-details');
    
    const users = Object.keys(state.riskScores.entity_scores);
    
    if (selector.options.length === 0) {
        selector.innerHTML = users.map(user => 
            `<option value="${user}">${user}</option>`
        ).join('');
    }
    
    const selectedUser = selector.value || users[0];
    if (!selectedUser) return;
    
    const userScore = state.riskScores.entity_scores[selectedUser];
    
    container.innerHTML = `
        <div class="risk-score-display">
            <div class="risk-score-value">${userScore.score}</div>
            <div style="color: var(--text-secondary); margin-top: 0.5rem;">
                Risk Score (<span class="severity-badge ${userScore.severity}">${userScore.severity}</span>)
            </div>
        </div>
        
        <h3 style="margin-bottom: 1rem;">Contributing Factors</h3>
        <div class="risk-factors">
            ${userScore.reasons.map(r => `
                <div class="risk-factor">
                    <div class="risk-factor-rule">
                        <span class="risk-factor-points">+${r.points}</span>
                        ${escapeHtml(r.rule.replace(/_/g, ' ').toUpperCase())}
                    </div>
                    <div class="risk-factor-desc">${escapeHtml(r.description)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function handleUserSelect() {
    renderEntities();
}

// ===== Timeline View =====
function renderTimeline() {
    const container = document.getElementById('timeline-container');
    
    const events = [
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
            desc: 'Attacker authenticated from Romania',
            severity: 'critical'
        },
        {
            title: 'Mailbox Rule Created',
            time: '2026-01-10T08:52:30Z',
            desc: 'Forwarding rule created for data exfiltration',
            severity: 'critical'
        },
        {
            title: 'SOC Containment',
            time: '2026-01-10T10:05:00Z',
            desc: 'Sessions revoked, password reset, rule removed',
            severity: 'low'
        }
    ];
    
    container.innerHTML = events.map(event => `
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

// ===== MITRE View =====
function renderMITRE() {
    if (!state.summary) return;
    
    const container = document.getElementById('mitre-grid');
    const techniques = state.summary.mitre_techniques.map(t => {
        const [id, name] = t.split(' - ');
        return { id, name };
    });
    
    // Get used techniques from alerts
    const usedTechniques = new Set();
    state.alerts.forEach(alert => {
        alert.mitre.forEach(m => usedTechniques.add(m.id));
    });
    
    container.innerHTML = techniques.map(tech => `
        <div class="mitre-cell ${usedTechniques.has(tech.id) ? 'active' : ''}">
            <div class="mitre-cell-id">${tech.id}</div>
            <div class="mitre-cell-name">${escapeHtml(tech.name)}</div>
        </div>
    `).join('');
}

// ===== Reports View =====
async function renderReports(type) {
    const container = document.getElementById('report-content');
    
    try {
        const response = await fetch(`/api/reports/${type}`);
        const data = await response.json();
        
        container.innerHTML = renderMarkdown(data.content);
    } catch (error) {
        container.innerHTML = '<div class="empty-state">Report not available</div>';
    }
}

function renderMarkdown(md) {
    // Simple markdown rendering
    let html = md;
    
    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Code blocks
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    return html;
}

// ===== Pipeline Execution =====
async function runPipeline() {
    const btn = document.getElementById('run-pipeline-btn');
    const modal = document.getElementById('pipeline-modal');
    const logs = document.getElementById('pipeline-logs');
    
    btn.disabled = true;
    modal.classList.add('active');
    logs.textContent = 'Starting pipeline...\n';
    
    try {
        const response = await fetch('/api/run-pipeline', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        logs.textContent = data.stdout + '\n\n' + data.stderr;
        
        setTimeout(() => {
            modal.classList.remove('active');
            
            if (data.success) {
                showNotification('Pipeline completed successfully');
                checkHealth();
                loadDashboardData();
                
                // Update pipeline view
                const pipelineStatus = document.getElementById('pipeline-status');
                pipelineStatus.innerHTML = `
                    <div style="margin-bottom: 1rem;">
                        <strong>Status:</strong> <span style="color: var(--low);">Success</span><br>
                        <strong>Duration:</strong> ${data.duration.toFixed(2)}s<br>
                        <strong>Time:</strong> ${new Date().toLocaleString()}
                    </div>
                    <div class="log-output">${escapeHtml(data.stdout)}</div>
                `;
            } else {
                showNotification('Pipeline failed - check logs');
                
                const pipelineStatus = document.getElementById('pipeline-status');
                pipelineStatus.innerHTML = `
                    <div style="margin-bottom: 1rem; color: var(--critical);">
                        <strong>Status:</strong> Failed<br>
                        <strong>Duration:</strong> ${data.duration.toFixed(2)}s
                    </div>
                    <div class="log-output">${escapeHtml(data.stderr || data.stdout)}</div>
                `;
            }
        }, 2000);
        
    } catch (error) {
        logs.textContent = 'Error: ' + error.message;
        setTimeout(() => {
            modal.classList.remove('active');
            showNotification('Pipeline execution failed');
        }, 2000);
    } finally {
        btn.disabled = false;
    }
}

// ===== Utilities =====
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
        second: '2-digit'
    });
}

function showNotification(message) {
    // Simple notification (could be enhanced)
    console.log('[NOTIFICATION]', message);
}

function showEmptyState(message) {
    const content = document.querySelector('.content');
    content.innerHTML = `<div class="empty-state">${message}</div>`;
}

// Expose functions to global scope for onclick handlers
window.openAlertDrawer = openAlertDrawer;
window.copyEvidence = copyEvidence;
window.copyActions = copyActions;
window.setWorkflowState = setWorkflowState;
