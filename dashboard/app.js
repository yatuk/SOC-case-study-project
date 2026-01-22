// ===== State Management =====
const state = {
    // Data
    cases: [],
    alerts: [],
    events: [],
    entities: null,
    iocs: [],
    mitre: null,
    playbooks: [],
    kpiTimeseries: null,
    summary: null,
    riskScores: null,
    
    // UI State
    currentView: 'cases',
    selectedCase: null,
    selectedAlert: null,
    commandPaletteOpen: false,
    
    // Filters
    filters: {
        severity: 'all',
        status: 'all',
        search: ''
    }
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCommandBar();
    initCommandPalette();
    initDrawer();
    loadAllData();
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
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    // Render view
    renderView(viewName);
}

// ===== Command Bar =====
function initCommandBar() {
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const btn = document.getElementById('refresh-btn');
        btn.classList.add('refreshing');
        loadAllData().finally(() => {
            btn.classList.remove('refreshing');
        });
    });
    
    document.getElementById('export-btn').addEventListener('click', exportData);
    
    document.getElementById('global-search').addEventListener('click', () => {
        openCommandPalette();
    });
}

function exportData() {
    const data = {
        cases: state.cases,
        alerts: state.alerts,
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

// ===== Command Palette =====
function initCommandPalette() {
    const overlay = document.getElementById('command-palette-overlay');
    const input = document.getElementById('command-input');
    
    // Ctrl+K to open
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openCommandPalette();
        }
        
        if (e.key === 'Escape' && state.commandPaletteOpen) {
            closeCommandPalette();
        }
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeCommandPalette();
    });
    
    input.addEventListener('input', handleCommandSearch);
}

function openCommandPalette() {
    state.commandPaletteOpen = true;
    document.getElementById('command-palette-overlay').classList.add('active');
    document.getElementById('command-input').focus();
    renderCommandResults();
}

function closeCommandPalette() {
    state.commandPaletteOpen = false;
    document.getElementById('command-palette-overlay').classList.remove('active');
    document.getElementById('command-input').value = '';
}

function handleCommandSearch(e) {
    const query = e.target.value.toLowerCase();
    renderCommandResults(query);
}

function renderCommandResults(query = '') {
    const results = document.getElementById('command-results');
    
    const commands = [
        { icon: '🏠', label: 'Go to Overview', action: () => switchView('overview') },
        { icon: '📋', label: 'Go to Cases', action: () => switchView('cases') },
        { icon: '⚠️', label: 'Go to Alerts', action: () => switchView('alerts') },
        { icon: '👥', label: 'Go to Entities', action: () => switchView('entities') },
        { icon: '🔍', label: 'Go to Intelligence', action: () => switchView('intelligence') },
        { icon: '⏱️', label: 'Go to Timeline', action: () => switchView('timeline') },
        { icon: '🎯', label: 'Go to MITRE', action: () => switchView('mitre') },
        { icon: '🤖', label: 'Go to Automations', action: () => switchView('automations') },
        { icon: '📥', label: 'Export Data', action: exportData },
        { icon: '🔄', label: 'Refresh Data', action: () => loadAllData() }
    ];
    
    // Add case searches
    state.cases.forEach(c => {
        commands.push({
            icon: '📄',
            label: `Open ${c.case_id}`,
            desc: c.title,
            action: () => openCase(c.case_id)
        });
    });
    
    const filtered = query
        ? commands.filter(c => c.label.toLowerCase().includes(query) || (c.desc && c.desc.toLowerCase().includes(query)))
        : commands;
    
    results.innerHTML = filtered.slice(0, 10).map((cmd, i) => `
        <div class="command-item${i === 0 ? ' selected' : ''}" data-action="${i}">
            <span class="command-item-icon">${cmd.icon}</span>
            <div class="command-item-text">
                <div class="command-item-label">${cmd.label}</div>
                ${cmd.desc ? `<div class="command-item-desc">${cmd.desc}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    document.querySelectorAll('.command-item').forEach((item, i) => {
        item.addEventListener('click', () => {
            filtered[i].action();
            closeCommandPalette();
        });
    });
}

// ===== Data Loading =====
async function loadAllData() {
    showLoading();
    
    try {
        const [
            casesRes, alertsRes, eventsRes, entitiesRes,
            iocsRes, mitreRes, playbooksRes, kpiRes,
            summaryRes, riskRes
        ] = await Promise.all([
            fetch('./dashboard_data/cases.json'),
            fetch('./dashboard_data/alerts.jsonl'),
            fetch('./dashboard_data/events.jsonl'),
            fetch('./dashboard_data/entities.json'),
            fetch('./dashboard_data/iocs.json'),
            fetch('./dashboard_data/mitre_coverage.json'),
            fetch('./dashboard_data/playbook_runs.jsonl'),
            fetch('./dashboard_data/kpi_timeseries.json'),
            fetch('./dashboard_data/summary.json'),
            fetch('./dashboard_data/risk_scores.json')
        ]);
        
        if (!casesRes.ok) throw new Error('Data not found');
        
        // Parse all data
        const casesData = await casesRes.json();
        state.cases = casesData.cases || [];
        
        state.alerts = await parseJSONL(alertsRes);
        state.events = await parseJSONL(eventsRes);
        
        state.entities = await entitiesRes.json();
        state.iocs = (await iocsRes.json()).iocs || [];
        state.mitre = await mitreRes.json();
        state.playbooks = await parseJSONL(playbooksRes);
        state.kpiTimeseries = await kpiRes.json();
        state.summary = await summaryRes.json();
        state.riskScores = await riskRes.json();
        
        updateStatus('healthy', 'Data OK');
        updateLastLoaded();
        updateActiveCasesBadge();
        hideLoading();
        renderView(state.currentView);
        
    } catch (error) {
        console.error('Failed to load data:', error);
        updateStatus('error', 'Data Missing');
        hideLoading();
        showEmptyState('Run python run_pipeline.py and commit dashboard_data/');
    }
}

async function parseJSONL(response) {
    if (!response.ok) return [];
    const text = await response.text();
    return text.trim().split('\n')
        .map(line => {
            try { return JSON.parse(line); }
            catch { return null; }
        })
        .filter(Boolean);
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

function updateActiveCasesBadge() {
    const activeCases = state.cases.filter(c => c.status !== 'closed').length;
    document.getElementById('active-cases-badge').textContent = activeCases;
}

function showLoading() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('view-container').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('view-container').style.display = 'block';
}

// ===== View Rendering =====
function renderView(viewName) {
    const container = document.getElementById('view-container');
    
    switch(viewName) {
        case 'overview':
            renderOverview(container);
            break;
        case 'cases':
            renderCases(container);
            break;
        case 'alerts':
            renderAlerts(container);
            break;
        case 'entities':
            renderEntities(container);
            break;
        case 'intelligence':
            renderIntelligence(container);
            break;
        case 'timeline':
            renderTimeline(container);
            break;
        case 'mitre':
            renderMITRE(container);
            break;
        case 'automations':
            renderAutomations(container);
            break;
    }
}

// ===== Overview View =====
function renderOverview(container) {
    const metrics = state.summary?.metrics || {};
    const highSev = (metrics.alerts_by_severity?.critical || 0) + (metrics.alerts_by_severity?.high || 0);
    
    container.innerHTML = `
        <h1 class="view-title">Security Overview</h1>
        
        <div class="card-grid">
            <div class="card">
                <div class="card-label">Active Cases</div>
                <div class="card-value">${state.cases.filter(c => c.status !== 'closed').length}</div>
                <div class="card-change">of ${state.cases.length} total</div>
            </div>
            <div class="card">
                <div class="card-label">Total Alerts</div>
                <div class="card-value">${state.alerts.length}</div>
                <div class="card-change">${metrics.total_events_analyzed || 0} events analyzed</div>
            </div>
            <div class="card">
                <div class="card-label">High Severity</div>
                <div class="card-value" style="color: var(--critical);">${highSev}</div>
                <div class="card-change">require immediate action</div>
            </div>
            <div class="card">
                <div class="card-label">Entities at Risk</div>
                <div class="card-value">${Object.keys(state.entities?.users || {}).length}</div>
                <div class="card-change">${metrics.affected_users || 0} affected users</div>
            </div>
        </div>
        
        <h2 style="margin-bottom: var(--space-4); font-size: var(--text-xl);">Recent Activity</h2>
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Case ID</th>
                        <th>Title</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Alerts</th>
                        <th>Updated</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.cases.slice(0, 5).map(c => `
                        <tr onclick="openCase('${c.case_id}')">
                            <td><code>${c.case_id}</code></td>
                            <td>${escapeHtml(c.title)}</td>
                            <td><span class="badge ${c.severity}">${c.severity}</span></td>
                            <td>${c.status}</td>
                            <td>${c.alert_count}</td>
                            <td>${formatRelativeTime(c.updated_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== Cases View =====
function renderCases(container) {
    const filtered = state.cases.filter(c => {
        if (state.filters.status !== 'all' && c.status !== state.filters.status) return false;
        if (state.filters.severity !== 'all' && c.severity !== state.filters.severity) return false;
        if (state.filters.search && !JSON.stringify(c).toLowerCase().includes(state.filters.search)) return false;
        return true;
    });
    
    container.innerHTML = `
        <div class="view-header">
            <h1 class="view-title">Incident Cases</h1>
            <div style="display: flex; gap: var(--space-2);">
                <select id="status-filter" class="btn-secondary">
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="investigating">Investigating</option>
                    <option value="contained">Contained</option>
                    <option value="closed">Closed</option>
                </select>
                <select id="severity-filter-cases" class="btn-secondary">
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>
        </div>
        
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Case ID</th>
                        <th>Title</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Owner</th>
                        <th>Affected Users</th>
                        <th>Alerts</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(c => `
                        <tr onclick="openCase('${c.case_id}')">
                            <td><code>${c.case_id}</code></td>
                            <td>${escapeHtml(c.title)}</td>
                            <td><span class="badge ${c.severity}">${c.severity}</span></td>
                            <td>${c.status}</td>
                            <td>${c.owner}</td>
                            <td>${c.affected_users.join(', ')}</td>
                            <td>${c.alert_count}</td>
                            <td>${formatRelativeTime(c.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    // Attach filter handlers
    document.getElementById('status-filter').addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        renderView('cases');
    });
    
    document.getElementById('severity-filter-cases').addEventListener('change', (e) => {
        state.filters.severity = e.target.value;
        renderView('cases');
    });
}

// ===== Alerts View =====
function renderAlerts(container) {
    // Group alerts by case
    const alertsByCase = {};
    state.alerts.forEach(alert => {
        // Find which case this alert belongs to based on user/timing
        const matchingCase = state.cases.find(c => 
            c.affected_users.includes(alert.entity.user)
        );
        
        const caseId = matchingCase ? matchingCase.case_id : 'UNCATEGORIZED';
        if (!alertsByCase[caseId]) {
            alertsByCase[caseId] = [];
        }
        alertsByCase[caseId].push(alert);
    });
    
    container.innerHTML = `
        <h1 class="view-title">Security Alerts</h1>
        
        ${Object.entries(alertsByCase).map(([caseId, alerts]) => {
            const caseData = state.cases.find(c => c.case_id === caseId);
            return `
                <div style="margin-bottom: var(--space-8);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
                        <h2 style="font-size: var(--text-xl);">
                            ${caseData ? `${caseData.case_id} — ${caseData.title}` : 'Uncategorized Alerts'}
                        </h2>
                        ${caseData ? `<span class="badge ${caseData.severity}">${caseData.severity}</span>` : ''}
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Alert</th>
                                    <th>Severity</th>
                                    <th>Entity</th>
                                    <th>Evidence</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${alerts.map(alert => `
                                    <tr onclick="openAlertDrawer('${alert.alert_id}', '${caseId}')">
                                        <td>
                                            <div style="font-weight: 600;">${escapeHtml(alert.name)}</div>
                                            <div style="font-size: var(--text-xs); color: var(--text-muted);">${alert.alert_id}</div>
                                        </td>
                                        <td>
                                            <span class="badge ${alert.severity}">${alert.severity}</span>
                                            <span class="badge">${alert.confidence}</span>
                                        </td>
                                        <td>
                                            <div class="chip" onclick="event.stopPropagation(); pivotToEntity('${alert.entity.user}')">${alert.entity.user}</div>
                                        </td>
                                        <td>${alert.evidence.length} events</td>
                                        <td>${alert.recommended_actions.length} actions</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// ===== Entities View =====
function renderEntities(container) {
    const users = state.entities?.users || {};
    
    container.innerHTML = `
        <h1 class="view-title">Entity Risk Profiles</h1>
        
        <div class="card-grid">
            ${Object.entries(users).map(([email, data]) => `
                <div class="card" onclick="viewEntityProfile('${email}')">
                    <div style="margin-bottom: var(--space-4);">
                        <div style="font-weight: 600; margin-bottom: var(--space-2);">${email}</div>
                        <span class="badge ${getRiskSeverity(data.risk_score)}">Risk: ${data.risk_score}</span>
                    </div>
                    <div style="font-size: var(--text-sm); color: var(--text-secondary);">
                        <div>${data.event_count} events</div>
                        <div>${data.alert_count} alerts</div>
                        <div>${data.ips.length} unique IPs</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== Intelligence View =====
function renderIntelligence(container) {
    container.innerHTML = `
        <div class="view-header">
            <h1 class="view-title">Threat Intelligence</h1>
            <button class="btn-primary" onclick="exportIOCs()">Export IOCs</button>
        </div>
        
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Indicator</th>
                        <th>Tags</th>
                        <th>Linked Cases</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.iocs.map(ioc => `
                        <tr>
                            <td><span class="badge">${ioc.type}</span></td>
                            <td><code>${ioc.value}</code></td>
                            <td>${ioc.tags.map(t => `<span class="chip">${t}</span>`).join(' ')}</td>
                            <td>—</td>
                            <td><button class="btn-secondary" onclick="copyText('${ioc.value}')">Copy</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== Timeline View =====
function renderTimeline(container) {
    const recentEvents = state.events.slice(0, 50);
    
    container.innerHTML = `
        <h1 class="view-title">Event Timeline</h1>
        
        <div style="background: var(--bg-secondary); padding: var(--space-6); border-radius: var(--radius-lg); border: 1px solid var(--border-primary);">
            ${recentEvents.map(event => `
                <div style="padding: var(--space-4); border-left: 2px solid var(--brand-primary); margin-bottom: var(--space-4); background: var(--bg-tertiary); border-radius: var(--radius-md);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-2);">
                        <div style="font-weight: 600;">${event.event_type}</div>
                        <div style="font-size: var(--text-xs); color: var(--text-muted); font-family: var(--font-mono);">${formatDateTime(event.timestamp)}</div>
                    </div>
                    <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2);">
                        ${escapeHtml(event.description || event.raw_summary)}
                    </div>
                    <div style="display: flex; gap: var(--space-2);">
                        <span class="chip">${event.source}</span>
                        ${event.user ? `<span class="chip">${event.user}</span>` : ''}
                        ${event.src_ip && event.src_ip !== '10.0.0.0' ? `<span class="chip">${event.src_ip}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== MITRE View =====
function renderMITRE(container) {
    const techniques = state.mitre?.techniques || [];
    
    container.innerHTML = `
        <h1 class="view-title">MITRE ATT&CK Coverage</h1>
        
        <div class="card-grid">
            ${techniques.map(tech => `
                <div class="card">
                    <div style="font-family: var(--font-mono); color: var(--brand-primary); font-weight: 600; margin-bottom: var(--space-2);">
                        ${tech.id}
                    </div>
                    <div style="font-weight: 600; margin-bottom: var(--space-2);">
                        ${escapeHtml(tech.name)}
                    </div>
                    <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-2);">
                        ${tech.tactic}
                    </div>
                    <div style="font-size: var(--text-sm);">
                        <span class="badge">${tech.count} observations</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ===== Automations View =====
function renderAutomations(container) {
    container.innerHTML = `
        <h1 class="view-title">Playbook Automations</h1>
        
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Playbook</th>
                        <th>Case</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Actions</th>
                        <th>Executed</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.playbooks.map(pb => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${escapeHtml(pb.name)}</div>
                                <div style="font-size: var(--text-xs); color: var(--text-muted);">${pb.playbook_id}</div>
                            </td>
                            <td>${pb.case_id ? `<code>${pb.case_id}</code>` : '—'}</td>
                            <td><span class="badge ${pb.status === 'completed' ? 'low' : 'medium'}">${pb.status}</span></td>
                            <td>${pb.duration_seconds}s</td>
                            <td>${pb.actions_taken.length} actions</td>
                            <td>${formatRelativeTime(pb.started_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ===== Case Drawer =====
function initDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    const close = document.getElementById('drawer-close');
    
    overlay.addEventListener('click', closeDrawer);
    close.addEventListener('click', closeDrawer);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
    
    document.getElementById('add-note-btn').addEventListener('click', addNote);
}

function openCase(caseId) {
    const caseData = state.cases.find(c => c.case_id === caseId);
    if (!caseData) return;
    
    state.selectedCase = caseData;
    
    // Populate drawer
    document.getElementById('drawer-case-id').textContent = caseData.case_id;
    document.getElementById('drawer-meta').innerHTML = `
        <span class="badge ${caseData.severity}">${caseData.severity}</span>
        <span class="badge">${caseData.status}</span>
        <span style="font-size: var(--text-sm); color: var(--text-secondary);">Owner: ${caseData.owner}</span>
    `;
    
    // Tabs
    document.getElementById('drawer-tabs').innerHTML = `
        <button class="drawer-tab active" data-tab="summary">Summary</button>
        <button class="drawer-tab" data-tab="alerts">Alerts</button>
        <button class="drawer-tab" data-tab="entities">Entities</button>
        <button class="drawer-tab" data-tab="mitre">MITRE</button>
    `;
    
    // Tab handlers
    document.querySelectorAll('.drawer-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderCaseTab(tab.dataset.tab, caseData);
        });
    });
    
    renderCaseTab('summary', caseData);
    renderWarRoom(caseId);
    
    // Open drawer
    document.getElementById('drawer-overlay').classList.add('active');
    document.getElementById('case-drawer').classList.add('active');
}

function renderCaseTab(tabName, caseData) {
    const content = document.getElementById('drawer-content');
    
    switch(tabName) {
        case 'summary':
            content.innerHTML = `
                <div class="drawer-section">
                    <h4>Title</h4>
                    <p>${escapeHtml(caseData.title)}</p>
                </div>
                <div class="drawer-section">
                    <h4>Narrative</h4>
                    <p style="line-height: 1.6;">${escapeHtml(caseData.narrative)}</p>
                </div>
                <div class="drawer-section">
                    <h4>Affected Assets</h4>
                    ${caseData.impacted_assets.map(asset => `<span class="chip">${asset}</span>`).join(' ')}
                </div>
                <div class="drawer-section">
                    <h4>Timeline</h4>
                    <div style="font-size: var(--text-sm); color: var(--text-secondary);">
                        <div>Created: ${formatDateTime(caseData.created_at)}</div>
                        <div>Updated: ${formatDateTime(caseData.updated_at)}</div>
                    </div>
                </div>
            `;
            break;
        case 'alerts':
            const caseAlerts = state.alerts.filter(a => caseData.affected_users.includes(a.entity.user));
            content.innerHTML = `
                <div class="drawer-section">
                    <h4>Associated Alerts (${caseAlerts.length})</h4>
                    ${caseAlerts.map(alert => `
                        <div style="padding: var(--space-3); background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: var(--space-2);">
                            <div style="font-weight: 600; margin-bottom: var(--space-2);">${escapeHtml(alert.name)}</div>
                            <span class="badge ${alert.severity}">${alert.severity}</span>
                            <span class="badge">${alert.confidence}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
        case 'entities':
            content.innerHTML = `
                <div class="drawer-section">
                    <h4>Affected Users</h4>
                    ${caseData.affected_users.map(user => `
                        <div class="chip" style="cursor: pointer;" onclick="pivotToEntity('${user}')">${user}</div>
                    `).join(' ')}
                </div>
            `;
            break;
        case 'mitre':
            content.innerHTML = `
                <div class="drawer-section">
                    <h4>MITRE Techniques</h4>
                    ${caseData.mitre_techniques.map(tech => {
                        const details = state.mitre?.techniques.find(t => t.id === tech);
                        return `
                            <div style="padding: var(--space-3); background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: var(--space-2);">
                                <div style="font-family: var(--font-mono); color: var(--brand-primary); font-weight: 600;">${tech}</div>
                                ${details ? `<div style="font-size: var(--text-sm); color: var(--text-secondary);">${details.name}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            break;
    }
}

function renderWarRoom(caseId) {
    const activities = getActivities(caseId);
    const feed = document.getElementById('activity-feed');
    
    feed.innerHTML = activities.length > 0
        ? activities.map(act => `
            <div class="activity-item">
                <div class="activity-time">${formatDateTime(act.timestamp)}</div>
                <div>${escapeHtml(act.message)}</div>
            </div>
        `).join('')
        : '<div class="empty-state" style="padding: var(--space-4);">No activity yet</div>';
}

function addNote() {
    if (!state.selectedCase) return;
    
    const textarea = document.getElementById('note-textarea');
    const note = textarea.value.trim();
    
    if (!note) return;
    
    logActivity(state.selectedCase.case_id, `Note: ${note}`);
    textarea.value = '';
    showToast('Note added', 'success');
}

function logActivity(caseId, message) {
    const key = `activities_${caseId}`;
    const activities = JSON.parse(localStorage.getItem(key) || '[]');
    
    activities.push({
        timestamp: new Date().toISOString(),
        message: message
    });
    
    localStorage.setItem(key, JSON.stringify(activities));
    renderWarRoom(caseId);
}

function getActivities(caseId) {
    const key = `activities_${caseId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

function closeDrawer() {
    document.getElementById('drawer-overlay').classList.remove('active');
    document.getElementById('case-drawer').classList.remove('active');
    state.selectedCase = null;
}

// ===== Helper Functions =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}

function formatRelativeTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
}

function getRiskSeverity(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
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
    
    setTimeout(() => toast.remove(), 3000);
}

function showEmptyState(message) {
    document.getElementById('view-container').innerHTML = 
        `<div class="empty-state"><h2>No Data Available</h2><p>${message}</p></div>`;
}

function pivotToEntity(email) {
    state.currentView = 'entities';
    switchView('entities');
    showToast(`Pivoted to ${email}`, 'info');
}

function exportIOCs() {
    const csv = 'type,indicator,tags\n' + state.iocs.map(i => 
        `${i.type},${i.value},${i.tags.join(';')}`
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iocs.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('IOCs exported', 'success');
}

function openAlertDrawer(alertId, caseId) {
    openCase(caseId);
}

function viewEntityProfile(email) {
    showToast(`Viewing profile for ${email}`, 'info');
}

// Expose functions globally
window.openCase = openCase;
window.closeDrawer = closeDrawer;
window.copyText = copyText;
window.pivotToEntity = pivotToEntity;
window.exportIOCs = exportIOCs;
window.viewEntityProfile = viewEntityProfile;
