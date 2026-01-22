// ============================================
// SOC Platform - Main Application
// ============================================

const App = {
    // State
    state: {
        view: 'overview',
        data: {
            events: [],
            alerts: [],
            cases: [],
            iocs: [],
            devices: [],
            entities: null,
            mitre: null,
            playbooks: [],
            kpi: null,
            summary: null,
            risk: null,
            correlations: null
        },
        filters: {
            severity: 'all',
            status: 'all',
            search: ''
        },
        drawer: {
            open: false,
            type: null,
            id: null,
            tab: 'summary'
        },
        cmdPalette: false,
        density: 'comfortable'
    },

    // Initialize
    init() {
        this.bindEvents();
        this.loadData();
        this.initKeyboardShortcuts();
    },

    // Event Binding
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(item.dataset.view);
            });
        });

        // Search box
        document.getElementById('search-box').addEventListener('click', () => this.openCmdPalette());
        document.getElementById('global-search').addEventListener('click', () => this.openCmdPalette());

        // Command bar buttons
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());

        // Density toggle
        document.getElementById('density-toggle').addEventListener('click', () => this.toggleDensity());

        // Drawer
        document.getElementById('drawer-overlay').addEventListener('click', () => this.closeDrawer());
        document.getElementById('drawer-close').addEventListener('click', () => this.closeDrawer());

        // Command Palette
        document.getElementById('cmd-palette').addEventListener('click', (e) => {
            if (e.target.id === 'cmd-palette') this.closeCmdPalette();
        });
        document.getElementById('cmd-input').addEventListener('input', (e) => this.handleCmdSearch(e.target.value));
    },

    // Keyboard Shortcuts
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K - Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openCmdPalette();
            }
            // Escape
            if (e.key === 'Escape') {
                if (this.state.cmdPalette) this.closeCmdPalette();
                else if (this.state.drawer.open) this.closeDrawer();
            }
        });
    },

    // Data Loading
    async loadData() {
        this.showSkeleton();
        
        try {
            const files = [
                ['events', 'events.jsonl', true],
                ['alerts', 'alerts.jsonl', true],
                ['cases', 'cases.json', false],
                ['iocs', 'iocs.json', false],
                ['devices', 'edr_devices.json', false],
                ['entities', 'entities.json', false],
                ['mitre', 'mitre_coverage.json', false],
                ['playbooks', 'playbook_runs.jsonl', true],
                ['kpi', 'kpi_timeseries.json', false],
                ['summary', 'summary.json', false],
                ['risk', 'risk_scores.json', false],
                ['correlations', 'correlations.json', false]
            ];

            await Promise.all(files.map(async ([key, file, isJsonl]) => {
                try {
                    const res = await fetch(`./dashboard_data/${file}`);
                    if (!res.ok) return;
                    
                    if (isJsonl) {
                        const text = await res.text();
                        this.state.data[key] = text.trim().split('\n')
                            .map(line => { try { return JSON.parse(line); } catch { return null; }})
                            .filter(Boolean);
                    } else {
                        const json = await res.json();
                        this.state.data[key] = json[key] || json.cases || json.iocs || json.devices || json;
                    }
                } catch (err) {
                    console.warn(`Failed to load ${file}:`, err);
                }
            }));

            this.updateStatus('ok', 'Data OK');
            this.updateBadges();
            this.hideSkeleton();
            this.renderView();
            this.updateLastLoaded();

        } catch (err) {
            console.error('Data load failed:', err);
            this.updateStatus('error', 'Load Failed');
            this.hideSkeleton();
            this.showEmptyState('Failed to load data. Run: python run_pipeline.py');
        }
    },

    async refreshData() {
        const btn = document.getElementById('refresh-btn');
        btn.classList.add('spinning');
        await this.loadData();
        btn.classList.remove('spinning');
        this.toast('Data refreshed', 'success');
    },

    // View Switching
    switchView(view) {
        this.state.view = view;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        this.renderView();
    },

    renderView() {
        const container = document.getElementById('view-container');
        const renderers = {
            overview: () => this.renderOverview(),
            cases: () => this.renderCases(),
            alerts: () => this.renderAlerts(),
            search: () => this.renderSearch(),
            entities: () => this.renderEntities(),
            edr: () => this.renderEDR(),
            timeline: () => this.renderTimeline(),
            mitre: () => this.renderMITRE(),
            intel: () => this.renderIntel(),
            automations: () => this.renderAutomations(),
            reports: () => this.renderReports()
        };

        container.innerHTML = renderers[this.state.view]?.() || '<div class="empty-state">View not found</div>';
        container.style.animation = 'none';
        container.offsetHeight; // Trigger reflow
        container.style.animation = null;
    },

    // ============================================
    // VIEW RENDERERS
    // ============================================

    renderOverview() {
        const s = this.state.data.summary?.metrics || {};
        const activeCases = this.state.data.cases?.filter(c => c.status !== 'closed').length || 0;
        const criticalAlerts = this.state.data.alerts?.filter(a => a.severity === 'critical').length || 0;
        
        return `
            <h1 class="view-title">Security Overview</h1>
            
            <div class="card-grid">
                <div class="card card-clickable" onclick="App.switchView('cases')">
                    <div class="card-label">Active Cases</div>
                    <div class="card-value">${activeCases}</div>
                    <div class="card-meta">${this.state.data.cases?.length || 0} total cases</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('alerts')">
                    <div class="card-label">Total Alerts</div>
                    <div class="card-value">${this.state.data.alerts?.length || 0}</div>
                    <div class="card-meta">${criticalAlerts} critical</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('search')">
                    <div class="card-label">Events Analyzed</div>
                    <div class="card-value">${this.state.data.events?.length || 0}</div>
                    <div class="card-meta">Last 14 days</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('edr')">
                    <div class="card-label">Monitored Devices</div>
                    <div class="card-value">${this.state.data.devices?.length || 0}</div>
                    <div class="card-meta">${s.affected_devices || 0} affected</div>
                </div>
            </div>

            <h2 class="section-title">Recent Cases</h2>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Case ID</th>
                            <th>Title</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Users</th>
                            <th>Alerts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(this.state.data.cases || []).slice(0, 5).map(c => `
                            <tr onclick="App.openDrawer('case', '${c.case_id}')">
                                <td class="mono">${c.case_id}</td>
                                <td>${this.escape(c.title)}</td>
                                <td><span class="badge ${c.severity}">${c.severity}</span></td>
                                <td>${c.status}</td>
                                <td>${c.affected_users?.length || 0}</td>
                                <td>${c.alert_ids?.length || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <h2 class="section-title" style="margin-top: var(--space-6);">Recent Alerts</h2>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Alert</th>
                            <th>Severity</th>
                            <th>Entity</th>
                            <th>MITRE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(this.state.data.alerts || []).slice(0, 5).map(a => `
                            <tr onclick="App.openDrawer('alert', '${a.alert_id}')">
                                <td>
                                    <div>${this.escape(a.name)}</div>
                                    <div class="muted mono" style="font-size: var(--text-xs)">${a.alert_id}</div>
                                </td>
                                <td><span class="badge ${a.severity}">${a.severity}</span></td>
                                <td class="chip" onclick="event.stopPropagation(); App.pivotEntity('${a.entity?.user}')">${a.entity?.user || '—'}</td>
                                <td>${a.mitre?.map(m => `<span class="badge info">${m.id}</span>`).join(' ') || '—'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderCases() {
        const cases = this.state.data.cases || [];
        
        return `
            <div class="view-header">
                <h1 class="view-title" style="margin-bottom:0">Cases</h1>
                <div class="flex gap-2">
                    <select class="select select-sm" onchange="App.state.filters.status = this.value; App.renderView()">
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="investigating">Investigating</option>
                        <option value="contained">Contained</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select class="select select-sm" onchange="App.state.filters.severity = this.value; App.renderView()">
                        <option value="all">All Severity</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
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
                            <th>Users</th>
                            <th>Devices</th>
                            <th>Alerts</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filterCases(cases).map(c => `
                            <tr onclick="App.openDrawer('case', '${c.case_id}')">
                                <td class="mono">${c.case_id}</td>
                                <td class="truncate" style="max-width:200px">${this.escape(c.title)}</td>
                                <td><span class="badge ${c.severity}${c.severity === 'critical' ? ' pulse' : ''}">${c.severity}</span></td>
                                <td>${c.status}</td>
                                <td>${c.owner || 'unassigned'}</td>
                                <td>${c.affected_users?.length || 0}</td>
                                <td>${c.affected_devices?.length || 0}</td>
                                <td>${c.alert_ids?.length || 0}</td>
                                <td class="mono muted">${this.formatTime(c.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    filterCases(cases) {
        return cases.filter(c => {
            if (this.state.filters.status !== 'all' && c.status !== this.state.filters.status) return false;
            if (this.state.filters.severity !== 'all' && c.severity !== this.state.filters.severity) return false;
            return true;
        });
    },

    renderAlerts() {
        const alerts = this.state.data.alerts || [];
        const grouped = {};
        
        alerts.forEach(a => {
            const caseId = a.case_id || 'Uncategorized';
            if (!grouped[caseId]) grouped[caseId] = [];
            grouped[caseId].push(a);
        });

        return `
            <h1 class="view-title">Alerts</h1>
            
            ${Object.entries(grouped).map(([caseId, caseAlerts]) => {
                const caseData = this.state.data.cases?.find(c => c.case_id === caseId);
                return `
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="section-title" style="margin-bottom:0">
                                ${caseData ? `${caseId} — ${this.escape(caseData.title)}` : caseId}
                            </h2>
                            ${caseData ? `<span class="badge ${caseData.severity}">${caseData.severity}</span>` : ''}
                        </div>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Alert</th>
                                        <th>Severity</th>
                                        <th>Confidence</th>
                                        <th>Entity</th>
                                        <th>Evidence</th>
                                        <th>MITRE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${caseAlerts.map(a => `
                                        <tr onclick="App.openDrawer('alert', '${a.alert_id}')">
                                            <td>
                                                <div>${this.escape(a.name)}</div>
                                                <div class="muted mono" style="font-size:var(--text-xs)">${a.alert_id}</div>
                                            </td>
                                            <td><span class="badge ${a.severity}">${a.severity}</span></td>
                                            <td><span class="badge">${a.confidence}</span></td>
                                            <td>
                                                <span class="chip" onclick="event.stopPropagation(); App.pivotEntity('${a.entity?.user}')">${a.entity?.user?.split('@')[0] || '—'}</span>
                                            </td>
                                            <td>${a.evidence?.length || 0} events</td>
                                            <td>${a.mitre?.slice(0,2).map(m => `<span class="badge info">${m.id}</span>`).join(' ') || '—'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    },

    renderSearch() {
        const events = this.state.data.events?.slice(0, 100) || [];
        
        return `
            <h1 class="view-title">Event Search</h1>
            
            <div class="table-container mb-6">
                <div class="table-toolbar">
                    <input type="text" class="input" placeholder="Search events (e.g., user:sarah source:idp)" 
                           style="width:400px" id="event-search" onkeyup="App.searchEvents(this.value)">
                    <span class="muted">${events.length} events</span>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Source</th>
                            <th>Type</th>
                            <th>User</th>
                            <th>IP</th>
                            <th>Summary</th>
                        </tr>
                    </thead>
                    <tbody id="events-tbody">
                        ${events.slice(0, 50).map(e => `
                            <tr onclick="App.openDrawer('event', '${e.event_id}')">
                                <td class="mono muted" style="font-size:var(--text-xs)">${this.formatTime(e.timestamp)}</td>
                                <td><span class="badge info">${e.source}</span></td>
                                <td>${e.event_type}</td>
                                <td class="chip" onclick="event.stopPropagation(); App.pivotEntity('${e.user}')">${e.user?.split('@')[0] || '—'}</td>
                                <td class="mono">${e.src_ip || '—'}</td>
                                <td class="truncate" style="max-width:300px">${this.escape(e.summary)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    searchEvents(query) {
        const q = query.toLowerCase();
        const events = this.state.data.events || [];
        const filtered = events.filter(e => {
            if (!q) return true;
            const searchable = [e.user, e.source, e.event_type, e.summary, e.src_ip, e.domain].join(' ').toLowerCase();
            return searchable.includes(q);
        }).slice(0, 50);

        document.getElementById('events-tbody').innerHTML = filtered.map(e => `
            <tr onclick="App.openDrawer('event', '${e.event_id}')">
                <td class="mono muted" style="font-size:var(--text-xs)">${this.formatTime(e.timestamp)}</td>
                <td><span class="badge info">${e.source}</span></td>
                <td>${e.event_type}</td>
                <td class="chip" onclick="event.stopPropagation(); App.pivotEntity('${e.user}')">${e.user?.split('@')[0] || '—'}</td>
                <td class="mono">${e.src_ip || '—'}</td>
                <td class="truncate" style="max-width:300px">${this.escape(e.summary)}</td>
            </tr>
        `).join('');
    },

    renderEntities() {
        const users = Object.entries(this.state.data.entities?.users || {});
        const risk = this.state.data.risk?.entity_scores || {};

        return `
            <h1 class="view-title">Entities</h1>
            
            <div class="card-grid">
                ${users.map(([email, data]) => {
                    const score = risk[email]?.score || 0;
                    const severity = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
                    return `
                        <div class="card card-clickable" onclick="App.openDrawer('entity', '${email}')">
                            <div class="flex justify-between items-center mb-4">
                                <div>
                                    <div style="font-weight:600">${data.name || email.split('@')[0]}</div>
                                    <div class="muted" style="font-size:var(--text-xs)">${email}</div>
                                </div>
                                <span class="badge ${severity}">Risk: ${score}</span>
                            </div>
                            <div class="muted" style="font-size:var(--text-sm)">
                                <div>${data.event_count || 0} events</div>
                                <div>${data.devices?.length || 0} devices</div>
                                <div>${data.ips?.length || 0} IPs</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderEDR() {
        const devices = this.state.data.devices || [];

        return `
            <h1 class="view-title">Endpoint Detection & Response</h1>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Hostname</th>
                            <th>OS</th>
                            <th>Owner</th>
                            <th>Last Seen</th>
                            <th>Risk</th>
                            <th>Processes</th>
                            <th>Connections</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devices.map(d => `
                            <tr onclick="App.openDrawer('device', '${d.id}')">
                                <td class="mono">${d.hostname}</td>
                                <td>${d.os}</td>
                                <td class="chip" onclick="event.stopPropagation(); App.pivotEntity('${d.owner}')">${d.owner?.split('@')[0] || '—'}</td>
                                <td class="mono muted">${this.formatTime(d.last_seen)}</td>
                                <td><span class="badge ${d.risk_score >= 50 ? 'high' : 'low'}">${d.risk_score || 0}</span></td>
                                <td>${d.recent_processes?.length || 0}</td>
                                <td>${d.recent_connections?.length || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderTimeline() {
        const events = (this.state.data.events || []).slice(0, 30);

        return `
            <h1 class="view-title">Event Timeline</h1>
            
            <div class="timeline">
                ${events.map(e => {
                    const sev = e.tags?.includes('suspicious') || e.tags?.includes('malicious') ? 'high' : '';
                    return `
                        <div class="timeline-item ${sev}" onclick="App.openDrawer('event', '${e.event_id}')">
                            <div class="timeline-marker"></div>
                            <div class="timeline-time">${this.formatTime(e.timestamp)}</div>
                            <div class="timeline-content">
                                <div class="flex justify-between items-center">
                                    <span class="badge info">${e.source}</span>
                                    <span>${e.event_type}</span>
                                </div>
                                <div style="margin-top:var(--space-2)">${this.escape(e.summary)}</div>
                                <div class="flex gap-2" style="margin-top:var(--space-2)">
                                    ${e.user ? `<span class="chip">${e.user.split('@')[0]}</span>` : ''}
                                    ${e.src_ip ? `<span class="chip">${e.src_ip}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderMITRE() {
        const techniques = this.state.data.mitre?.techniques || [];

        return `
            <h1 class="view-title">MITRE ATT&CK Coverage</h1>
            
            <div class="mitre-grid">
                ${techniques.map(t => `
                    <div class="mitre-cell ${t.count > 0 ? 'active' : ''}" onclick="App.filterByMITRE('${t.id}')">
                        <div class="mitre-id">${t.id}</div>
                        <div class="mitre-name">${this.escape(t.name)}</div>
                        <div class="mitre-tactic">${t.tactic}</div>
                        <div style="margin-top:var(--space-2)">
                            <span class="badge">${t.count} observations</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderIntel() {
        const iocs = this.state.data.iocs || [];

        return `
            <div class="view-header">
                <h1 class="view-title" style="margin-bottom:0">Threat Intelligence</h1>
                <button class="btn btn-secondary btn-sm" onclick="App.exportIOCs()">Export CSV</button>
            </div>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Indicator</th>
                            <th>Tags</th>
                            <th>Confidence</th>
                            <th>Cases</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${iocs.map(i => `
                            <tr>
                                <td><span class="badge">${i.type}</span></td>
                                <td class="mono">${this.escape(i.indicator)}</td>
                                <td>${i.tags?.map(t => `<span class="chip">${t}</span>`).join(' ') || '—'}</td>
                                <td>${i.confidence || 'medium'}</td>
                                <td>${i.cases?.length || 0}</td>
                                <td><button class="btn btn-secondary btn-sm" onclick="App.copyText('${i.indicator}')">Copy</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderAutomations() {
        const playbooks = this.state.data.playbooks || [];

        return `
            <h1 class="view-title">Automations (SOAR)</h1>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Playbook</th>
                            <th>Case</th>
                            <th>Status</th>
                            <th>Duration</th>
                            <th>Actions</th>
                            <th>Started</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playbooks.map(p => `
                            <tr onclick="App.openDrawer('playbook', '${p.run_id}')">
                                <td>
                                    <div>${this.escape(p.playbook_name)}</div>
                                    <div class="muted mono" style="font-size:var(--text-xs)">${p.run_id}</div>
                                </td>
                                <td class="mono">${p.case_id || '—'}</td>
                                <td><span class="badge ${p.status === 'completed' ? 'low' : 'medium'}">${p.status}</span></td>
                                <td>${Math.round((new Date(p.finished_at) - new Date(p.started_at)) / 1000)}s</td>
                                <td>${p.actions_taken?.length || 0}</td>
                                <td class="mono muted">${this.formatTime(p.started_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderReports() {
        return `
            <h1 class="view-title">Reports</h1>
            
            <div class="card-grid">
                <div class="card card-clickable" onclick="App.openReport('executive')">
                    <div class="card-label">Executive Summary</div>
                    <div style="margin-top:var(--space-3);color:var(--text-secondary)">
                        High-level overview for leadership
                    </div>
                </div>
                <div class="card card-clickable" onclick="App.openReport('technical')">
                    <div class="card-label">Technical Analysis</div>
                    <div style="margin-top:var(--space-3);color:var(--text-secondary)">
                        Detailed technical findings
                    </div>
                </div>
            </div>
        `;
    },

    async openReport(type) {
        try {
            const res = await fetch(`./dashboard_data/report_${type}.md`);
            const md = await res.text();
            
            this.openDrawer('report', type);
            document.getElementById('drawer-title').textContent = type === 'executive' ? 'Executive Summary' : 'Technical Analysis';
            document.getElementById('drawer-tabs').innerHTML = '';
            document.getElementById('drawer-content').innerHTML = `
                <div style="line-height:1.8">${this.renderMarkdown(md)}</div>
            `;
        } catch (err) {
            this.toast('Failed to load report', 'error');
        }
    },

    // ============================================
    // DRAWER
    // ============================================

    openDrawer(type, id) {
        this.state.drawer = { open: true, type, id, tab: 'summary' };
        
        document.getElementById('drawer-overlay').classList.add('active');
        document.getElementById('drawer').classList.add('active');
        
        this.renderDrawerContent();
    },

    closeDrawer() {
        this.state.drawer.open = false;
        document.getElementById('drawer-overlay').classList.remove('active');
        document.getElementById('drawer').classList.remove('active');
    },

    renderDrawerContent() {
        const { type, id, tab } = this.state.drawer;
        const titleEl = document.getElementById('drawer-title');
        const tabsEl = document.getElementById('drawer-tabs');
        const contentEl = document.getElementById('drawer-content');
        const footerEl = document.getElementById('drawer-footer');

        if (type === 'case') {
            const c = this.state.data.cases?.find(x => x.case_id === id);
            if (!c) return;

            titleEl.innerHTML = `
                <div>${c.case_id}</div>
                <div class="flex gap-2" style="margin-top:var(--space-2)">
                    <span class="badge ${c.severity}">${c.severity}</span>
                    <span class="badge">${c.status}</span>
                </div>
            `;

            tabsEl.innerHTML = ['Summary', 'Alerts', 'Timeline', 'War Room'].map(t => 
                `<button class="drawer-tab ${tab === t.toLowerCase().replace(' ', '') ? 'active' : ''}" 
                         onclick="App.switchDrawerTab('${t.toLowerCase().replace(' ', '')}')">${t}</button>`
            ).join('');

            if (tab === 'summary') {
                contentEl.innerHTML = `
                    <div class="drawer-section">
                        <h4>Title</h4>
                        <p>${this.escape(c.title)}</p>
                    </div>
                    <div class="drawer-section">
                        <h4>Narrative</h4>
                        <p style="line-height:1.6">${this.escape(c.narrative)}</p>
                    </div>
                    <div class="drawer-section">
                        <h4>Affected Users</h4>
                        ${c.affected_users?.map(u => `<span class="chip">${u}</span>`).join(' ') || '—'}
                    </div>
                    <div class="drawer-section">
                        <h4>MITRE Techniques</h4>
                        ${c.mitre_techniques?.map(t => `<span class="badge info">${t}</span>`).join(' ') || '—'}
                    </div>
                `;
            } else if (tab === 'alerts') {
                const alerts = this.state.data.alerts?.filter(a => c.alert_ids?.includes(a.alert_id)) || [];
                contentEl.innerHTML = `
                    <div class="drawer-section">
                        <h4>Case Alerts (${alerts.length})</h4>
                        ${alerts.map(a => `
                            <div style="padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
                                <div class="flex justify-between">
                                    <strong>${this.escape(a.name)}</strong>
                                    <span class="badge ${a.severity}">${a.severity}</span>
                                </div>
                                <div class="muted" style="margin-top:var(--space-2)">${this.escape(a.hypothesis)}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else if (tab === 'timeline') {
                const events = this.state.data.events?.filter(e => e.case_id === id) || [];
                contentEl.innerHTML = `
                    <div class="timeline">
                        ${events.slice(0, 20).map(e => `
                            <div class="timeline-item">
                                <div class="timeline-marker"></div>
                                <div class="timeline-time">${this.formatTime(e.timestamp)}</div>
                                <div class="timeline-content">
                                    <span class="badge info">${e.source}</span> ${e.event_type}
                                    <div class="muted" style="margin-top:var(--space-1)">${this.escape(e.summary)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else if (tab === 'warroom') {
                const notes = this.getWarRoomNotes(id);
                contentEl.innerHTML = `
                    <div class="war-room">
                        <div class="war-room-feed">
                            ${notes.length ? notes.map(n => `
                                <div class="war-room-item">
                                    <div class="war-room-time">${this.formatTime(n.timestamp)}</div>
                                    <div>${this.escape(n.message)}</div>
                                </div>
                            `).join('') : '<div class="muted">No activity yet</div>'}
                        </div>
                        <div class="war-room-input">
                            <textarea id="war-room-note" placeholder="Add investigation note..."></textarea>
                            <button class="btn btn-primary" onclick="App.addWarRoomNote('${id}')">Add</button>
                        </div>
                    </div>
                `;
            }
        } else if (type === 'alert') {
            const a = this.state.data.alerts?.find(x => x.alert_id === id);
            if (!a) return;

            titleEl.innerHTML = `<div>${a.alert_id}</div>`;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="drawer-section">
                    <h4>Alert</h4>
                    <div style="font-size:var(--text-lg);font-weight:600">${this.escape(a.name)}</div>
                    <div class="flex gap-2" style="margin-top:var(--space-2)">
                        <span class="badge ${a.severity}">${a.severity}</span>
                        <span class="badge">${a.confidence}</span>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Hypothesis</h4>
                    <p>${this.escape(a.hypothesis)}</p>
                </div>
                <div class="drawer-section">
                    <h4>Entity</h4>
                    <span class="chip">${a.entity?.user || '—'}</span>
                </div>
                <div class="drawer-section">
                    <h4>MITRE Techniques</h4>
                    ${a.mitre?.map(m => `
                        <div style="padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
                            <span class="badge info">${m.id}</span>
                            <span style="margin-left:var(--space-2)">${m.name}</span>
                        </div>
                    `).join('') || '—'}
                </div>
                <div class="drawer-section">
                    <h4>Evidence (${a.evidence?.length || 0} events)</h4>
                    <div class="mono muted" style="max-height:200px;overflow-y:auto;font-size:var(--text-xs)">
                        ${a.evidence?.slice(0, 20).join('<br>') || '—'}
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Recommended Actions</h4>
                    <ul style="list-style:none">
                        ${a.recommended_actions?.map(ac => `<li style="padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle)">• ${this.escape(ac)}</li>`).join('') || '—'}
                    </ul>
                    <button class="btn btn-secondary btn-sm" style="margin-top:var(--space-2)" 
                            onclick="App.copyText('${a.recommended_actions?.join('\\n')}')">Copy All</button>
                </div>
            `;
        } else if (type === 'event') {
            const e = this.state.data.events?.find(x => x.event_id === id);
            if (!e) return;

            titleEl.textContent = e.event_id;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="drawer-section">
                    <h4>Event Details</h4>
                    <div style="display:grid;grid-template-columns:100px 1fr;gap:var(--space-2)">
                        <div class="muted">Time</div><div class="mono">${e.timestamp}</div>
                        <div class="muted">Source</div><div><span class="badge info">${e.source}</span></div>
                        <div class="muted">Type</div><div>${e.event_type}</div>
                        <div class="muted">User</div><div class="chip">${e.user || '—'}</div>
                        <div class="muted">IP</div><div class="mono">${e.src_ip || '—'}</div>
                        <div class="muted">Device</div><div class="mono">${e.device_id || '—'}</div>
                        <div class="muted">Domain</div><div class="mono">${e.domain || '—'}</div>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Summary</h4>
                    <p>${this.escape(e.summary)}</p>
                </div>
                <div class="drawer-section">
                    <h4>Tags</h4>
                    ${e.tags?.map(t => `<span class="chip">${t}</span>`).join(' ') || '—'}
                </div>
                <div class="drawer-section">
                    <h4>Raw Event</h4>
                    <pre style="background:var(--bg-elevated);padding:var(--space-3);border-radius:var(--radius-md);overflow-x:auto;font-size:var(--text-xs)">${JSON.stringify(e, null, 2)}</pre>
                </div>
            `;
        } else if (type === 'device') {
            const d = this.state.data.devices?.find(x => x.id === id);
            if (!d) return;

            titleEl.textContent = d.hostname;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="drawer-section">
                    <h4>Device Info</h4>
                    <div style="display:grid;grid-template-columns:100px 1fr;gap:var(--space-2)">
                        <div class="muted">ID</div><div class="mono">${d.id}</div>
                        <div class="muted">OS</div><div>${d.os}</div>
                        <div class="muted">Owner</div><div class="chip">${d.owner || '—'}</div>
                        <div class="muted">Risk</div><div><span class="badge ${d.risk_score >= 50 ? 'high' : 'low'}">${d.risk_score || 0}</span></div>
                        <div class="muted">First Seen</div><div class="mono">${this.formatTime(d.first_seen)}</div>
                        <div class="muted">Last Seen</div><div class="mono">${this.formatTime(d.last_seen)}</div>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Recent Processes</h4>
                    <div class="process-tree">
                        ${d.recent_processes?.slice(0, 10).map(p => `
                            <div class="process-node">
                                <span class="process-name ${p.parent?.includes('WINWORD') ? 'suspicious' : ''}">${p.process}</span>
                                ${p.parent ? `<span class="muted"> ← ${p.parent}</span>` : ''}
                            </div>
                        `).join('') || '<div class="muted">No processes</div>'}
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Network Connections</h4>
                    ${d.recent_connections?.slice(0, 10).map(c => `
                        <div style="padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
                            <span class="mono">${c.domain || c.ip || '—'}</span>
                        </div>
                    `).join('') || '<div class="muted">No connections</div>'}
                </div>
            `;
        } else if (type === 'entity') {
            const userData = this.state.data.entities?.users?.[id];
            const risk = this.state.data.risk?.entity_scores?.[id];
            
            titleEl.textContent = id;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="drawer-section">
                    <h4>Entity Profile</h4>
                    <div style="display:grid;grid-template-columns:100px 1fr;gap:var(--space-2)">
                        <div class="muted">Name</div><div>${userData?.name || '—'}</div>
                        <div class="muted">Dept</div><div>${userData?.dept || '—'}</div>
                        <div class="muted">Title</div><div>${userData?.title || '—'}</div>
                        <div class="muted">Risk</div><div><span class="badge ${risk?.severity || 'low'}">${risk?.score || 0}</span></div>
                        <div class="muted">Events</div><div>${userData?.event_count || 0}</div>
                    </div>
                </div>
                ${risk?.reasons?.length ? `
                    <div class="drawer-section">
                        <h4>Risk Factors</h4>
                        ${risk.reasons.map(r => `
                            <div style="padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
                                <div class="flex justify-between">
                                    <span>${r.rule}</span>
                                    <span class="badge">+${r.points}</span>
                                </div>
                                <div class="muted" style="margin-top:var(--space-1)">${r.description}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
        }
    },

    switchDrawerTab(tab) {
        this.state.drawer.tab = tab;
        this.renderDrawerContent();
    },

    // ============================================
    // COMMAND PALETTE
    // ============================================

    openCmdPalette() {
        this.state.cmdPalette = true;
        document.getElementById('cmd-palette').classList.add('active');
        document.getElementById('cmd-input').focus();
        this.renderCmdResults('');
    },

    closeCmdPalette() {
        this.state.cmdPalette = false;
        document.getElementById('cmd-palette').classList.remove('active');
        document.getElementById('cmd-input').value = '';
    },

    handleCmdSearch(query) {
        this.renderCmdResults(query.toLowerCase());
    },

    renderCmdResults(query) {
        const results = document.getElementById('cmd-results');
        const commands = [
            { icon: '📊', label: 'Overview', hint: 'Go to Overview', action: () => this.switchView('overview') },
            { icon: '📋', label: 'Cases', hint: 'View all cases', action: () => this.switchView('cases') },
            { icon: '⚠️', label: 'Alerts', hint: 'View all alerts', action: () => this.switchView('alerts') },
            { icon: '🔍', label: 'Event Search', hint: 'Search events', action: () => this.switchView('search') },
            { icon: '👥', label: 'Entities', hint: 'View entities', action: () => this.switchView('entities') },
            { icon: '💻', label: 'EDR', hint: 'Endpoint detection', action: () => this.switchView('edr') },
            { icon: '🎯', label: 'MITRE', hint: 'ATT&CK coverage', action: () => this.switchView('mitre') },
            { icon: '🔄', label: 'Refresh', hint: 'Reload data', action: () => this.refreshData() },
            { icon: '📥', label: 'Export', hint: 'Export data', action: () => this.exportData() },
        ];

        // Add cases
        (this.state.data.cases || []).forEach(c => {
            commands.push({
                icon: '📄',
                label: c.case_id,
                hint: c.title,
                action: () => this.openDrawer('case', c.case_id)
            });
        });

        const filtered = query 
            ? commands.filter(c => c.label.toLowerCase().includes(query) || c.hint.toLowerCase().includes(query))
            : commands;

        results.innerHTML = filtered.slice(0, 10).map((c, i) => `
            <div class="cmd-item ${i === 0 ? 'selected' : ''}" onclick="App.execCmd(${commands.indexOf(c)})">
                <span class="cmd-item-icon">${c.icon}</span>
                <div class="cmd-item-text">
                    <div class="cmd-item-label">${c.label}</div>
                    <div class="cmd-item-hint">${c.hint}</div>
                </div>
            </div>
        `).join('');
        
        this._cmdCommands = commands;
    },

    execCmd(index) {
        this._cmdCommands[index]?.action();
        this.closeCmdPalette();
    },

    // ============================================
    // UTILITIES
    // ============================================

    showSkeleton() {
        document.getElementById('skeleton').classList.add('active');
        document.getElementById('view-container').style.display = 'none';
    },

    hideSkeleton() {
        document.getElementById('skeleton').classList.remove('active');
        document.getElementById('view-container').style.display = 'block';
    },

    updateStatus(status, text) {
        const pill = document.getElementById('status-pill');
        pill.className = `status-pill ${status}`;
        pill.querySelector('.status-text').textContent = text;
    },

    updateLastLoaded() {
        document.getElementById('last-loaded').textContent = `Last: ${new Date().toLocaleTimeString()}`;
    },

    updateBadges() {
        document.getElementById('cases-badge').textContent = 
            this.state.data.cases?.filter(c => c.status !== 'closed').length || 0;
        document.getElementById('alerts-badge').textContent = 
            this.state.data.alerts?.filter(a => a.severity === 'critical').length || 0;
    },

    showEmptyState(message) {
        document.getElementById('view-container').innerHTML = `
            <div class="empty-state">
                <h2>No Data Available</h2>
                <p style="margin-top:var(--space-4)">${message}</p>
            </div>
        `;
    },

    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    toggleDensity() {
        const body = document.body;
        if (body.classList.contains('density-comfortable')) {
            body.classList.remove('density-comfortable');
            body.classList.add('density-compact');
            this.state.density = 'compact';
        } else {
            body.classList.remove('density-compact');
            body.classList.add('density-comfortable');
            this.state.density = 'comfortable';
        }
        this.toast(`Density: ${this.state.density}`, 'info');
    },

    exportData() {
        const data = {
            cases: this.state.data.cases,
            alerts: this.state.data.alerts,
            exported_at: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soc-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.toast('Data exported', 'success');
    },

    exportIOCs() {
        const iocs = this.state.data.iocs || [];
        const csv = 'type,indicator,tags,confidence\n' + 
            iocs.map(i => `${i.type},${i.indicator},"${i.tags?.join(';')}",${i.confidence}`).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'iocs.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.toast('IOCs exported', 'success');
    },

    copyText(text) {
        navigator.clipboard.writeText(text).then(() => this.toast('Copied', 'success'));
    },

    pivotEntity(email) {
        if (!email) return;
        this.openDrawer('entity', email);
    },

    filterByMITRE(technique) {
        this.toast(`Filter by ${technique}`, 'info');
        this.switchView('alerts');
    },

    formatTime(isoString) {
        if (!isoString) return '—';
        const d = new Date(isoString);
        return d.toLocaleString('en-US', { 
            month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    },

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    renderMarkdown(md) {
        let html = this.escape(md);
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/\n\n/g, '</p><p>');
        return '<p>' + html + '</p>';
    },

    getWarRoomNotes(caseId) {
        const key = `warroom_${caseId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    },

    addWarRoomNote(caseId) {
        const textarea = document.getElementById('war-room-note');
        const note = textarea.value.trim();
        if (!note) return;

        const key = `warroom_${caseId}`;
        const notes = this.getWarRoomNotes(caseId);
        notes.push({ timestamp: new Date().toISOString(), message: note });
        localStorage.setItem(key, JSON.stringify(notes));
        
        textarea.value = '';
        this.renderDrawerContent();
        this.toast('Note added', 'success');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => App.init());
