// dashboard/app.js

const state = {
    summary: null,
    alerts: [],
    riskScores: null,
    correlations: null,
    currentView: 'overview',
    selectedAlert: null,
    filters: {
        severity: 'all',
        confidence: 'all',
        search: '',
        onlyOpen: false
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCommandBar();
    initCaseDrawer();
    loadData();
});

// ===== Navigation =====
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });
}

function switchView(viewName) {
    state.currentView = viewName;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === `view-${viewName}`);
    });
    
    renderView(viewName);
}

// ===== Command Bar =====
function initCommandBar() {
    document.getElementById('refresh-btn').addEventListener('click', () => {
        showToast('Refreshing data...', 'success');
        loadData();
    });
    
    document.getElementById('export-btn').addEventListener('click', exportData);
    
    document.getElementById('global-search').addEventListener('input', (e) => {
        state.filters.search = e.target.value.toLowerCase();
        if (state.currentView === 'alerts') renderAlerts();
    });
}

function exportData() {
    const data = {
        summary: state.summary,
        alerts: getFilteredAlerts(),
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soc-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Data exported successfully', 'success');
}

// ===== Data Loading =====
async function loadData() {
    try {
        const [summaryRes, alertsRes, riskRes, corrRes] = await Promise.all([
            fetch('./dashboard_data/summary.json'),
            fetch('./dashboard_data/alerts.jsonl'),
            fetch('./dashboard_data/risk_scores.json'),
            fetch('./dashboard_data/correlations.json')
        ]);
        
        if (!summaryRes.ok) throw new Error('Data not found');
        
        state.summary = await summaryRes.json();
        
        if (alertsRes.ok) {
            const text = await alertsRes.text();
            state.alerts = text.trim().split('\n')
                .map(line => {
                    try { return JSON.parse(line); }
                    catch { return null; }
                })
                .filter(Boolean);
        }
        
        if (riskRes.ok) state.riskScores = await riskRes.json();
        if (corrRes.ok) state.correlations = await corrRes.json();
        
        updateStatus('healthy', 'Data OK');
        updateLastLoaded();
        renderView(state.currentView);
        
    } catch (error) {
        console.error('Failed to load data:', error);
        updateStatus('error', 'Data Missing');
        showEmptyState('Run python run_pipeline.py and commit dashboard/dashboard_data/');
    }
}

function updateStatus(status, text) {
    const pill = document.getElementById('status-pill');
    pill.className = `status-pill ${status}`;
    pill.querySelector('.status-text').textContent = text;
}

function updateLastLoaded() {
    const now = new Date();
    document.getElementById('last-loaded').textContent = 
        `Last loaded: ${now.toLocaleTimeString()}`;
}

// ===== View Rendering =====
function renderView(viewName) {
    switch(viewName) {
        case 'overview': renderOverview(); break;
        case 'alerts': renderAlerts(); break;
        case 'entities': renderEntities(); break;
        case 'timeline': renderTimeline(); break;
        case 'mitre': renderMITRE(); break;
        case 'reports': renderReports('executive'); break;
    }
}

// ===== Overview =====
function renderOverview() {
    if (!state.summary) return;
    
    const metrics = state.summary.metrics;
    
    document.getElementById('kpi-events').innerHTML = 
        `<div>${metrics.total_events_analyzed}</div>`;
    document.getElementById('kpi-alerts').innerHTML = 
        `<div>${metrics.total_alerts_generated}</div>`;
    
    const highSev = metrics.alerts_by_severity.critical + metrics.alerts_by_severity.high;
    document.getElementById('kpi-high').innerHTML = 
        `<div>${highSev}</div>`;
    document.getElementById('kpi-users').innerHTML = 
        `<div>${metrics.affected_users}</div>`;
    
    // Severity bars
    const sevData = [
        { label: 'Critical', value: metrics.alerts_by_severity.critical, class: 'critical' },
        { label: 'High', value: metrics.alerts_by_severity.high, class: 'high' },
        { label: 'Medium', value: metrics.alerts_by_severity.medium, class: 'medium' },
        { label: 'Low', value: metrics.alerts_by_severity.low, class: 'low' }
    ];
    
    const maxSev = Math.max(...sevData.map(d => d.value));
    document.getElementById('severity-bars').innerHTML = sevData.map(d => `
        <div class="bar-item">
            <div class="bar-label">${d.label}</div>
            <div class="bar-track">
                <div class="bar-fill ${d.class}" style="width: ${(d.value / maxSev) * 100}%"></div>
            </div>
            <div class="bar-value">${d.value}</div>
        </div>
    `).join('');
    
    // User bars
    const userCounts = {};
    state.alerts.forEach(alert => {
        const user = alert.entity.user;
        userCounts[user] = (userCounts[user] || 0) + 1;
    });
    
    const topUsers = Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const maxUser = Math.max(...topUsers.map(([, count]) => count));
    document.getElementById('user-bars').innerHTML = topUsers.map(([user, count]) => `
        <div class="bar-item">
            <div class="bar-label">${user.split('@')[0]}</div>
            <div class="bar-track">
                <div class="bar-fill" style="width: ${(count / maxUser) * 100}%"></div>
            </div>
            <div class="bar-value">${count}</div>
        </div>
    `).join('');
}

// ===== Alerts =====
function renderAlerts() {
    const container = document.getElementById('alerts-list');
    const filtered = getFilteredAlerts();
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">No alerts match filters</div>';
        return;
    }
    
    container.innerHTML = filtered.map(alert => {
        const caseState = getCaseState(alert.alert_id);
        const status = caseState.status || 'new';
        
        return `
            <div class="alert-card ${alert.severity}" onclick="openCaseDrawer('${alert.alert_id}')" tabindex="0">
                <div class="alert-header">
                    <div class="alert-title">${escapeHtml(alert.name)}</div>
                    <div class="alert-badges">
                        <span class="badge ${alert.severity} ${alert.severity === 'critical' ? 'pulse' : ''}">${alert.severity}</span>
                        <span class="badge">${alert.confidence}</span>
                    </div>
                </div>
                <div class="alert-meta">
                    <span>Entity: ${escapeHtml(alert.entity.user)}</span>
                    <span>Window: ${alert.time_window.start.substring(0, 16)}</span>
                    <span>Status: ${status}</span>
                </div>
                <div class="alert-chips">
                    ${alert.entity.ips ? alert.entity.ips.map(ip => 
                        `<span class="chip">${ip}</span>`
                    ).join('') : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Keyboard navigation
    document.querySelectorAll('.alert-card').forEach((card, idx) => {
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') card.click();
            if (e.key === 'ArrowDown') document.querySelectorAll('.alert-card')[idx + 1]?.focus();
            if (e.key === 'ArrowUp') document.querySelectorAll('.alert-card')[idx - 1]?.focus();
        });
    });
}

function getFilteredAlerts() {
    return state.alerts.filter(alert => {
        if (state.filters.severity !== 'all' && alert.severity !== state.filters.severity) return false;
        if (state.filters.confidence !== 'all' && alert.confidence !== state.filters.confidence) return false;
        
        if (state.filters.search) {
            const searchable = [
                alert.name,
                alert.entity.user,
                alert.hypothesis
            ].join(' ').toLowerCase();
            
            if (!searchable.includes(state.filters.search)) return false;
        }
        
        if (state.filters.onlyOpen) {
            const caseState = getCaseState(alert.alert_id);
            if (caseState.status === 'closed') return false;
        }
        
        return true;
    });
}

// Filter handlers
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('severity-filter')?.addEventListener('change', (e) => {
        state.filters.severity = e.target.value;
        renderAlerts();
    });
    
    document.getElementById('confidence-filter')?.addEventListener('change', (e) => {
        state.filters.confidence = e.target.value;
        renderAlerts();
    });
    
    document.getElementById('alert-search')?.addEventListener('input', (e) => {
        state.filters.search = e.target.value.toLowerCase();
        renderAlerts();
    });
    
    document.getElementById('only-open')?.addEventListener('change', (e) => {
        state.filters.onlyOpen = e.target.checked;
        renderAlerts();
    });
});

// ===== Entities =====
function renderEntities() {
    if (!state.riskScores) return;
    
    const selector = document.getElementById('entity-selector');
    const users = Object.keys(state.riskScores.entity_scores);
    
    if (selector.options.length === 0) {
        selector.innerHTML = users.map(user => 
            `<option value="${user}">${user}</option>`
        ).join('');
        
        selector.addEventListener('change', renderEntities);
    }
    
    const selectedUser = selector.value || users[0];
    const userScore = state.riskScores.entity_scores[selectedUser];
    
    document.getElementById('entity-content').innerHTML = `
        <div class="risk-display">
            <div class="risk-score">${userScore.score}</div>
            <div style="color: var(--text-secondary); margin-top: var(--space-sm);">
                Risk Score (<span class="badge ${userScore.severity}">${userScore.severity}</span>)
            </div>
        </div>
        
        <h3 style="margin-bottom: var(--space-md);">Contributing Factors</h3>
        <div class="risk-factors">
            ${userScore.reasons.map(r => `
                <div class="risk-factor">
                    <div class="risk-factor-title">
                        +${r.points} — ${escapeHtml(r.rule.replace(/_/g, ' ').toUpperCase())}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        ${escapeHtml(r.description)}
                    </div>
                    <div class="risk-factor-bar">
                        <div class="risk-factor-fill" style="width: ${(r.points / userScore.score) * 100}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== Timeline =====
function renderTimeline() {
    const steps = [
        { title: 'Phishing Email Received', desc: 'Credential harvesting link delivered', active: false },
        { title: 'Phishing Link Clicked', desc: 'User submitted credentials to fake page', active: false },
        { title: 'Impossible Travel', desc: 'Attacker authenticated from distant location', active: true },
        { title: 'Mailbox Rule Persistence', desc: 'Forwarding rule created for exfiltration', active: false }
    ];
    
    document.getElementById('timeline-stepper').innerHTML = steps.map(step => `
        <div class="timeline-step ${step.active ? 'active' : ''}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <div class="timeline-title">${step.title}</div>
                <div class="timeline-desc">${step.desc}</div>
                <div class="timeline-alerts">
                    ${state.alerts.filter(a => a.name.toLowerCase().includes(step.title.toLowerCase().split(' ')[0]))
                        .map(a => `<span class="badge ${a.severity}">${a.name.substring(0, 20)}...</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// ===== MITRE =====
function renderMITRE() {
    if (!state.summary) return;
    
    const techniques = state.summary.mitre_techniques.map(t => {
        const [id, name] = t.split(' - ');
        return { id, name };
    });
    
    const usedTechniques = new Set();
    state.alerts.forEach(alert => {
        alert.mitre.forEach(m => usedTechniques.add(m.id));
    });
    
    document.getElementById('mitre-grid').innerHTML = techniques.map(tech => `
        <div class="mitre-cell ${usedTechniques.has(tech.id) ? 'active' : ''}" 
             onclick="filterByMITRE('${tech.id}')">
            <div class="mitre-id">${tech.id}</div>
            <div class="mitre-name">${escapeHtml(tech.name)}</div>
        </div>
    `).join('');
}

function filterByMITRE(techniqueId) {
    // Switch to alerts view and filter
    switchView('alerts');
    showToast(`Filtered by ${techniqueId}`, 'success');
}

// ===== Reports =====
async function renderReports(type) {
    try {
        const response = await fetch(`./dashboard_data/report_${type}.md`);
        const markdown = await response.text();
        
        document.getElementById('report-content').innerHTML = renderMarkdown(markdown);
    } catch {
        document.getElementById('report-content').innerHTML = 
            '<div class="empty-state">Report not available</div>';
    }
}

function renderMarkdown(md) {
    let html = escapeHtml(md);
    
    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    return html;
}

// Report tabs
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderReports(tab.dataset.report);
        });
    });
});

// ===== Case Drawer =====
function initCaseDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const drawer = document.getElementById('case-drawer');
    const closeBtn = document.getElementById('drawer-close');
    
    overlay.addEventListener('click', closeCaseDrawer);
    closeBtn.addEventListener('click', closeCaseDrawer);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('active')) {
            closeCaseDrawer();
        }
    });
    
    // Drawer tabs
    document.querySelectorAll('.drawer-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.drawer-panel').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
        });
    });
    
    // Case status change
    document.getElementById('case-status')?.addEventListener('change', (e) => {
        if (state.selectedAlert) {
            updateCaseState(state.selectedAlert.alert_id, { status: e.target.value });
            logActivity('Status changed to ' + e.target.value);
            showToast('Case status updated', 'success');
            renderAlerts(); // Refresh list
        }
    });
    
    // Case assignment
    document.getElementById('case-assign')?.addEventListener('change', (e) => {
        if (state.selectedAlert) {
            updateCaseState(state.selectedAlert.alert_id, { assignee: e.target.value });
            logActivity('Assigned to ' + e.target.value);
            showToast('Case assigned', 'success');
        }
    });
    
    // Add note
    document.getElementById('add-note-btn')?.addEventListener('click', () => {
        const textarea = document.getElementById('note-textarea');
        const note = textarea.value.trim();
        
        if (note && state.selectedAlert) {
            logActivity('Note: ' + note);
            textarea.value = '';
            showToast('Note added', 'success');
        }
    });
}

function openCaseDrawer(alertId) {
    const alert = state.alerts.find(a => a.alert_id === alertId);
    if (!alert) return;
    
    state.selectedAlert = alert;
    
    const caseId = generateCaseId(alertId);
    const caseState = getCaseState(alertId);
    
    document.getElementById('case-id').textContent = caseId;
    document.getElementById('case-status').value = caseState.status || 'new';
    document.getElementById('case-assign').value = caseState.assignee || 'unassigned';
    
    // SLA (simulated)
    const elapsed = Math.floor((Date.now() - new Date(alert.time_window.start).getTime()) / 1000 / 60);
    const remaining = Math.max(0, 240 - elapsed); // 4 hour SLA
    document.getElementById('sla-chip').textContent = 
        `SLA: ${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`;
    
    // Summary panel
    document.getElementById('panel-summary').innerHTML = `
        <div class="drawer-section">
            <h4>Alert Details</h4>
            <div style="margin-bottom: var(--space-sm);">
                <strong>${escapeHtml(alert.name)}</strong>
            </div>
            <div style="display: flex; gap: var(--space-xs); margin-bottom: var(--space-sm);">
                <span class="badge ${alert.severity}">${alert.severity}</span>
                <span class="badge">${alert.confidence}</span>
            </div>
        </div>
        
        <div class="drawer-section">
            <h4>Entity</h4>
            <div style="display: flex; gap: var(--space-xs); align-items: center;">
                <code>${escapeHtml(alert.entity.user)}</code>
                <button class="copy-btn" onclick="copyText('${escapeHtml(alert.entity.user)}')">Copy</button>
            </div>
        </div>
        
        <div class="drawer-section">
            <h4>Hypothesis</h4>
            <p style="color: var(--text-secondary); font-size: 0.875rem;">
                ${escapeHtml(alert.hypothesis)}
            </p>
        </div>
    `;
    
    // Evidence panel
    document.getElementById('panel-evidence').innerHTML = `
        <div class="drawer-section">
            <h4>Evidence Event IDs (${alert.evidence.length})</h4>
            <div class="evidence-list">
                ${alert.evidence.slice(0, 20).map(id => 
                    `<div class="evidence-item">${id}</div>`
                ).join('')}
                ${alert.evidence.length > 20 ? `<div class="evidence-item">+ ${alert.evidence.length - 20} more</div>` : ''}
            </div>
            <button class="copy-btn" style="margin-top: var(--space-sm);" 
                    onclick="copyText('${alert.evidence.join('\\n')}')">
                Copy All IDs
            </button>
        </div>
    `;
    
    // MITRE panel
    document.getElementById('panel-mitre').innerHTML = `
        <div class="drawer-section">
            <h4>Techniques Used</h4>
            ${alert.mitre.map(t => `
                <div class="risk-factor">
                    <div class="mitre-id">${t.id}</div>
                    <div class="mitre-name">${escapeHtml(t.name)}</div>
                    <div class="mitre-tactic">${escapeHtml(t.tactic)}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Response panel
    document.getElementById('panel-response').innerHTML = `
        <div class="drawer-section">
            <h4>Recommended Actions</h4>
            <ul class="action-list">
                ${alert.recommended_actions.map(action => 
                    `<li class="action-item">${escapeHtml(action)}</li>`
                ).join('')}
            </ul>
            <button class="copy-btn" style="margin-top: var(--space-sm);" 
                    onclick="copyText('${alert.recommended_actions.join('\\n')}')">
                Copy All Actions
            </button>
        </div>
        
        <div class="drawer-section">
            <button class="playbook-btn" onclick="simulatePlaybook()">
                Simulate Playbook Run
            </button>
        </div>
    `;
    
    // Load war room
    renderWarRoom();
    
    // Open drawer
    document.getElementById('drawer-overlay').classList.add('active');
    document.getElementById('case-drawer').classList.add('active');
}

function closeCaseDrawer() {
    document.getElementById('drawer-overlay').classList.remove('active');
    document.getElementById('case-drawer').classList.remove('active');
    state.selectedAlert = null;
}

// ===== Case State Management =====
function getCaseState(alertId) {
    const key = `case_${alertId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
}

function updateCaseState(alertId, updates) {
    const key = `case_${alertId}`;
    const current = getCaseState(alertId);
    localStorage.setItem(key, JSON.stringify({ ...current, ...updates, updated: Date.now() }));
}

function generateCaseId(alertId) {
    const hash = alertId.split('-')[0].toUpperCase();
    const year = new Date().getFullYear();
    return `CASE-${year}-${hash}`;
}

// ===== War Room =====
function renderWarRoom() {
    if (!state.selectedAlert) return;
    
    const activities = getActivities(state.selectedAlert.alert_id);
    
    document.getElementById('activity-feed').innerHTML = activities.length > 0
        ? activities.map(act => `
            <div class="activity-item">
                <div class="activity-time">${new Date(act.time).toLocaleTimeString()}</div>
                <div>${escapeHtml(act.message)}</div>
            </div>
        `).join('')
        : '<div class="empty-state" style="padding: var(--space-md);">No activity yet</div>';
}

function getActivities(alertId) {
    const key = `activities_${alertId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function logActivity(message) {
    if (!state.selectedAlert) return;
    
    const key = `activities_${state.selectedAlert.alert_id}`;
    const activities = getActivities(state.selectedAlert.alert_id);
    
    activities.push({
        time: Date.now(),
        message: message
    });
    
    localStorage.setItem(key, JSON.stringify(activities));
    renderWarRoom();
}

function simulatePlaybook() {
    logActivity('Playbook executed: Account Compromise Response');
    logActivity('- Sessions revoked');
    logActivity('- Password reset initiated');
    logActivity('- Mailbox rules reviewed');
    showToast('Playbook simulated', 'success');
}

// ===== Utilities =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard', 'success');
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showEmptyState(message) {
    document.querySelector('.content-area').innerHTML = 
        `<div class="empty-state"><h2>No Data Available</h2><p>${message}</p></div>`;
}

// Expose functions to global scope
window.openCaseDrawer = openCaseDrawer;
window.closeCaseDrawer = closeCaseDrawer;
window.copyText = copyText;
window.simulatePlaybook = simulatePlaybook;
window.filterByMITRE = filterByMITRE;
