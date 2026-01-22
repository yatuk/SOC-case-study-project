/**
 * SOC Console - Enterprise Security Dashboard
 * Microsoft Defender / QRadar / XSOAR inspired UI
 * Vanilla JS, no frameworks
 */

const App = {
    // State
    state: {
        view: 'overview',
        data: {
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
            datasetProfile: null
        },
        filters: {
            severity: [],
            status: [],
            category: [],
            search: ''
        },
        drawer: {
            open: false,
            type: null,
            id: null,
            tab: 0
        },
        live: {
            enabled: false,
            interval: null,
            speed: 2000,
            eventCount: 0
        },
        edr: {},
        soar: { runs: [], active: null },
        settings: null,
        savedSearches: [],
        settingsTab: 'general'
    },

    // Default settings
    defaultSettings: {
        language: 'tr',
        timezone: 'Europe/Istanbul',
        dateFormat: 'DD.MM.YYYY HH:mm',
        theme: 'dark',
        sidebarExpanded: true,
        tableDensity: 'normal',
        notifications: {
            desktop: true,
            sound: false,
            criticalPopup: true
        },
        sessionTimeout: 30
    },

    // Escape HTML helper
    esc(str) {
        return Security.escapeHtml(str);
    },

    // Initialize
    async init() {
        // Check auth
        if (typeof Auth !== 'undefined') {
            const session = Auth.getSession();
            if (!session) {
                window.location.href = './login.html';
                return;
            }
            this.updateUserDisplay(session);
        }
        
        this.bindEvents();
        this.loadPersistedState();
        await this.loadData();
    },

    updateUserDisplay(session) {
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-display-name');
        const role = document.getElementById('user-display-role');
        
        if (avatar && session.displayName) {
            avatar.textContent = session.displayName.charAt(0).toUpperCase();
        }
        if (name) {
            name.textContent = session.displayName || session.username;
        }
        if (role) {
            const roles = { admin: 'Yönetici', analyst: 'Analist', viewer: 'İzleyici' };
            role.textContent = roles[session.role] || session.role;
        }
    },

    loadPersistedState() {
        try {
            const edr = localStorage.getItem('soc_edr_state');
            if (edr) this.state.edr = JSON.parse(edr);
            
            const soar = localStorage.getItem('soc_soar_state');
            if (soar) this.state.soar = JSON.parse(soar);
            
            // Load settings
            const settings = localStorage.getItem('soc_settings');
            this.state.settings = settings ? { ...this.defaultSettings, ...JSON.parse(settings) } : { ...this.defaultSettings };
            
            // Apply theme
            this.applyTheme(this.state.settings.theme);
            
            // Load saved searches
            const savedSearches = localStorage.getItem('soc_saved_searches');
            if (savedSearches) this.state.savedSearches = JSON.parse(savedSearches);
        } catch (e) {
            console.warn('Failed to load persisted state');
            this.state.settings = { ...this.defaultSettings };
        }
    },
    
    saveSettings() {
        localStorage.setItem('soc_settings', JSON.stringify(this.state.settings));
    },
    
    saveSavedSearches() {
        localStorage.setItem('soc_saved_searches', JSON.stringify(this.state.savedSearches));
    },
    
    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    },

    saveEdrState() {
        localStorage.setItem('soc_edr_state', JSON.stringify(this.state.edr));
    },

    saveSoarState() {
        localStorage.setItem('soc_soar_state', JSON.stringify(this.state.soar));
    },

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                this.switchView(item.dataset.view);
            });
        });

        // Global search
        document.getElementById('global-search')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const q = e.target.value.trim();
                if (q) {
                    this.state.filters.search = q;
                    this.switchView('events');
                }
            }
        });

        // Refresh
        document.getElementById('btn-refresh')?.addEventListener('click', () => this.refreshData());

        // Export
        document.getElementById('btn-export')?.addEventListener('click', () => this.exportCurrentView());

        // Live toggle
        document.getElementById('btn-live')?.addEventListener('click', () => this.toggleLive());

        // Drawer close
        document.getElementById('drawer-close')?.addEventListener('click', () => this.closeDrawer());
        document.getElementById('drawer-overlay')?.addEventListener('click', () => this.closeDrawer());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDrawer();
            }
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('global-search')?.focus();
            }
        });

        // User menu
        document.getElementById('user-menu')?.addEventListener('click', () => {
            if (typeof Auth !== 'undefined') {
                Auth.logout();
                window.location.href = './login.html';
            }
        });
    },

    // Data Loading
    async loadData() {
        this.showSkeleton();
        this.updateStatus('loading', 'Yükleniyor...');

        const files = [
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
            { file: 'dataset_profile.json', prop: 'datasetProfile' }
        ];

        const results = await Promise.allSettled(files.map(f => this.loadFile(f)));
        
        let successCount = 0;
        results.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value !== null) {
                successCount++;
            }
        });

        if (successCount === 0) {
            this.hideSkeleton();
            this.showEmptyState('Veri dosyaları bulunamadı. Lütfen pipeline\'ı çalıştırın:<br><code>python run_pipeline.py</code>');
            this.updateStatus('error', 'Veri yok');
            return;
        }

        this.updateBadges();
        this.updateLastLoaded();
        this.hideSkeleton();
        this.updateStatus('ok', 'Veri yüklendi');
        this.renderView();
    },

    async loadFile({ file, prop, jsonl, isArray }) {
        try {
            const res = await fetch(`./dashboard_data/${file}`);
            if (!res.ok) return null;
            const text = await res.text();
            
            if (jsonl) {
                this.state.data[prop] = text.trim().split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                        try { return JSON.parse(line); }
                        catch { return null; }
                    })
                    .filter(Boolean);
            } else {
                const json = JSON.parse(text);
                if (isArray === true) {
                    this.state.data[prop] = Array.isArray(json) ? json : (json.cases || json.devices || json.iocs || []);
                } else if (typeof isArray === 'string') {
                    this.state.data[prop] = json[isArray] || [];
                } else {
                    this.state.data[prop] = json;
                }
            }
            return this.state.data[prop];
        } catch (e) {
            console.warn(`Failed to load ${file}:`, e);
            return null;
        }
    },

    async refreshData() {
        this.showSkeleton();
        await this.loadData();
        this.toast('Veriler yenilendi', 'success');
    },

    // View Management
    switchView(view) {
        this.state.view = view;
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Show/hide live button
        const liveBtn = document.getElementById('btn-live');
        if (liveBtn) {
            liveBtn.style.display = (view === 'events') ? 'flex' : 'none';
        }

        this.renderView();
    },

    renderView() {
        const container = document.getElementById('view-container');
        if (!container) return;

        container.style.display = 'flex';
        
        const views = {
            overview: () => this.renderOverview(),
            cases: () => this.renderCases(),
            alerts: () => this.renderAlerts(),
            events: () => this.renderEvents(),
            entities: () => this.renderEntities(),
            devices: () => this.renderDevices(),
            automations: () => this.renderAutomations(),
            timeline: () => this.renderTimeline(),
            mitre: () => this.renderMitre(),
            intel: () => this.renderIntel(),
            reports: () => this.renderReports(),
            settings: () => this.renderSettings()
        };

        const renderer = views[this.state.view] || views.overview;
        container.innerHTML = renderer();
        this.bindViewEvents();
    },

    // ==========================================
    // OVERVIEW
    // ==========================================
    renderOverview() {
        const d = this.state.data;
        const totalEvents = d.events?.length || d.summary?.total_events || 0;
        const totalAlerts = d.alerts?.length || 0;
        const criticalAlerts = d.alerts?.filter(a => a.severity === 'critical' || a.severity === 'high').length || 0;
        const openCases = d.cases?.filter(c => c.status !== 'closed').length || 0;
        const devices = d.devices?.length || 0;

        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Güvenlik Genel Bakışı</h1>
                        <p class="page-subtitle">Anadolu Finans Holding - SOC Durumu</p>
                    </div>
                </div>
            </div>
            
            <div class="summary-strip">
                <div class="stat-tile">
                    <span class="stat-label">Toplam Olay</span>
                    <span class="stat-value">${totalEvents}</span>
                </div>
                <div class="stat-tile">
                    <span class="stat-label">Uyarılar</span>
                    <span class="stat-value warning">${totalAlerts}</span>
                </div>
                <div class="stat-tile">
                    <span class="stat-label">Kritik/Yüksek</span>
                    <span class="stat-value danger">${criticalAlerts}</span>
                </div>
                <div class="stat-tile">
                    <span class="stat-label">Açık Vakalar</span>
                    <span class="stat-value primary">${openCases}</span>
                </div>
                <div class="stat-tile">
                    <span class="stat-label">Cihazlar</span>
                    <span class="stat-value">${devices}</span>
                </div>
            </div>
            
            <div class="data-grid-container" style="padding: var(--space-5);">
                <h3 style="font-size: var(--text-lg); margin-bottom: var(--space-4);">Son Uyarılar</h3>
                ${this.renderAlertTable(d.alerts?.slice(0, 10) || [])}
            </div>
        `;
    },

    // ==========================================
    // CASES
    // ==========================================
    renderCases() {
        const cases = this.state.data.cases || [];
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Vakalar</h1>
                        <p class="page-subtitle">${cases.length} vaka</p>
                    </div>
                </div>
            </div>
            
            <div class="toolbar">
                <div class="toolbar-search">
                    <svg viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Vaka ara..." id="case-search">
                </div>
                <div class="toolbar-group">
                    <select class="form-select" style="width: auto;" id="filter-case-status">
                        <option value="">Tüm Durumlar</option>
                        <option value="new">Yeni</option>
                        <option value="in_progress">İnceleniyor</option>
                        <option value="closed">Kapatıldı</option>
                    </select>
                    <select class="form-select" style="width: auto;" id="filter-case-severity">
                        <option value="">Tüm Seviyeler</option>
                        <option value="critical">Kritik</option>
                        <option value="high">Yüksek</option>
                        <option value="medium">Orta</option>
                        <option value="low">Düşük</option>
                    </select>
                </div>
            </div>
            
            <div class="data-grid-container">
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Vaka ID</th>
                            <th>Başlık</th>
                            <th>Seviye</th>
                            <th>Durum</th>
                            <th>Uyarılar</th>
                            <th>Etkilenen</th>
                            <th>Başlangıç</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cases.map(c => `
                            <tr data-case-id="${this.esc(c.case_id)}" class="case-row">
                                <td><code>${this.esc(c.case_id)}</code></td>
                                <td>${this.esc(c.title)}</td>
                                <td>${this.renderSeverityBadge(c.severity)}</td>
                                <td>${this.renderStatusBadge(c.status)}</td>
                                <td>${c.alert_ids?.length || 0}</td>
                                <td>${c.affected_users?.length || 0} kullanıcı</td>
                                <td>${this.formatTime(c.start_ts)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // ==========================================
    // ALERTS
    // ==========================================
    renderAlerts() {
        const alerts = this.state.data.alerts || [];
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Uyarılar</h1>
                        <p class="page-subtitle">${alerts.length} uyarı</p>
                    </div>
                </div>
            </div>
            
            ${this.renderFilterBar('alerts')}
            
            <div class="data-grid-container">
                ${this.renderAlertTable(alerts)}
            </div>
        `;
    },

    renderAlertTable(alerts) {
        if (!alerts.length) {
            return '<div class="empty-state"><p class="empty-state-title">Uyarı bulunamadı</p></div>';
        }

        return `
            <table class="data-grid">
                <thead>
                    <tr>
                        <th>Zaman</th>
                        <th>Uyarı</th>
                        <th>Seviye</th>
                        <th>Güven</th>
                        <th>Kullanıcı</th>
                        <th>Kaynak IP</th>
                        <th>MITRE</th>
                    </tr>
                </thead>
                <tbody>
                    ${alerts.map(a => `
                        <tr data-alert-id="${this.esc(a.alert_id || a.id)}" class="alert-row">
                            <td><code>${this.formatTime(a.timestamp || a.ts)}</code></td>
                            <td>${this.esc(a.alert_name || a.name || a.title)}</td>
                            <td>${this.renderSeverityBadge(a.severity)}</td>
                            <td><span class="badge badge-neutral">${a.confidence || 'N/A'}</span></td>
                            <td>${this.esc(a.user || a.affected_user || '—')}</td>
                            <td><code>${this.esc(a.src_ip || a.source_ip || '—')}</code></td>
                            <td>${(a.mitre_techniques || a.techniques || []).slice(0, 2).map(t => `<span class="badge badge-info">${this.esc(t)}</span>`).join(' ')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    // ==========================================
    // EVENTS (SIEM - QRadar Style)
    // ==========================================
    renderEvents() {
        const events = this.state.data.events || [];
        const categories = [...new Set(events.map(e => e.source || e.event_type).filter(Boolean))];
        const savedSearches = this.state.savedSearches || [];
        
        // Calculate aggregations
        const aggregations = this.calculateEventAggregations(events);
        
        return `
            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Filter Pane (QRadar style) -->
                <div class="filter-pane">
                    <div class="filter-header">
                        <span class="filter-title">Filtreler</span>
                        <span class="filter-clear" onclick="App.clearFilters()">Temizle</span>
                    </div>
                    <div class="filter-body">
                        <div class="filter-section">
                            <div class="filter-section-title">Kaynak Tipi <span class="filter-section-count">(${categories.length})</span></div>
                            ${categories.slice(0, 10).map(cat => `
                                <label class="filter-option">
                                    <input type="checkbox" value="${this.esc(cat)}" class="filter-source" onchange="App.applyEventFilter()">
                                    <span>${this.esc(cat)}</span>
                                    <span class="filter-option-count">${events.filter(e => (e.source || e.event_type) === cat).length}</span>
                                </label>
                            `).join('')}
                        </div>
                        
                        <div class="filter-section">
                            <div class="filter-section-title">Seviye</div>
                            ${['critical', 'high', 'medium', 'low', 'info'].map(sev => `
                                <label class="filter-option">
                                    <input type="checkbox" value="${sev}" class="filter-severity" onchange="App.applyEventFilter()">
                                    <span>${this.getSeverityLabel(sev)}</span>
                                    <span class="filter-option-count">${aggregations.severityCounts[sev] || 0}</span>
                                </label>
                            `).join('')}
                        </div>
                        
                        <div class="filter-section">
                            <div class="filter-section-title">Zaman Aralığı</div>
                            <select class="form-select" id="filter-time-range" onchange="App.applyEventFilter()">
                                <option value="all">Tümü</option>
                                <option value="1h">Son 1 saat</option>
                                <option value="24h">Son 24 saat</option>
                                <option value="7d">Son 7 gün</option>
                            </select>
                        </div>
                        
                        ${savedSearches.length > 0 ? `
                        <div class="filter-section saved-searches">
                            <div class="filter-section-title">Kayıtlı Aramalar</div>
                            ${savedSearches.map(s => `
                                <div class="saved-search-item" onclick="App.runSavedSearch('${this.esc(s.id)}')">
                                    <span class="saved-search-name">${this.esc(s.name)}</span>
                                    <div class="saved-search-actions">
                                        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); App.deleteSavedSearch('${this.esc(s.id)}')" title="Sil">×</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Main View -->
                <div class="main-view">
                    <div class="page-header">
                        <div class="page-header-top">
                            <div>
                                <h1 class="page-title">Olay Arama</h1>
                                <p class="page-subtitle">${events.length.toLocaleString()} olay</p>
                            </div>
                            <div class="page-actions">
                                ${this.state.live.enabled ? `
                                    <div class="live-indicator">
                                        <span class="live-dot"></span>
                                        CANLI - ${this.state.live.eventCount} yeni
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Query Builder -->
                    <div class="query-builder" id="query-builder">
                        <div class="query-builder-title">Sorgu Oluşturucu</div>
                        <div id="query-rows">
                            <div class="query-row">
                                <select class="form-select query-field" id="qb-field-0">
                                    <option value="">Alan Seç</option>
                                    <option value="source">Kaynak</option>
                                    <option value="event_type">Olay Tipi</option>
                                    <option value="user">Kullanıcı</option>
                                    <option value="device">Cihaz</option>
                                    <option value="src_ip">Kaynak IP</option>
                                    <option value="severity">Seviye</option>
                                </select>
                                <select class="form-select query-operator" id="qb-op-0">
                                    <option value="=">=</option>
                                    <option value="!=">!=</option>
                                    <option value="contains">CONTAINS</option>
                                    <option value="starts_with">STARTS WITH</option>
                                </select>
                                <input type="text" class="form-input query-value" id="qb-value-0" placeholder="Değer">
                                <button class="btn btn-ghost btn-sm" onclick="App.addQueryRow()">+</button>
                            </div>
                        </div>
                        <div class="query-actions">
                            <button class="btn btn-primary btn-sm" onclick="App.executeQuery()">Sorguyu Çalıştır</button>
                            <button class="btn btn-ghost btn-sm" onclick="App.clearQuery()">Temizle</button>
                            <button class="btn btn-ghost btn-sm" onclick="App.saveCurrentSearch()">Aramayı Kaydet</button>
                        </div>
                    </div>
                    
                    <!-- Event Aggregation Panel -->
                    <div class="aggregation-panel">
                        <div class="aggregation-title">Kaynak Dağılımı (Son ${events.length} olay)</div>
                        ${aggregations.topSources.slice(0, 5).map(s => `
                            <div class="aggregation-bar">
                                <span class="aggregation-bar-label">${this.esc(s.name)}</span>
                                <div class="aggregation-bar-track">
                                    <div class="aggregation-bar-fill" style="width: ${s.percent}%; background: ${this.getSourceColor(s.name)};"></div>
                                </div>
                                <span class="aggregation-bar-value">${s.count.toLocaleString()} (${s.percent}%)</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="toolbar">
                        <div class="toolbar-search" style="max-width: 600px;">
                            <svg viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" id="event-search" placeholder="user:alice AND event_type:login" value="${this.esc(this.state.filters.search)}">
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="App.searchEvents()">Ara</button>
                        <div class="toolbar-divider"></div>
                        <button class="btn btn-ghost btn-sm" onclick="App.exportEvents()">CSV İndir</button>
                    </div>
                    
                    <div class="data-grid-container" id="events-table">
                        ${this.renderEventsTable(events.slice(0, 100))}
                    </div>
                </div>
            </div>
        `;
    },
    
    // Query Builder Methods
    queryRowCount: 1,
    
    addQueryRow() {
        const container = document.getElementById('query-rows');
        if (!container || this.queryRowCount >= 5) return;
        
        const rowId = this.queryRowCount++;
        const row = document.createElement('div');
        row.className = 'query-row';
        row.id = `query-row-${rowId}`;
        row.innerHTML = `
            <select class="form-select" style="width: 80px;">
                <option value="AND">AND</option>
                <option value="OR">OR</option>
            </select>
            <select class="form-select query-field" id="qb-field-${rowId}">
                <option value="">Alan Seç</option>
                <option value="source">Kaynak</option>
                <option value="event_type">Olay Tipi</option>
                <option value="user">Kullanıcı</option>
                <option value="device">Cihaz</option>
                <option value="src_ip">Kaynak IP</option>
                <option value="severity">Seviye</option>
            </select>
            <select class="form-select query-operator" id="qb-op-${rowId}">
                <option value="=">=</option>
                <option value="!=">!=</option>
                <option value="contains">CONTAINS</option>
                <option value="starts_with">STARTS WITH</option>
            </select>
            <input type="text" class="form-input query-value" id="qb-value-${rowId}" placeholder="Değer">
            <button class="btn btn-ghost btn-sm" onclick="App.removeQueryRow(${rowId})">−</button>
        `;
        container.appendChild(row);
    },
    
    removeQueryRow(rowId) {
        const row = document.getElementById(`query-row-${rowId}`);
        if (row) row.remove();
    },
    
    executeQuery() {
        const events = this.state.data.events || [];
        let filtered = [...events];
        
        // Get all query rows
        for (let i = 0; i < this.queryRowCount; i++) {
            const field = document.getElementById(`qb-field-${i}`)?.value;
            const op = document.getElementById(`qb-op-${i}`)?.value;
            const value = document.getElementById(`qb-value-${i}`)?.value?.toLowerCase();
            
            if (!field || !value) continue;
            
            filtered = filtered.filter(e => {
                let eventValue = this.getEventFieldValue(e, field)?.toString().toLowerCase() || '';
                
                switch (op) {
                    case '=': return eventValue === value;
                    case '!=': return eventValue !== value;
                    case 'contains': return eventValue.includes(value);
                    case 'starts_with': return eventValue.startsWith(value);
                    default: return true;
                }
            });
        }
        
        // Update the table
        const table = document.getElementById('events-table');
        if (table) {
            table.innerHTML = this.renderEventsTable(filtered.slice(0, 100));
            this.bindViewEvents();
        }
        
        this.toast(`${filtered.length} sonuç bulundu`, 'info');
    },
    
    getEventFieldValue(event, field) {
        switch (field) {
            case 'user':
                return typeof event.user === 'object' ? (event.user?.email || event.user?.display) : event.user;
            case 'device':
                return typeof event.device === 'object' ? event.device?.hostname : event.device;
            case 'src_ip':
                return typeof event.network === 'object' ? event.network?.src_ip : event.src_ip;
            case 'severity':
                return typeof event.severity === 'number' ? this.numToSeverity(event.severity) : event.severity;
            default:
                return event[field];
        }
    },
    
    clearQuery() {
        for (let i = 0; i < this.queryRowCount; i++) {
            const field = document.getElementById(`qb-field-${i}`);
            const value = document.getElementById(`qb-value-${i}`);
            if (field) field.value = '';
            if (value) value.value = '';
        }
        this.renderView();
    },
    
    saveCurrentSearch() {
        const name = prompt('Arama adı:');
        if (!name) return;
        
        // Build query string from current query builder state
        const parts = [];
        for (let i = 0; i < this.queryRowCount; i++) {
            const field = document.getElementById(`qb-field-${i}`)?.value;
            const op = document.getElementById(`qb-op-${i}`)?.value;
            const value = document.getElementById(`qb-value-${i}`)?.value;
            if (field && value) {
                parts.push(`${field}${op}${value}`);
            }
        }
        
        const search = {
            id: 'ss_' + Date.now(),
            name: name,
            query: parts.join(' AND '),
            created: new Date().toISOString()
        };
        
        this.state.savedSearches.push(search);
        this.saveSavedSearches();
        this.toast('Arama kaydedildi', 'success');
        this.renderView();
    },
    
    runSavedSearch(searchId) {
        const search = this.state.savedSearches.find(s => s.id === searchId);
        if (!search) return;
        
        const searchInput = document.getElementById('event-search');
        if (searchInput) {
            searchInput.value = search.query;
            this.state.filters.search = search.query;
            this.searchEvents();
        }
    },
    
    deleteSavedSearch(searchId) {
        this.state.savedSearches = this.state.savedSearches.filter(s => s.id !== searchId);
        this.saveSavedSearches();
        this.toast('Arama silindi', 'success');
        this.renderView();
    },
    
    // Event Aggregations
    calculateEventAggregations(events) {
        const sourceCounts = {};
        const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        const userCounts = {};
        
        events.forEach(e => {
            // Source counts
            const source = e.source || e.event_type || 'unknown';
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
            
            // Severity counts
            const sev = typeof e.severity === 'number' ? this.numToSeverity(e.severity) : (e.severity || 'info');
            severityCounts[sev] = (severityCounts[sev] || 0) + 1;
            
            // User counts
            const user = typeof e.user === 'object' ? (e.user?.email || e.user?.display) : e.user;
            if (user) userCounts[user] = (userCounts[user] || 0) + 1;
        });
        
        // Top sources
        const topSources = Object.entries(sourceCounts)
            .map(([name, count]) => ({ name, count, percent: Math.round(count / events.length * 100) }))
            .sort((a, b) => b.count - a.count);
        
        // Top users
        const topUsers = Object.entries(userCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        
        return { sourceCounts, severityCounts, topSources, topUsers };
    },
    
    getSourceColor(source) {
        const colors = {
            'WindowsEvents': 'var(--color-primary)',
            'AAD': 'var(--color-info)',
            'M365Defender': 'var(--severity-high)',
            'Email': 'var(--severity-medium)',
            'IdP': 'var(--color-success)',
            'Endpoint': 'var(--severity-critical)',
            'Proxy': 'var(--severity-low)',
            'DNS': 'var(--text-muted)'
        };
        return colors[source] || 'var(--color-primary)';
    },

    renderEventsTable(events) {
        if (!events.length) {
            return '<div class="empty-state"><p class="empty-state-title">Olay bulunamadı</p></div>';
        }

        return `
            <table class="data-grid">
                <thead>
                    <tr>
                        <th style="width: 140px;">Zaman</th>
                        <th>Kaynak</th>
                        <th>Olay Tipi</th>
                        <th>Kullanıcı</th>
                        <th>Cihaz</th>
                        <th>Kaynak IP</th>
                        <th>Özet</th>
                    </tr>
                </thead>
                <tbody id="events-tbody">
                    ${events.map(e => this.renderEventRow(e)).join('')}
                </tbody>
            </table>
        `;
    },

    renderEventRow(e, isNew = false) {
        // Handle both flat and nested event formats
        const user = typeof e.user === 'object' ? (e.user?.display || e.user?.email || '—') : (e.user || '—');
        const device = typeof e.device === 'object' ? (e.device?.hostname || '—') : (e.device || '—');
        const srcIp = typeof e.network === 'object' ? (e.network?.src_ip || '—') : (e.src_ip || '—');
        const severity = e.severity ? (typeof e.severity === 'number' ? this.numToSeverity(e.severity) : e.severity) : 'info';
        
        return `
            <tr data-event-id="${this.esc(e.event_id || e.id)}" class="event-row${isNew ? ' live-new' : ''}" onclick="App.openEventDrawer('${this.esc(e.event_id || e.id)}')">
                <td><code>${this.formatTime(e.ts || e.timestamp)}</code></td>
                <td><span class="badge badge-${severity === 'critical' || severity === 'high' ? 'danger' : 'neutral'}">${this.esc(e.source || '—')}</span></td>
                <td>${this.esc(e.event_type || '—')}</td>
                <td>${this.esc(user)}</td>
                <td>${this.esc(device)}</td>
                <td><code>${this.esc(srcIp)}</code></td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${this.esc(e.summary || '—')}</td>
            </tr>
        `;
    },

    // ==========================================
    // ENTITIES
    // ==========================================
    renderEntities() {
        const risk = this.state.data.riskScores || {};
        const users = Object.entries(risk).map(([user, data]) => ({
            user,
            score: typeof data === 'number' ? data : data.total_score || data.score || 0,
            factors: data.factors || []
        }));
        
        users.sort((a, b) => b.score - a.score);
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Varlıklar</h1>
                        <p class="page-subtitle">${users.length} kullanıcı</p>
                    </div>
                </div>
            </div>
            
            <div class="tabs">
                <div class="tab active" data-tab="users">Kullanıcılar</div>
                <div class="tab" data-tab="ips">IP Adresleri</div>
                <div class="tab" data-tab="domains">Domain'ler</div>
            </div>
            
            <div class="data-grid-container">
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Kullanıcı</th>
                            <th>Risk Skoru</th>
                            <th>Seviye</th>
                            <th>Faktörler</th>
                            <th>İlişkili Uyarılar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr data-user="${this.esc(u.user)}" class="entity-row">
                                <td><strong>${this.esc(u.user)}</strong></td>
                                <td>
                                    <div class="risk-indicator">
                                        ${this.renderRiskBar(u.score)}
                                        <span>${u.score}</span>
                                    </div>
                                </td>
                                <td>${this.renderRiskBadge(u.score)}</td>
                                <td>${u.factors.slice(0, 2).map(f => `<span class="chip">${this.esc(f.name || f)}</span>`).join(' ')}</td>
                                <td>${this.state.data.alerts?.filter(a => a.user === u.user || a.affected_user === u.user).length || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // ==========================================
    // DEVICES (EDR - Microsoft Defender Style)
    // ==========================================
    renderDevices() {
        const devices = this.state.data.devices || [];
        const riskLevels = { critical: 0, high: 0, medium: 0, low: 0 };
        
        devices.forEach(d => {
            const score = d.risk_score || 0;
            if (score >= 80) riskLevels.critical++;
            else if (score >= 60) riskLevels.high++;
            else if (score >= 30) riskLevels.medium++;
            else riskLevels.low++;
        });

        return `
            <div style="display: flex; flex: 1; overflow: hidden;">
                <!-- Filter Pane (MDE style) -->
                <div class="filter-pane">
                    <div class="filter-header">
                        <span class="filter-title">Filtreler</span>
                        <span class="filter-clear" onclick="App.clearDeviceFilters()">Temizle</span>
                    </div>
                    <div class="filter-body">
                        <div class="filter-section">
                            <div class="filter-section-title">Risk Seviyesi</div>
                            <label class="filter-option">
                                <input type="checkbox" value="critical" class="filter-device-risk">
                                <span>Kritik</span>
                                <span class="filter-option-count">${riskLevels.critical}</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" value="high" class="filter-device-risk">
                                <span>Yüksek</span>
                                <span class="filter-option-count">${riskLevels.high}</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" value="medium" class="filter-device-risk">
                                <span>Orta</span>
                                <span class="filter-option-count">${riskLevels.medium}</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" value="low" class="filter-device-risk">
                                <span>Düşük</span>
                                <span class="filter-option-count">${riskLevels.low}</span>
                            </label>
                        </div>
                        
                        <div class="filter-section">
                            <div class="filter-section-title">İşletim Sistemi</div>
                            <label class="filter-option">
                                <input type="checkbox" value="windows" class="filter-device-os">
                                <span>Windows</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" value="macos" class="filter-device-os">
                                <span>macOS</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" value="linux" class="filter-device-os">
                                <span>Linux</span>
                            </label>
                        </div>
                        
                        <div class="filter-section">
                            <div class="filter-section-title">İzolasyon Durumu</div>
                            <label class="filter-option">
                                <input type="checkbox" value="isolated" class="filter-device-isolation">
                                <span>İzole</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" value="not-isolated" class="filter-device-isolation">
                                <span>Aktif</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <!-- Main View -->
                <div class="main-view">
                    <div class="page-header">
                        <div class="page-header-top">
                            <div>
                                <h1 class="page-title">Cihaz Envanteri</h1>
                                <p class="page-subtitle">${devices.length} cihaz</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="summary-strip">
                        <div class="stat-tile">
                            <span class="stat-label">Toplam</span>
                            <span class="stat-value">${devices.length}</span>
                        </div>
                        <div class="stat-tile">
                            <span class="stat-label">Yüksek Risk</span>
                            <span class="stat-value danger">${riskLevels.critical + riskLevels.high}</span>
                        </div>
                        <div class="stat-tile">
                            <span class="stat-label">İzole</span>
                            <span class="stat-value warning">${devices.filter(d => this.getDeviceState(d.device_id).isolated).length}</span>
                        </div>
                    </div>
                    
                    <div class="toolbar">
                        <div class="toolbar-search">
                            <svg viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" id="device-search" placeholder="Cihaz ara...">
                        </div>
                        <button class="btn btn-secondary btn-sm">Dışa Aktar</button>
                    </div>
                    
                    <div class="data-grid-container">
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Cihaz Adı</th>
                                    <th>Risk</th>
                                    <th>İşletim Sistemi</th>
                                    <th>Sahip</th>
                                    <th>Son Görülme</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${devices.map(d => {
                                    const state = this.getDeviceState(d.device_id);
                                    return `
                                        <tr data-device-id="${this.esc(d.device_id)}" class="device-row">
                                            <td><strong>${this.esc(d.hostname)}</strong></td>
                                            <td>
                                                <div class="risk-indicator">
                                                    ${this.renderRiskBar(d.risk_score || 0)}
                                                    <span>${d.risk_score || 0}</span>
                                                </div>
                                            </td>
                                            <td>${this.esc(d.os || '—')}</td>
                                            <td>${this.esc(d.owner_user || '—')}</td>
                                            <td>${this.formatTime(d.last_seen)}</td>
                                            <td>${state.isolated ? '<span class="badge badge-critical">İZOLE</span>' : '<span class="badge badge-low">Aktif</span>'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    getDeviceState(deviceId) {
        return this.state.edr[deviceId] || { isolated: false, actions: [] };
    },
    
    // Process Tree Visualization
    renderProcessTree(device) {
        const processes = device.recent_processes || [];
        
        if (!processes.length) {
            return `
                <div class="drawer-section">
                    <div class="drawer-section-title">Proses Ağacı</div>
                    <p style="color: var(--text-muted);">İşlem verisi bulunamadı</p>
                </div>
            `;
        }
        
        // Build a simulated process tree
        const tree = this.buildProcessTree(processes);
        
        return `
            <div class="drawer-section">
                <div class="drawer-section-title">Proses Ağacı</div>
                <p style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-3);">
                    Son ${processes.length} işlem gösteriliyor. Şüpheli işlemler kırmızı ile vurgulanmıştır.
                </p>
                <div class="process-tree">
                    ${tree}
                </div>
            </div>
            
            <div class="drawer-section">
                <div class="drawer-section-title">Şüpheli Göstergeler</div>
                ${this.detectSuspiciousProcesses(processes).length > 0 ? `
                    <div style="background: var(--color-danger-bg); border: 1px solid var(--color-danger); border-radius: var(--radius-md); padding: var(--space-3); margin-top: var(--space-2);">
                        <div style="color: var(--color-danger); font-weight: 500; margin-bottom: var(--space-2);">Şüpheli Aktivite Tespit Edildi</div>
                        <ul style="margin: 0; padding-left: var(--space-4); font-size: var(--text-sm);">
                            ${this.detectSuspiciousProcesses(processes).map(p => `<li>${this.esc(p)}</li>`).join('')}
                        </ul>
                    </div>
                ` : `
                    <p style="color: var(--color-success);">Şüpheli aktivite tespit edilmedi.</p>
                `}
            </div>
        `;
    },
    
    buildProcessTree(processes) {
        // Group processes by parent
        const suspiciousProcs = ['powershell.exe', 'cmd.exe', 'wscript.exe', 'cscript.exe', 'mshta.exe', 'regsvr32.exe', 'rundll32.exe'];
        const suspiciousParents = ['WINWORD.EXE', 'EXCEL.EXE', 'OUTLOOK.EXE', 'POWERPNT.EXE'];
        
        let html = '';
        let rootProcesses = [];
        
        // Parse process data
        processes.forEach(p => {
            if (typeof p === 'object') {
                rootProcesses.push({
                    name: p.process || 'unknown',
                    parent: p.parent || '',
                    timestamp: p.timestamp,
                    pid: Math.floor(Math.random() * 10000) + 1000 // Simulated PID
                });
            } else if (typeof p === 'string') {
                // Parse string format like "process.exe"
                rootProcesses.push({
                    name: p,
                    parent: '',
                    pid: Math.floor(Math.random() * 10000) + 1000
                });
            }
        });
        
        // Build tree HTML
        const renderNode = (proc, indent = 0) => {
            const isSuspicious = suspiciousProcs.some(s => proc.name.toLowerCase().includes(s.toLowerCase()));
            const hasOfficeParent = suspiciousParents.some(p => proc.parent.toLowerCase().includes(p.toLowerCase()));
            const isHighRisk = isSuspicious && hasOfficeParent;
            
            const indentStr = '│   '.repeat(indent);
            const connector = indent > 0 ? '├── ' : '';
            
            return `
                <div class="process-node">
                    <span class="process-indent">${indentStr}${connector}</span>
                    <span class="process-node-content ${isHighRisk ? 'process-suspicious' : ''}">
                        <span class="process-name">${this.esc(proc.name)}</span>
                        <span class="process-pid">(PID: ${proc.pid})</span>
                        ${isHighRisk ? '<span class="badge badge-critical" style="margin-left: 4px;">!</span>' : ''}
                    </span>
                </div>
            `;
        };
        
        // Group by parent for tree structure
        const byParent = {};
        rootProcesses.forEach(p => {
            const parent = p.parent || '_root_';
            if (!byParent[parent]) byParent[parent] = [];
            byParent[parent].push(p);
        });
        
        // Render root level and children
        const roots = byParent['_root_'] || byParent[''] || [];
        roots.forEach(proc => {
            html += renderNode(proc, 0);
            // Check for children
            const children = byParent[proc.name] || [];
            children.forEach(child => {
                html += renderNode(child, 1);
                // Grandchildren
                const grandchildren = byParent[child.name] || [];
                grandchildren.forEach(gc => {
                    html += renderNode(gc, 2);
                });
            });
        });
        
        // Also render processes without parent relationship
        const shown = new Set(roots.map(r => r.name));
        Object.values(byParent).flat().forEach(proc => {
            if (!shown.has(proc.name) && proc.parent) {
                html += renderNode(proc, 0);
                shown.add(proc.name);
            }
        });
        
        return html || '<p style="color: var(--text-muted);">Proses verisi yok</p>';
    },
    
    detectSuspiciousProcesses(processes) {
        const suspicious = [];
        const suspiciousProcs = ['powershell.exe', 'cmd.exe', 'wscript.exe', 'mshta.exe'];
        const officeApps = ['winword', 'excel', 'outlook', 'powerpnt'];
        
        processes.forEach(p => {
            const proc = typeof p === 'object' ? p : { process: p, parent: '' };
            const name = (proc.process || '').toLowerCase();
            const parent = (proc.parent || '').toLowerCase();
            
            // Office spawning shell
            if (officeApps.some(o => parent.includes(o)) && suspiciousProcs.some(s => name.includes(s))) {
                suspicious.push(`${proc.parent} → ${proc.process}: Office uygulaması shell prosesi başlattı`);
            }
            
            // PowerShell from Office
            if (name.includes('powershell') && officeApps.some(o => parent.includes(o))) {
                suspicious.push(`PowerShell Office dokümanından çalıştırıldı`);
            }
        });
        
        return [...new Set(suspicious)];
    },
    
    // Network Map Visualization
    renderNetworkMap(device) {
        const connections = device.recent_connections || [];
        
        if (!connections.length) {
            return `
                <div class="drawer-section">
                    <div class="drawer-section-title">Ağ Bağlantıları</div>
                    <p style="color: var(--text-muted);">Bağlantı verisi bulunamadı</p>
                </div>
            `;
        }
        
        // Parse connections
        const parsedConns = connections.map(c => {
            if (typeof c === 'object') {
                return {
                    domain: c.domain || c.dst_domain || '',
                    ip: c.ip || c.dst_ip || '',
                    timestamp: c.timestamp,
                    suspicious: this.isSuspiciousDomain(c.domain || c.dst_domain || '')
                };
            }
            return { domain: c, ip: '', suspicious: this.isSuspiciousDomain(c) };
        });
        
        // Get unique domains
        const uniqueDomains = [...new Set(parsedConns.map(c => c.domain).filter(Boolean))];
        const suspiciousCount = parsedConns.filter(c => c.suspicious).length;
        
        return `
            <div class="drawer-section">
                <div class="drawer-section-title">Ağ Bağlantı Haritası</div>
                <p style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-3);">
                    ${connections.length} bağlantı, ${uniqueDomains.length} benzersiz hedef
                    ${suspiciousCount > 0 ? `<span class="badge badge-critical" style="margin-left: 8px;">${suspiciousCount} Şüpheli</span>` : ''}
                </p>
                
                <div class="network-map">
                    <!-- Center node (this device) -->
                    <div class="network-node center" style="left: 50%; top: 20px; transform: translateX(-50%);">
                        ${this.esc(device.hostname)}
                    </div>
                    
                    <!-- Connection nodes -->
                    ${uniqueDomains.slice(0, 6).map((domain, i) => {
                        const conn = parsedConns.find(c => c.domain === domain);
                        const angle = (i / Math.min(uniqueDomains.length, 6)) * Math.PI + Math.PI / 2;
                        const radius = 80;
                        const x = 50 + Math.cos(angle) * 30;
                        const y = 120 + Math.sin(angle) * 40;
                        const isSuspicious = conn?.suspicious;
                        
                        return `
                            <div class="network-node ${isSuspicious ? 'suspicious' : 'normal'}" 
                                 style="left: ${x}%; top: ${y}px; transform: translateX(-50%);"
                                 title="${this.esc(domain)}${conn?.ip ? ' (' + conn.ip + ')' : ''}">
                                ${this.esc(domain.length > 20 ? domain.substring(0, 17) + '...' : domain)}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="drawer-section">
                <div class="drawer-section-title">Bağlantı Detayları</div>
                <div class="data-grid-container" style="max-height: 200px; overflow-y: auto;">
                    <table class="data-grid" style="font-size: var(--text-xs);">
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>IP</th>
                                <th>Zaman</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${parsedConns.slice(0, 20).map(c => `
                                <tr>
                                    <td><code>${this.esc(c.domain || '—')}</code></td>
                                    <td><code>${this.esc(c.ip || '—')}</code></td>
                                    <td>${this.formatTime(c.timestamp)}</td>
                                    <td>${c.suspicious ? '<span class="badge badge-critical">Şüpheli</span>' : '<span class="badge badge-low">Normal</span>'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    isSuspiciousDomain(domain) {
        if (!domain) return false;
        const suspicious = ['.cf', '.tk', '.ml', '.ga', '.gq', 'pastebin', 'ngrok', 'duckdns', '-update', '-cdn', 'example.cf'];
        return suspicious.some(s => domain.toLowerCase().includes(s));
    },
    
    // EDR Actions Panel
    renderEdrActionsPanel(device, state, deviceId) {
        const actionHistory = state.actions || [];
        
        return `
            <div class="drawer-section">
                <div class="drawer-section-title">EDR Aksiyonları <span class="badge badge-warning">SİMÜLASYON</span></div>
                <p style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--space-3);">
                    Bu aksiyonlar simüle edilmiştir. Gerçek bir ortamda EDR agent'ı ile haberleşirler.
                </p>
                
                <div class="edr-actions-panel">
                    <button class="edr-action-btn ${state.isolated ? '' : 'danger'}" onclick="App.performEdrAction('${this.esc(deviceId)}', '${state.isolated ? 'release' : 'isolate'}')">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        <span>${state.isolated ? 'İzolasyonu Kaldır' : 'Cihazı İzole Et'}</span>
                    </button>
                    
                    <button class="edr-action-btn" onclick="App.performEdrAction('${this.esc(deviceId)}', 'scan')">
                        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span>Tam AV Taraması Başlat</span>
                    </button>
                    
                    <button class="edr-action-btn" onclick="App.performEdrAction('${this.esc(deviceId)}', 'collect')">
                        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span>Triyaj Paketi Topla</span>
                    </button>
                    
                    <button class="edr-action-btn" onclick="App.performEdrAction('${this.esc(deviceId)}', 'kill_process')">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <span>Şüpheli Prosesleri Sonlandır</span>
                    </button>
                    
                    <button class="edr-action-btn" onclick="App.performEdrAction('${this.esc(deviceId)}', 'quarantine')">
                        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                        <span>Zararlı Dosyaları Karantinaya Al</span>
                    </button>
                </div>
            </div>
            
            <div class="drawer-section">
                <div class="drawer-section-title">Aksiyon Geçmişi</div>
                ${actionHistory.length > 0 ? `
                    <div class="edr-action-history">
                        ${actionHistory.slice(-10).reverse().map(a => `
                            <div class="edr-action-item">
                                <span>
                                    <strong>${this.getActionLabel(a.action)}</strong>
                                </span>
                                <span style="color: var(--text-muted);">${this.formatTime(a.time)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p style="color: var(--text-muted);">Henüz aksiyon alınmadı</p>'}
            </div>
        `;
    },
    
    getActionLabel(action) {
        const labels = {
            isolate: 'Cihaz İzole Edildi',
            release: 'İzolasyon Kaldırıldı',
            scan: 'AV Taraması Başlatıldı',
            collect: 'Triyaj Paketi Toplandı',
            kill_process: 'Prosesler Sonlandırıldı',
            quarantine: 'Dosyalar Karantinaya Alındı'
        };
        return labels[action] || action;
    },

    // ==========================================
    // AUTOMATIONS (SOAR - XSOAR Style)
    // ==========================================
    renderAutomations() {
        const playbooks = this.state.data.playbooks || [];
        const runs = this.state.soar.runs || [];
        
        // Calculate metrics
        const metrics = this.calculateSoarMetrics(runs);
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Playbook'lar</h1>
                        <p class="page-subtitle">${playbooks.length} playbook, ${runs.length} çalışma</p>
                    </div>
                </div>
            </div>
            
            <!-- SOAR Metrics Dashboard -->
            <div class="soar-metrics">
                <div class="soar-metric-card">
                    <div class="soar-metric-label">Toplam Çalışma</div>
                    <div class="soar-metric-value">${runs.length}</div>
                </div>
                <div class="soar-metric-card">
                    <div class="soar-metric-label">Başarılı</div>
                    <div class="soar-metric-value" style="color: var(--color-success);">${metrics.completed}</div>
                </div>
                <div class="soar-metric-card">
                    <div class="soar-metric-label">Aktif</div>
                    <div class="soar-metric-value" style="color: var(--color-warning);">${metrics.running}</div>
                </div>
                <div class="soar-metric-card">
                    <div class="soar-metric-label">Ort. MTTR</div>
                    <div class="soar-metric-value">${metrics.avgMttr}</div>
                </div>
            </div>
            
            <div class="tabs" id="automation-tabs">
                <div class="tab active" data-tab="library">Kütüphane</div>
                <div class="tab" data-tab="runs">Çalışmalar</div>
                <div class="tab" data-tab="visualize">Görselleştir</div>
            </div>
            
            <div id="automation-content">
                ${this.renderPlaybookLibrary(playbooks)}
            </div>
        `;
    },
    
    calculateSoarMetrics(runs) {
        const completed = runs.filter(r => r.status === 'completed').length;
        const running = runs.filter(r => r.status === 'running').length;
        
        // Calculate average MTTR (Mean Time To Resolve)
        let totalTime = 0;
        let countWithTime = 0;
        runs.forEach(r => {
            if (r.started_at && r.finished_at) {
                const start = new Date(r.started_at);
                const end = new Date(r.finished_at);
                totalTime += (end - start) / 1000 / 60; // minutes
                countWithTime++;
            }
        });
        
        const avgMttr = countWithTime > 0 ? Math.round(totalTime / countWithTime) + ' dk' : '—';
        
        return { completed, running, avgMttr };
    },

    renderPlaybookLibrary(playbooks) {
        const categories = [...new Set(playbooks.map(p => p.category).filter(Boolean))];
        
        return `
            <div style="display: flex; flex: 1; overflow: hidden;">
                <div class="filter-pane">
                    <div class="filter-header">
                        <span class="filter-title">Kategoriler</span>
                    </div>
                    <div class="filter-body">
                        <div class="filter-section">
                            ${categories.map(cat => `
                                <label class="filter-option">
                                    <input type="checkbox" value="${this.esc(cat)}">
                                    <span>${this.esc(cat)}</span>
                                    <span class="filter-option-count">${playbooks.filter(p => p.category === cat).length}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="filter-section">
                            <div class="filter-section-title">Onay Gerekli</div>
                            <label class="filter-option">
                                <input type="checkbox" value="yes">
                                <span>Evet</span>
                            </label>
                            <label class="filter-option">
                                <input type="checkbox" value="no">
                                <span>Hayır</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="main-view">
                    <div class="toolbar">
                        <div class="toolbar-search">
                            <svg viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input type="text" placeholder="Playbook ara...">
                        </div>
                    </div>
                    
                    <div class="data-grid-container">
                        <table class="data-grid">
                            <thead>
                                <tr>
                                    <th>Playbook</th>
                                    <th>Kategori</th>
                                    <th>Adımlar</th>
                                    <th>Onay</th>
                                    <th>Süre</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${playbooks.map(p => `
                                    <tr data-playbook-id="${this.esc(p.id)}" class="playbook-row" onclick="App.showPlaybookVisualization('${this.esc(p.id)}')">
                                        <td>
                                            <strong>${this.esc(p.name)}</strong>
                                            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">${this.esc(p.description?.substring(0, 60) || '')}</div>
                                        </td>
                                        <td><span class="badge badge-info">${this.esc(p.category || 'Genel')}</span></td>
                                        <td>${p.steps?.length || 0}</td>
                                        <td>${p.requires_approval ? '<span class="badge badge-warning">Gerekli</span>' : '<span class="badge badge-neutral">Hayır</span>'}</td>
                                        <td>${this.esc(p.estimated_time || '—')}</td>
                                        <td>
                                            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); App.showPlaybookRunner('${this.esc(p.id)}')">Çalıştır</button>
                                            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); App.showPlaybookVisualization('${this.esc(p.id)}')" title="Görselleştir">
                                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2">
                                                    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/>
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Playbook Visualization
    showPlaybookVisualization(playbookId) {
        const playbook = this.state.data.playbooks?.find(p => p.id === playbookId);
        if (!playbook) return;
        
        // Open drawer with visualization
        this.state.drawer = { open: true, type: 'playbook', id: playbookId, tab: 0 };
        document.getElementById('drawer-overlay')?.classList.add('open');
        document.getElementById('drawer')?.classList.add('open');
        
        const title = document.getElementById('drawer-title');
        const subtitle = document.getElementById('drawer-subtitle');
        const tabs = document.getElementById('drawer-tabs');
        const body = document.getElementById('drawer-body');
        const footer = document.getElementById('drawer-footer');
        
        if (title) title.textContent = playbook.name;
        if (subtitle) subtitle.textContent = `${playbook.steps?.length || 0} adım • ${playbook.category}`;
        if (tabs) tabs.innerHTML = `
            <button class="drawer-tab active">Akış Diyagramı</button>
            <button class="drawer-tab" onclick="App.switchPlaybookTab('details')">Detaylar</button>
        `;
        
        // Render workflow visualization
        if (body) {
            body.innerHTML = `
                <div class="drawer-section">
                    <div class="playbook-canvas" style="min-height: 500px; padding: var(--space-5);">
                        ${this.renderPlaybookWorkflow(playbook)}
                    </div>
                </div>
                <div class="drawer-section">
                    <div class="drawer-section-title">Adım Detayları</div>
                    <p style="color: var(--text-muted);">Bir adıma tıklayarak detaylarını görün</p>
                    <div id="step-details"></div>
                </div>
            `;
        }
        
        if (footer) {
            footer.innerHTML = `
                <button class="btn btn-secondary btn-sm" onclick="App.closeDrawer()">Kapat</button>
                <button class="btn btn-primary btn-sm" onclick="App.showPlaybookRunner('${this.esc(playbookId)}')">Çalıştır</button>
            `;
        }
    },
    
    renderPlaybookWorkflow(playbook) {
        const steps = playbook.steps || [];
        if (!steps.length) return '<p style="color: var(--text-muted);">Adım bulunamadı</p>';
        
        // Render steps vertically
        let html = '<div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-4);">';
        
        steps.forEach((step, i) => {
            const typeIcon = this.getStepTypeIcon(step.type);
            const typeColor = this.getStepTypeColor(step.type);
            
            html += `
                <div class="playbook-step" style="position: relative;" onclick="App.showStepDetails('${playbook.id}', '${step.id}')" data-step-id="${step.id}">
                    <div class="playbook-step-icon" style="color: ${typeColor};">
                        ${typeIcon}
                    </div>
                    <div class="playbook-step-name">${this.esc(step.name)}</div>
                    <div class="playbook-step-type">${this.esc(step.type)}</div>
                </div>
            `;
            
            // Add connector arrow (except for last step)
            if (i < steps.length - 1) {
                html += `
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--border-emphasis)" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <polyline points="19 12 12 19 5 12"/>
                    </svg>
                `;
            }
        });
        
        html += '</div>';
        return html;
    },
    
    getStepTypeIcon(type) {
        const icons = {
            enrich: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
            lookup: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
            hunt: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>',
            action: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
            approval: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            decision: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>',
            note: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
        };
        return icons[type] || icons.action;
    },
    
    getStepTypeColor(type) {
        const colors = {
            enrich: 'var(--color-info)',
            lookup: 'var(--color-primary)',
            hunt: 'var(--severity-medium)',
            action: 'var(--color-success)',
            approval: 'var(--severity-high)',
            decision: 'var(--severity-critical)',
            note: 'var(--text-muted)'
        };
        return colors[type] || 'var(--text-primary)';
    },
    
    showStepDetails(playbookId, stepId) {
        const playbook = this.state.data.playbooks?.find(p => p.id === playbookId);
        const step = playbook?.steps?.find(s => s.id === stepId);
        if (!step) return;
        
        // Highlight the selected step
        document.querySelectorAll('.playbook-step').forEach(el => el.classList.remove('active'));
        document.querySelector(`[data-step-id="${stepId}"]`)?.classList.add('active');
        
        const container = document.getElementById('step-details');
        if (container) {
            container.innerHTML = `
                <div style="padding: var(--space-3); background: var(--bg-surface-2); border-radius: var(--radius-md); margin-top: var(--space-3);">
                    <div style="font-weight: 600; margin-bottom: var(--space-2);">${this.esc(step.name)}</div>
                    <div style="font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-2);">${this.esc(step.description || 'Açıklama yok')}</div>
                    <div style="display: flex; gap: var(--space-3); font-size: var(--text-xs);">
                        <span class="badge badge-info">${this.esc(step.type)}</span>
                        ${step.auto ? '<span class="badge badge-low">Otomatik</span>' : '<span class="badge badge-warning">Manuel</span>'}
                    </div>
                </div>
            `;
        }
    },

    // ==========================================
    // TIMELINE
    // ==========================================
    renderTimeline() {
        const cases = this.state.data.cases || [];
        const alerts = this.state.data.alerts || [];
        
        // Group events by case
        const timeline = alerts.slice(0, 20).map(a => ({
            time: a.timestamp || a.ts,
            title: a.alert_name || a.name || a.title,
            type: 'alert',
            severity: a.severity,
            case: a.case_id
        })).sort((a, b) => new Date(b.time) - new Date(a.time));
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Zaman Çizelgesi</h1>
                        <p class="page-subtitle">Olay akışı</p>
                    </div>
                </div>
            </div>
            
            <div class="toolbar">
                <select class="form-select" style="width: auto;">
                    <option value="">Tüm Vakalar</option>
                    ${cases.map(c => `<option value="${this.esc(c.case_id)}">${this.esc(c.title)}</option>`).join('')}
                </select>
            </div>
            
            <div class="data-grid-container" style="padding: var(--space-5);">
                <div class="stepper">
                    ${timeline.map((item, i) => `
                        <div class="step">
                            <div class="step-indicator" style="background: var(--severity-${item.severity || 'info'});">${i + 1}</div>
                            <div class="step-content">
                                <div class="step-title">${this.esc(item.title)}</div>
                                <div class="step-desc">${this.formatTime(item.time)} ${item.case ? `• ${this.esc(item.case)}` : ''}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    // ==========================================
    // MITRE ATT&CK
    // ==========================================
    renderMitre() {
        const coverage = this.state.data.mitreCoverage || {};
        const techniques = coverage.techniques || [];
        
        const tactics = ['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 
                        'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
                        'Collection', 'Exfiltration', 'Impact'];
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">MITRE ATT&CK</h1>
                        <p class="page-subtitle">Teknik kapsama analizi</p>
                    </div>
                </div>
            </div>
            
            <div class="data-grid-container" style="padding: var(--space-5);">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-3);">
                    ${tactics.map(tactic => {
                        const count = techniques.filter(t => t.tactic === tactic).length;
                        return `
                            <div style="padding: var(--space-4); background: var(--bg-surface-2); border-radius: var(--radius-md); border: 1px solid var(--border-default);">
                                <div style="font-size: var(--text-sm); font-weight: 500; margin-bottom: var(--space-2);">${this.esc(tactic)}</div>
                                <div style="font-size: var(--text-2xl); font-weight: 600; color: ${count > 0 ? 'var(--severity-medium)' : 'var(--text-muted)'};">${count}</div>
                                <div style="font-size: var(--text-xs); color: var(--text-muted);">teknik</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    // ==========================================
    // INTEL (IOCs)
    // ==========================================
    renderIntel() {
        // Merge synthetic IOCs with normalized IOCs
        const syntheticIocs = this.state.data.iocs || [];
        const normalizedIocs = this.state.data.normalizedIocs || [];
        const profile = this.state.data.datasetProfile;
        
        // Convert normalized IOCs to display format
        const allIocs = [
            ...syntheticIocs.map(ioc => ({
                indicator: ioc.indicator,
                type: ioc.type,
                confidence: ioc.confidence,
                tags: ioc.tags || [],
                first_seen: ioc.first_seen,
                last_seen: ioc.last_seen,
                source: 'synthetic'
            })),
            ...normalizedIocs.slice(0, 200).map(ioc => ({
                indicator: ioc.value || ioc.domain || '',
                type: ioc.type || 'unknown',
                confidence: ioc.confidence || 0.5,
                tags: ioc.tags || [],
                label: ioc.label,
                first_seen: null,
                last_seen: null,
                source: ioc.source || 'normalized'
            }))
        ];
        
        // Stats
        const phishingCount = normalizedIocs.filter(i => i.label === 'phishing').length;
        const benignCount = normalizedIocs.filter(i => i.label === 'benign').length;
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Tehdit İstihbaratı</h1>
                        <p class="page-subtitle">${syntheticIocs.length} sentetik + ${normalizedIocs.length} normalize edilmiş IOC</p>
                    </div>
                    <div class="page-actions">
                        <button class="btn btn-secondary btn-sm" onclick="App.exportIOCs()">CSV İndir</button>
                    </div>
                </div>
            </div>
            
            ${profile ? `
            <div class="cards-row" style="margin-bottom: var(--space-4);">
                <div class="kpi-card">
                    <div class="kpi-label">Dataset Dosyaları</div>
                    <div class="kpi-value">${profile.total_files || 0}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Normalize Edilen Olay</div>
                    <div class="kpi-value">${(profile.total_events_normalized || 0).toLocaleString()}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Phishing IOC</div>
                    <div class="kpi-value">${phishingCount.toLocaleString()}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Benign IOC</div>
                    <div class="kpi-value">${benignCount.toLocaleString()}</div>
                </div>
            </div>
            ` : ''}
            
            <div class="data-grid-container">
                <table class="data-grid">
                    <thead>
                        <tr>
                            <th>Gösterge</th>
                            <th>Tip</th>
                            <th>Güven</th>
                            <th>Etiket</th>
                            <th>Kaynak</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allIocs.slice(0, 100).map(ioc => `
                            <tr data-ioc="${this.esc(ioc.indicator)}" class="ioc-row">
                                <td><code class="ioc-value">${this.esc((ioc.indicator || '').substring(0, 60))}${(ioc.indicator || '').length > 60 ? '...' : ''}</code></td>
                                <td><span class="badge badge-neutral">${this.esc(ioc.type)}</span></td>
                                <td>${this.renderConfidenceBadge(ioc.confidence)}</td>
                                <td>${ioc.label ? `<span class="badge ${ioc.label === 'phishing' ? 'badge-danger' : 'badge-info'}">${this.esc(ioc.label)}</span>` : '-'}</td>
                                <td><span class="chip">${this.esc(ioc.source)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${allIocs.length > 100 ? `<p style="padding: var(--space-3); color: var(--text-muted);">İlk 100 IOC gösteriliyor (toplam: ${allIocs.length.toLocaleString()})</p>` : ''}
            </div>
        `;
    },

    // ==========================================
    // REPORTS
    // ==========================================
    renderReports() {
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Raporlar</h1>
                        <p class="page-subtitle">Olay raporları</p>
                    </div>
                </div>
            </div>
            
            <div class="tabs" id="report-tabs">
                <div class="tab active" data-report="executive">Yönetici Özeti</div>
                <div class="tab" data-report="technical">Teknik Rapor</div>
            </div>
            
            <div class="data-grid-container" style="padding: var(--space-5);" id="report-content">
                <div class="empty-state">
                    <p class="empty-state-title">Rapor yükleniyor...</p>
                </div>
            </div>
        `;
    },

    // ==========================================
    // SETTINGS
    // ==========================================
    renderSettings() {
        const s = this.state.settings || this.defaultSettings;
        const tab = this.state.settingsTab || 'general';
        
        return `
            <div class="page-header">
                <div class="page-header-top">
                    <div>
                        <h1 class="page-title">Ayarlar</h1>
                        <p class="page-subtitle">Uygulama yapılandırması</p>
                    </div>
                </div>
            </div>
            
            <div class="tabs" id="settings-tabs">
                <div class="tab ${tab === 'general' ? 'active' : ''}" data-settings-tab="general">Genel</div>
                <div class="tab ${tab === 'notifications' ? 'active' : ''}" data-settings-tab="notifications">Bildirimler</div>
                <div class="tab ${tab === 'appearance' ? 'active' : ''}" data-settings-tab="appearance">Görünüm</div>
                <div class="tab ${tab === 'data' ? 'active' : ''}" data-settings-tab="data">Veri & Depolama</div>
                <div class="tab ${tab === 'integrations' ? 'active' : ''}" data-settings-tab="integrations">Entegrasyonlar</div>
                <div class="tab ${tab === 'about' ? 'active' : ''}" data-settings-tab="about">Hakkında</div>
            </div>
            
            <div class="settings-content" id="settings-content">
                ${this.renderSettingsTab(tab, s)}
            </div>
        `;
    },
    
    renderSettingsTab(tab, s) {
        switch (tab) {
            case 'general':
                return this.renderSettingsGeneral(s);
            case 'notifications':
                return this.renderSettingsNotifications(s);
            case 'appearance':
                return this.renderSettingsAppearance(s);
            case 'data':
                return this.renderSettingsData(s);
            case 'integrations':
                return this.renderSettingsIntegrations();
            case 'about':
                return this.renderSettingsAbout();
            default:
                return this.renderSettingsGeneral(s);
        }
    },
    
    renderSettingsGeneral(s) {
        return `
            <div class="settings-panel">
                <div class="settings-section">
                    <h3 class="settings-section-title">Bölgesel Ayarlar</h3>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Dil</span>
                            <span class="settings-label-desc">Arayüz dili</span>
                        </div>
                        <select class="form-select settings-input" id="setting-language" onchange="App.updateSetting('language', this.value)">
                            <option value="tr" ${s.language === 'tr' ? 'selected' : ''}>Türkçe</option>
                            <option value="en" ${s.language === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Saat Dilimi</span>
                            <span class="settings-label-desc">Tarih/saat gösterimi için</span>
                        </div>
                        <select class="form-select settings-input" id="setting-timezone" onchange="App.updateSetting('timezone', this.value)">
                            <option value="Europe/Istanbul" ${s.timezone === 'Europe/Istanbul' ? 'selected' : ''}>Europe/Istanbul (UTC+3)</option>
                            <option value="UTC" ${s.timezone === 'UTC' ? 'selected' : ''}>UTC</option>
                            <option value="Europe/London" ${s.timezone === 'Europe/London' ? 'selected' : ''}>Europe/London</option>
                            <option value="America/New_York" ${s.timezone === 'America/New_York' ? 'selected' : ''}>America/New_York</option>
                        </select>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Tarih Formatı</span>
                            <span class="settings-label-desc">Tarih gösterim şekli</span>
                        </div>
                        <select class="form-select settings-input" id="setting-dateFormat" onchange="App.updateSetting('dateFormat', this.value)">
                            <option value="DD.MM.YYYY HH:mm" ${s.dateFormat === 'DD.MM.YYYY HH:mm' ? 'selected' : ''}>31.12.2026 23:59</option>
                            <option value="YYYY-MM-DD HH:mm" ${s.dateFormat === 'YYYY-MM-DD HH:mm' ? 'selected' : ''}>2026-12-31 23:59</option>
                            <option value="MM/DD/YYYY HH:mm" ${s.dateFormat === 'MM/DD/YYYY HH:mm' ? 'selected' : ''}>12/31/2026 23:59</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Oturum</h3>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Oturum Zaman Aşımı</span>
                            <span class="settings-label-desc">İşlem yapılmadığında otomatik çıkış</span>
                        </div>
                        <select class="form-select settings-input" id="setting-sessionTimeout" onchange="App.updateSetting('sessionTimeout', parseInt(this.value))">
                            <option value="15" ${s.sessionTimeout === 15 ? 'selected' : ''}>15 dakika</option>
                            <option value="30" ${s.sessionTimeout === 30 ? 'selected' : ''}>30 dakika</option>
                            <option value="60" ${s.sessionTimeout === 60 ? 'selected' : ''}>1 saat</option>
                            <option value="120" ${s.sessionTimeout === 120 ? 'selected' : ''}>2 saat</option>
                            <option value="0" ${s.sessionTimeout === 0 ? 'selected' : ''}>Asla</option>
                        </select>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Oturumu Sonlandır</span>
                            <span class="settings-label-desc">Güvenli çıkış yap</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="App.logout()">Çıkış Yap</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderSettingsNotifications(s) {
        const n = s.notifications || {};
        return `
            <div class="settings-panel">
                <div class="settings-section">
                    <h3 class="settings-section-title">Bildirim Tercihleri</h3>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Masaüstü Bildirimleri</span>
                            <span class="settings-label-desc">Tarayıcı bildirimleri al</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" ${n.desktop ? 'checked' : ''} onchange="App.updateNestedSetting('notifications', 'desktop', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Ses Bildirimleri</span>
                            <span class="settings-label-desc">Kritik uyarılarda ses çal</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" ${n.sound ? 'checked' : ''} onchange="App.updateNestedSetting('notifications', 'sound', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Kritik Uyarı Popup</span>
                            <span class="settings-label-desc">Kritik uyarılarda tam ekran bildirim</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" ${n.criticalPopup ? 'checked' : ''} onchange="App.updateNestedSetting('notifications', 'criticalPopup', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Bildirim Testi</h3>
                    <p style="color: var(--text-muted); margin-bottom: var(--space-3);">Bildirim ayarlarınızı test edin</p>
                    <button class="btn btn-secondary btn-sm" onclick="App.testNotification()">Test Bildirimi Gönder</button>
                </div>
            </div>
        `;
    },
    
    renderSettingsAppearance(s) {
        return `
            <div class="settings-panel">
                <div class="settings-section">
                    <h3 class="settings-section-title">Tema</h3>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Renk Teması</span>
                            <span class="settings-label-desc">Arayüz renk şeması</span>
                        </div>
                        <div class="theme-selector">
                            <button class="theme-option ${s.theme === 'dark' ? 'active' : ''}" onclick="App.updateSetting('theme', 'dark')">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                </svg>
                                <span>Karanlık</span>
                            </button>
                            <button class="theme-option ${s.theme === 'light' ? 'active' : ''}" onclick="App.updateSetting('theme', 'light')">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                </svg>
                                <span>Aydınlık</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Görünüm</h3>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Tablo Yoğunluğu</span>
                            <span class="settings-label-desc">Satır aralığı</span>
                        </div>
                        <select class="form-select settings-input" id="setting-tableDensity" onchange="App.updateSetting('tableDensity', this.value)">
                            <option value="compact" ${s.tableDensity === 'compact' ? 'selected' : ''}>Kompakt</option>
                            <option value="normal" ${s.tableDensity === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="comfortable" ${s.tableDensity === 'comfortable' ? 'selected' : ''}>Geniş</option>
                        </select>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Sidebar</span>
                            <span class="settings-label-desc">Sol menü görünümü</span>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" ${s.sidebarExpanded ? 'checked' : ''} onchange="App.updateSetting('sidebarExpanded', this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderSettingsData(s) {
        // Calculate localStorage usage
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length * 2; // UTF-16 characters = 2 bytes
            }
        }
        const sizeKB = (totalSize / 1024).toFixed(2);
        const savedSearchCount = this.state.savedSearches?.length || 0;
        const warRoomCount = Object.keys(localStorage).filter(k => k.startsWith('soc_warroom_')).length;
        
        return `
            <div class="settings-panel">
                <div class="settings-section">
                    <h3 class="settings-section-title">Yerel Depolama</h3>
                    
                    <div class="storage-stats">
                        <div class="storage-stat">
                            <span class="storage-stat-value">${sizeKB} KB</span>
                            <span class="storage-stat-label">Toplam Kullanım</span>
                        </div>
                        <div class="storage-stat">
                            <span class="storage-stat-value">${savedSearchCount}</span>
                            <span class="storage-stat-label">Kayıtlı Arama</span>
                        </div>
                        <div class="storage-stat">
                            <span class="storage-stat-value">${warRoomCount}</span>
                            <span class="storage-stat-label">War Room Notu</span>
                        </div>
                        <div class="storage-stat">
                            <span class="storage-stat-value">${this.state.soar.runs?.length || 0}</span>
                            <span class="storage-stat-label">Playbook Çalışması</span>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Veri Yönetimi</h3>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Kayıtlı Aramaları Temizle</span>
                            <span class="settings-label-desc">${savedSearchCount} kayıtlı arama silinecek</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="App.clearSavedSearches()">Temizle</button>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">War Room Notlarını Temizle</span>
                            <span class="settings-label-desc">Tüm vaka notları silinecek</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="App.clearWarRoomNotes()">Temizle</button>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">EDR Durumlarını Sıfırla</span>
                            <span class="settings-label-desc">Cihaz izolasyonları sıfırlanacak</span>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="App.clearEdrState()">Sıfırla</button>
                    </div>
                    
                    <div class="settings-row">
                        <div class="settings-label">
                            <span class="settings-label-text">Tüm Yerel Verileri Sil</span>
                            <span class="settings-label-desc danger-text">Dikkat: Bu işlem geri alınamaz</span>
                        </div>
                        <button class="btn btn-danger btn-sm" onclick="App.clearAllLocalData()">Tümünü Sil</button>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderSettingsIntegrations() {
        const integrations = [
            { id: 'virustotal', name: 'VirusTotal', status: 'connected', icon: 'V' },
            { id: 'shodan', name: 'Shodan', status: 'connected', icon: 'S' },
            { id: 'abuseipdb', name: 'AbuseIPDB', status: 'warning', icon: 'A' },
            { id: 'misp', name: 'MISP', status: 'disconnected', icon: 'M' },
            { id: 'paloalto', name: 'Palo Alto', status: 'connected', icon: 'P' },
            { id: 'azure', name: 'Azure AD', status: 'connected', icon: 'Az' },
            { id: 'o365', name: 'Office 365', status: 'connected', icon: 'O' },
            { id: 'crowdstrike', name: 'CrowdStrike', status: 'disconnected', icon: 'C' }
        ];
        
        return `
            <div class="settings-panel">
                <div class="settings-section">
                    <h3 class="settings-section-title">Entegrasyon Durumu</h3>
                    <p style="color: var(--text-muted); margin-bottom: var(--space-4);">
                        <span class="badge badge-warning">SİMÜLASYON</span>
                        Bu entegrasyonlar simüle edilmiştir.
                    </p>
                    
                    <div class="integration-grid">
                        ${integrations.map(i => `
                            <div class="integration-card ${i.status}">
                                <div class="integration-icon">${i.icon}</div>
                                <div class="integration-info">
                                    <div class="integration-name">${this.esc(i.name)}</div>
                                    <div class="integration-status">
                                        ${i.status === 'connected' ? '<span class="status-indicator ok"></span> Bağlı' :
                                          i.status === 'warning' ? '<span class="status-indicator warning"></span> Uyarı' :
                                          '<span class="status-indicator error"></span> Bağlı Değil'}
                                    </div>
                                </div>
                                <button class="btn btn-ghost btn-sm">Yapılandır</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },
    
    renderSettingsAbout() {
        return `
            <div class="settings-panel">
                <div class="settings-section">
                    <h3 class="settings-section-title">Uygulama Bilgileri</h3>
                    
                    <div class="about-info">
                        <div class="about-logo">
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--brand)" stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <h2 style="margin: var(--space-3) 0 var(--space-1);">SOC Konsol</h2>
                        <p style="color: var(--text-muted);">Enterprise Security Dashboard</p>
                    </div>
                    
                    <div class="info-grid" style="margin-top: var(--space-5);">
                        <span class="info-label">Versiyon</span>
                        <span class="info-value">1.0.0</span>
                        <span class="info-label">Build</span>
                        <span class="info-value">2026.01.21</span>
                        <span class="info-label">Platform</span>
                        <span class="info-value">GitHub Pages (Static)</span>
                        <span class="info-label">Lisans</span>
                        <span class="info-value">MIT License</span>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Bağlantılar</h3>
                    <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
                        <a href="https://github.com/yatuk/SOC-case-study-project" target="_blank" class="btn btn-secondary btn-sm">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right: 6px;">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                        </a>
                        <a href="#" class="btn btn-secondary btn-sm" onclick="App.showChangelog(); return false;">
                            Değişiklik Günlüğü
                        </a>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Teknolojiler</h3>
                    <div class="tech-badges">
                        <span class="chip">HTML5</span>
                        <span class="chip">CSS3</span>
                        <span class="chip">Vanilla JS</span>
                        <span class="chip">Python 3</span>
                        <span class="chip">GitHub Pages</span>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Settings helpers
    updateSetting(key, value) {
        this.state.settings[key] = value;
        this.saveSettings();
        
        if (key === 'theme') {
            this.applyTheme(value);
        }
        
        this.toast('Ayar kaydedildi', 'success');
    },
    
    updateNestedSetting(parent, key, value) {
        if (!this.state.settings[parent]) {
            this.state.settings[parent] = {};
        }
        this.state.settings[parent][key] = value;
        this.saveSettings();
        this.toast('Ayar kaydedildi', 'success');
    },
    
    testNotification() {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('SOC Konsol', {
                        body: 'Bu bir test bildirimidir.',
                        icon: './favicon.ico'
                    });
                }
            });
        }
        this.toast('Test bildirimi gönderildi', 'info');
    },
    
    clearSavedSearches() {
        this.state.savedSearches = [];
        this.saveSavedSearches();
        this.toast('Kayıtlı aramalar temizlendi', 'success');
        this.renderView();
    },
    
    clearWarRoomNotes() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('soc_warroom_'));
        keys.forEach(k => localStorage.removeItem(k));
        this.toast('War Room notları temizlendi', 'success');
        this.renderView();
    },
    
    clearEdrState() {
        this.state.edr = {};
        this.saveEdrState();
        this.toast('EDR durumları sıfırlandı', 'success');
        this.renderView();
    },
    
    clearAllLocalData() {
        if (confirm('Tüm yerel veriler silinecek. Devam etmek istiyor musunuz?')) {
            const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('soc_'));
            keysToRemove.forEach(k => localStorage.removeItem(k));
            this.state.edr = {};
            this.state.soar = { runs: [], active: null };
            this.state.savedSearches = [];
            this.state.settings = { ...this.defaultSettings };
            this.toast('Tüm veriler temizlendi', 'warning');
            this.renderView();
        }
    },
    
    showChangelog() {
        this.toast('Değişiklik günlüğü henüz mevcut değil', 'info');
    },
    
    logout() {
        if (typeof Auth !== 'undefined') {
            Auth.logout();
            window.location.href = './login.html';
        }
    },

    // ==========================================
    // FILTER BAR
    // ==========================================
    renderFilterBar(type) {
        return `
            <div class="toolbar">
                <div class="toolbar-search">
                    <svg viewBox="0 0 24 24" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="${type}-filter-search" placeholder="Ara...">
                </div>
                <div class="toolbar-group">
                    <select class="form-select" style="width: auto;" id="filter-${type}-severity">
                        <option value="">Tüm Seviyeler</option>
                        <option value="critical">Kritik</option>
                        <option value="high">Yüksek</option>
                        <option value="medium">Orta</option>
                        <option value="low">Düşük</option>
                    </select>
                </div>
            </div>
        `;
    },

    // ==========================================
    // DRAWER
    // ==========================================
    openDrawer(type, id) {
        this.state.drawer = { open: true, type, id, tab: 0 };
        document.getElementById('drawer-overlay')?.classList.add('open');
        document.getElementById('drawer')?.classList.add('open');
        this.renderDrawerContent();
    },

    closeDrawer() {
        this.state.drawer.open = false;
        document.getElementById('drawer-overlay')?.classList.remove('open');
        document.getElementById('drawer')?.classList.remove('open');
    },

    renderDrawerContent() {
        const { type, id, tab } = this.state.drawer;
        const title = document.getElementById('drawer-title');
        const subtitle = document.getElementById('drawer-subtitle');
        const tabs = document.getElementById('drawer-tabs');
        const body = document.getElementById('drawer-body');
        const footer = document.getElementById('drawer-footer');
        
        if (type === 'alert') {
            const alert = this.state.data.alerts?.find(a => (a.alert_id || a.id) === id);
            if (!alert) return;
            
            title.textContent = alert.alert_name || alert.name || alert.title;
            subtitle.textContent = `${this.formatTime(alert.timestamp || alert.ts)}`;
            tabs.innerHTML = `
                <button class="drawer-tab ${tab === 0 ? 'active' : ''}" onclick="App.switchDrawerTab(0)">Özet</button>
                <button class="drawer-tab ${tab === 1 ? 'active' : ''}" onclick="App.switchDrawerTab(1)">Kanıt</button>
                <button class="drawer-tab ${tab === 2 ? 'active' : ''}" onclick="App.switchDrawerTab(2)">MITRE</button>
                <button class="drawer-tab ${tab === 3 ? 'active' : ''}" onclick="App.switchDrawerTab(3)">Yanıt</button>
            `;
            
            if (tab === 0) {
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="info-grid">
                            <span class="info-label">Seviye</span>
                            <span class="info-value">${this.renderSeverityBadge(alert.severity)}</span>
                            <span class="info-label">Güven</span>
                            <span class="info-value">${this.esc(alert.confidence || 'N/A')}</span>
                            <span class="info-label">Kullanıcı</span>
                            <span class="info-value">${this.esc(alert.user || alert.affected_user || '—')}</span>
                            <span class="info-label">Kaynak IP</span>
                            <span class="info-value"><code>${this.esc(alert.src_ip || alert.source_ip || '—')}</code></span>
                            <span class="info-label">Cihaz</span>
                            <span class="info-value">${this.esc(alert.device || '—')}</span>
                        </div>
                    </div>
                    <div class="drawer-section">
                        <div class="drawer-section-title">Hipotez</div>
                        <p>${this.esc(alert.hypothesis || alert.description || '—')}</p>
                    </div>
                `;
            } else if (tab === 1) {
                const evidence = alert.evidence_event_ids || alert.evidence || [];
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="drawer-section-title">Kanıt Olayları</div>
                        ${evidence.map(e => `<div class="chip" style="margin: 2px;">${this.esc(e)}</div>`).join('')}
                    </div>
                `;
            } else if (tab === 2) {
                const techniques = alert.mitre_techniques || alert.techniques || [];
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="drawer-section-title">MITRE ATT&CK Teknikleri</div>
                        ${techniques.map(t => `<span class="badge badge-info" style="margin: 2px;">${this.esc(t)}</span>`).join('')}
                    </div>
                `;
            } else if (tab === 3) {
                const actions = alert.recommended_actions || [];
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="drawer-section-title">Önerilen Aksiyonlar</div>
                        ${actions.map((a, i) => `
                            <div style="padding: var(--space-2) 0; border-bottom: 1px solid var(--border-default);">
                                <span style="color: var(--text-muted); margin-right: var(--space-2);">${i + 1}.</span>
                                ${this.esc(a)}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            footer.innerHTML = `
                <button class="btn btn-secondary btn-sm" onclick="App.closeDrawer()">Kapat</button>
                <button class="btn btn-primary btn-sm" onclick="App.copyAlertDetails('${this.esc(id)}')">Kopyala</button>
            `;
        }
        
        if (type === 'device') {
            const device = this.state.data.devices?.find(d => d.device_id === id || d.id === id);
            if (!device) return;
            
            const state = this.getDeviceState(id);
            const deviceId = device.device_id || device.id;
            
            title.textContent = device.hostname;
            subtitle.innerHTML = `${this.esc(device.os || '—')} • Risk: ${device.risk_score || 0}`;
            tabs.innerHTML = `
                <button class="drawer-tab ${tab === 0 ? 'active' : ''}" onclick="App.switchDrawerTab(0)">Genel</button>
                <button class="drawer-tab ${tab === 1 ? 'active' : ''}" onclick="App.switchDrawerTab(1)">Uyarılar</button>
                <button class="drawer-tab ${tab === 2 ? 'active' : ''}" onclick="App.switchDrawerTab(2)">Proses Ağacı</button>
                <button class="drawer-tab ${tab === 3 ? 'active' : ''}" onclick="App.switchDrawerTab(3)">Ağ Haritası</button>
                <button class="drawer-tab ${tab === 4 ? 'active' : ''}" onclick="App.switchDrawerTab(4)">Aksiyonlar</button>
            `;
            
            if (tab === 0) {
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="info-grid">
                            <span class="info-label">Cihaz ID</span>
                            <span class="info-value"><code>${this.esc(deviceId)}</code></span>
                            <span class="info-label">Hostname</span>
                            <span class="info-value"><strong>${this.esc(device.hostname)}</strong></span>
                            <span class="info-label">İşletim Sistemi</span>
                            <span class="info-value">${this.esc(device.os || '—')}</span>
                            <span class="info-label">Sahip</span>
                            <span class="info-value">${this.esc(device.owner || device.owner_user || '—')}</span>
                            <span class="info-label">Konum</span>
                            <span class="info-value">${this.esc(device.location || '—')}</span>
                            <span class="info-label">İlk Görülme</span>
                            <span class="info-value">${this.formatTime(device.first_seen)}</span>
                            <span class="info-label">Son Görülme</span>
                            <span class="info-value">${this.formatTime(device.last_seen)}</span>
                            <span class="info-label">Risk Skoru</span>
                            <span class="info-value">
                                <div class="risk-indicator">
                                    ${this.renderRiskBar(device.risk_score || 0)}
                                    <span>${device.risk_score || 0}</span>
                                </div>
                            </span>
                            <span class="info-label">Durum</span>
                            <span class="info-value">${state.isolated ? '<span class="badge badge-critical">İZOLE</span>' : '<span class="badge badge-low">Aktif</span>'}</span>
                        </div>
                    </div>
                    
                    <div class="drawer-section">
                        <div class="drawer-section-title">Hızlı Aksiyonlar <span class="badge badge-warning" style="margin-left: 8px;">SİMÜLASYON</span></div>
                        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3);">
                            ${state.isolated ? 
                                `<button class="btn btn-secondary btn-sm" onclick="App.performEdrAction('${this.esc(deviceId)}', 'release')">İzolasyonu Kaldır</button>` :
                                `<button class="btn btn-danger btn-sm" onclick="App.performEdrAction('${this.esc(deviceId)}', 'isolate')">İzole Et</button>`
                            }
                            <button class="btn btn-secondary btn-sm" onclick="App.performEdrAction('${this.esc(deviceId)}', 'scan')">AV Taraması</button>
                            <button class="btn btn-secondary btn-sm" onclick="App.performEdrAction('${this.esc(deviceId)}', 'collect')">Paket Topla</button>
                        </div>
                    </div>
                `;
            } else if (tab === 1) {
                const deviceAlerts = this.state.data.alerts?.filter(a => a.device === device.hostname || a.affected_device === device.hostname) || [];
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="drawer-section-title">Cihaz Uyarıları (${deviceAlerts.length})</div>
                        ${deviceAlerts.map(a => `
                            <div style="padding: var(--space-3); margin-bottom: var(--space-2); background: var(--bg-surface-2); border-radius: var(--radius-md); cursor: pointer;" onclick="App.openDrawer('alert', '${this.esc(a.alert_id || a.id)}')">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 500;">${this.esc(a.alert_name || a.name || a.title)}</span>
                                    ${this.renderSeverityBadge(a.severity)}
                                </div>
                                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--space-1);">${this.formatTime(a.timestamp || a.ts)}</div>
                            </div>
                        `).join('') || '<p style="color: var(--text-muted);">Uyarı yok</p>'}
                    </div>
                `;
            } else if (tab === 2) {
                // Process Tree Tab
                body.innerHTML = this.renderProcessTree(device);
            } else if (tab === 3) {
                // Network Map Tab
                body.innerHTML = this.renderNetworkMap(device);
            } else if (tab === 4) {
                // Actions Tab
                body.innerHTML = this.renderEdrActionsPanel(device, state, deviceId);
            }
            
            footer.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="App.closeDrawer()">Kapat</button>`;
        }
        
        if (type === 'case') {
            const caseData = this.state.data.cases?.find(c => c.case_id === id);
            if (!caseData) return;
            
            title.textContent = caseData.title;
            subtitle.textContent = caseData.case_id;
            tabs.innerHTML = `
                <button class="drawer-tab ${tab === 0 ? 'active' : ''}" onclick="App.switchDrawerTab(0)">Özet</button>
                <button class="drawer-tab ${tab === 1 ? 'active' : ''}" onclick="App.switchDrawerTab(1)">Uyarılar</button>
                <button class="drawer-tab ${tab === 2 ? 'active' : ''}" onclick="App.switchDrawerTab(2)">War Room</button>
            `;
            
            if (tab === 0) {
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="info-grid">
                            <span class="info-label">Seviye</span>
                            <span class="info-value">${this.renderSeverityBadge(caseData.severity)}</span>
                            <span class="info-label">Durum</span>
                            <span class="info-value">${this.renderStatusBadge(caseData.status)}</span>
                            <span class="info-label">Başlangıç</span>
                            <span class="info-value">${this.formatTime(caseData.start_ts)}</span>
                            <span class="info-label">Etkilenen</span>
                            <span class="info-value">${(caseData.affected_users || []).join(', ') || '—'}</span>
                        </div>
                    </div>
                    <div class="drawer-section">
                        <div class="drawer-section-title">Açıklama</div>
                        <p>${this.esc(caseData.narrative || '—')}</p>
                    </div>
                `;
            } else if (tab === 1) {
                const caseAlerts = this.state.data.alerts?.filter(a => a.case_id === id) || [];
                body.innerHTML = `
                    <div class="drawer-section">
                        ${caseAlerts.map(a => `
                            <div style="padding: var(--space-3); margin-bottom: var(--space-2); background: var(--bg-surface-2); border-radius: var(--radius-md);">
                                <div style="font-weight: 500;">${this.esc(a.alert_name || a.name)}</div>
                                <div style="font-size: var(--text-xs); color: var(--text-muted);">${this.formatTime(a.timestamp || a.ts)}</div>
                            </div>
                        `).join('') || '<p>Uyarı yok</p>'}
                    </div>
                `;
            } else if (tab === 2) {
                const notes = this.getWarRoomNotes(id);
                body.innerHTML = `
                    <div class="drawer-section">
                        <div class="drawer-section-title">Aktivite</div>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${notes.map(n => `
                                <div style="padding: var(--space-3); margin-bottom: var(--space-2); background: var(--bg-surface-2); border-radius: var(--radius-md);">
                                    <div style="font-size: var(--text-xs); color: var(--text-muted);">${this.formatTime(n.time)}</div>
                                    <div>${this.esc(n.message)}</div>
                                </div>
                            `).join('') || '<p style="color: var(--text-muted);">Henüz aktivite yok</p>'}
                        </div>
                    </div>
                    <div class="drawer-section">
                        <textarea class="form-input" id="war-room-note" rows="2" placeholder="Not ekle..."></textarea>
                        <button class="btn btn-primary btn-sm" style="margin-top: var(--space-2);" onclick="App.addWarRoomNote('${this.esc(id)}')">Ekle</button>
                    </div>
                `;
            }
            
            footer.innerHTML = `
                <button class="btn btn-secondary btn-sm" onclick="App.closeDrawer()">Kapat</button>
                <button class="btn btn-primary btn-sm" onclick="App.showPlaybookRunner(null, '${this.esc(id)}')">Playbook Çalıştır</button>
            `;
        }
        
        if (type === 'event') {
            const event = this.state.data.events?.find(e => (e.event_id || e.id) === id);
            if (!event) return;
            
            title.textContent = event.event_type || 'Olay Detayı';
            subtitle.textContent = this.formatTime(event.ts || event.timestamp);
            tabs.innerHTML = `
                <button class="drawer-tab active">Ham Veri</button>
            `;
            
            body.innerHTML = `
                <div class="drawer-section">
                    <div class="info-grid">
                        <span class="info-label">Kaynak</span>
                        <span class="info-value">${this.esc(event.source || '—')}</span>
                        <span class="info-label">Tip</span>
                        <span class="info-value">${this.esc(event.event_type || '—')}</span>
                        <span class="info-label">Kullanıcı</span>
                        <span class="info-value">${this.esc(event.user || '—')}</span>
                        <span class="info-label">Cihaz</span>
                        <span class="info-value">${this.esc(event.device || '—')}</span>
                        <span class="info-label">IP</span>
                        <span class="info-value"><code>${this.esc(event.src_ip || '—')}</code></span>
                    </div>
                </div>
                <div class="drawer-section">
                    <div class="drawer-section-title">Ham JSON</div>
                    <pre style="background: var(--bg-surface-2); padding: var(--space-3); border-radius: var(--radius-md); overflow: auto; font-size: var(--text-xs);">${this.esc(JSON.stringify(event, null, 2))}</pre>
                </div>
            `;
            
            footer.innerHTML = `
                <button class="btn btn-secondary btn-sm" onclick="App.closeDrawer()">Kapat</button>
                <button class="btn btn-secondary btn-sm" onclick="App.copyEventJson('${this.esc(id)}')">JSON Kopyala</button>
            `;
        }
    },

    switchDrawerTab(tab) {
        this.state.drawer.tab = tab;
        this.renderDrawerContent();
    },

    // ==========================================
    // VIEW EVENT BINDING
    // ==========================================
    bindViewEvents() {
        // Alert rows
        document.querySelectorAll('.alert-row').forEach(row => {
            row.addEventListener('click', () => {
                this.openDrawer('alert', row.dataset.alertId);
            });
        });

        // Case rows
        document.querySelectorAll('.case-row').forEach(row => {
            row.addEventListener('click', () => {
                this.openDrawer('case', row.dataset.caseId);
            });
        });

        // Device rows
        document.querySelectorAll('.device-row').forEach(row => {
            row.addEventListener('click', () => {
                this.openDrawer('device', row.dataset.deviceId);
            });
        });

        // Event rows
        document.querySelectorAll('.event-row').forEach(row => {
            row.addEventListener('click', () => {
                this.openDrawer('event', row.dataset.eventId);
            });
        });

        // Entity rows
        document.querySelectorAll('.entity-row').forEach(row => {
            row.addEventListener('click', () => {
                // Could open entity drawer
            });
        });

        // Report tabs
        document.querySelectorAll('#report-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#report-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.loadReport(tab.dataset.report);
            });
        });

        // Automation tabs
        document.querySelectorAll('#automation-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#automation-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const content = document.getElementById('automation-content');
                if (tab.dataset.tab === 'library') {
                    content.innerHTML = this.renderPlaybookLibrary(this.state.data.playbooks || []);
                } else if (tab.dataset.tab === 'runs') {
                    content.innerHTML = this.renderPlaybookRuns();
                } else if (tab.dataset.tab === 'visualize') {
                    content.innerHTML = this.renderPlaybookSelector();
                }
                this.bindViewEvents();
            });
        });

        // Load executive report by default
        if (this.state.view === 'reports') {
            this.loadReport('executive');
        }
        
        // Settings tabs
        document.querySelectorAll('#settings-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#settings-tabs .tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.state.settingsTab = tab.dataset.settingsTab;
                const content = document.getElementById('settings-content');
                if (content) {
                    content.innerHTML = this.renderSettingsTab(this.state.settingsTab, this.state.settings);
                }
            });
        });
    },

    // ==========================================
    // EDR ACTIONS
    // ==========================================
    performEdrAction(deviceId, action) {
        if (!this.state.edr[deviceId]) {
            this.state.edr[deviceId] = { isolated: false, actions: [] };
        }
        
        const state = this.state.edr[deviceId];
        const timestamp = new Date().toISOString();
        
        switch (action) {
            case 'isolate':
                state.isolated = true;
                this.toast('Cihaz ağdan izole edildi (simülasyon)', 'warning');
                break;
            case 'release':
                state.isolated = false;
                this.toast('İzolasyon kaldırıldı, cihaz ağa bağlandı (simülasyon)', 'success');
                break;
            case 'scan':
                this.toast('Tam AV taraması başlatıldı (simülasyon)', 'info');
                // Simulate scan completion after delay
                setTimeout(() => this.toast('AV taraması tamamlandı: 0 tehdit bulundu', 'success'), 3000);
                break;
            case 'collect':
                this.toast('Triyaj paketi toplanıyor... (simülasyon)', 'info');
                setTimeout(() => this.toast('Triyaj paketi hazır: forensic_data.zip', 'success'), 2000);
                break;
            case 'kill_process':
                this.toast('Şüpheli prosesler sonlandırıldı (simülasyon)', 'warning');
                break;
            case 'quarantine':
                this.toast('Zararlı dosyalar karantinaya alındı (simülasyon)', 'warning');
                break;
        }
        
        state.actions = state.actions || [];
        state.actions.push({ action, time: timestamp });
        
        this.saveEdrState();
        this.renderDrawerContent();
    },

    // ==========================================
    // PLAYBOOK RUNNER
    // ==========================================
    showPlaybookRunner(playbookId, caseId) {
        // Simple prompt for now
        const playbooks = this.state.data.playbooks || [];
        if (!playbookId && playbooks.length > 0) {
            playbookId = playbooks[0].id;
        }
        
        const cases = this.state.data.cases || [];
        if (!caseId && cases.length > 0) {
            caseId = cases[0].case_id;
        }
        
        this.runPlaybook(playbookId, caseId);
    },

    runPlaybook(playbookId, caseId) {
        const playbook = this.state.data.playbooks?.find(p => p.id === playbookId);
        if (!playbook) {
            this.toast('Playbook bulunamadı', 'error');
            return;
        }
        
        const run = {
            id: 'run_' + Date.now(),
            playbook_id: playbookId,
            playbook_name: playbook.name,
            case_id: caseId,
            started_at: new Date().toISOString(),
            status: 'running',
            steps: playbook.steps?.map(s => ({ ...s, status: 'pending' })) || []
        };
        
        this.state.soar.runs.push(run);
        this.state.soar.active = run.id;
        this.saveSoarState();
        
        this.toast(`"${playbook.name}" çalıştırılıyor...`, 'info');
        
        // Simulate step execution
        this.executePlaybookSteps(run);
    },

    async executePlaybookSteps(run) {
        for (let i = 0; i < run.steps.length; i++) {
            run.steps[i].status = 'running';
            this.saveSoarState();
            
            // Simulate delay
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
            
            run.steps[i].status = 'completed';
            this.saveSoarState();
        }
        
        run.status = 'completed';
        run.finished_at = new Date().toISOString();
        this.state.soar.active = null;
        this.saveSoarState();
        
        this.toast(`Playbook tamamlandı`, 'success');
        
        // Add war room note
        if (run.case_id) {
            this.addWarRoomNoteInternal(run.case_id, `Playbook "${run.playbook_name}" tamamlandı`);
        }
    },

    renderPlaybookRuns() {
        const runs = this.state.soar.runs || [];
        
        return `
            <div class="main-view">
                <div class="toolbar">
                    <span style="color: var(--text-muted);">${runs.length} çalışma</span>
                    <button class="btn btn-ghost btn-sm" onclick="App.clearPlaybookRuns()">Geçmişi Temizle</button>
                </div>
                <div class="data-grid-container">
                    <table class="data-grid">
                        <thead>
                            <tr>
                                <th>Playbook</th>
                                <th>Vaka</th>
                                <th>Durum</th>
                                <th>Adımlar</th>
                                <th>Başlangıç</th>
                                <th>Bitiş</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${runs.map(r => `
                                <tr class="playbook-run-row" data-run-id="${this.esc(r.id)}">
                                    <td>${this.esc(r.playbook_name)}</td>
                                    <td><code>${this.esc(r.case_id || '—')}</code></td>
                                    <td>${this.renderRunStatus(r.status)}</td>
                                    <td>${this.renderRunProgress(r)}</td>
                                    <td>${this.formatTime(r.started_at)}</td>
                                    <td>${r.finished_at ? this.formatTime(r.finished_at) : '—'}</td>
                                    <td>
                                        <button class="btn btn-ghost btn-sm" onclick="App.showRunDetails('${this.esc(r.id)}')" title="Detay">
                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2">
                                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Çalışma yok</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    
    renderRunStatus(status) {
        const statuses = {
            pending: '<span class="badge badge-neutral">Bekliyor</span>',
            running: '<span class="badge badge-info">Çalışıyor</span>',
            waiting_approval: '<span class="badge badge-warning">Onay Bekliyor</span>',
            completed: '<span class="badge badge-low">Tamamlandı</span>',
            failed: '<span class="badge badge-critical">Başarısız</span>'
        };
        return statuses[status] || statuses.pending;
    },
    
    renderRunProgress(run) {
        const steps = run.steps || [];
        const completed = steps.filter(s => s.status === 'completed').length;
        const total = steps.length;
        const percent = total > 0 ? Math.round(completed / total * 100) : 0;
        
        return `
            <div style="display: flex; align-items: center; gap: var(--space-2);">
                <div style="flex: 1; height: 6px; background: var(--bg-active); border-radius: 3px; overflow: hidden; min-width: 60px;">
                    <div style="height: 100%; width: ${percent}%; background: var(--color-success);"></div>
                </div>
                <span style="font-size: var(--text-xs); color: var(--text-muted);">${completed}/${total}</span>
            </div>
        `;
    },
    
    showRunDetails(runId) {
        const run = this.state.soar.runs?.find(r => r.id === runId);
        if (!run) return;
        
        // Open drawer with run details
        this.state.drawer = { open: true, type: 'run', id: runId, tab: 0 };
        document.getElementById('drawer-overlay')?.classList.add('open');
        document.getElementById('drawer')?.classList.add('open');
        
        const title = document.getElementById('drawer-title');
        const subtitle = document.getElementById('drawer-subtitle');
        const tabs = document.getElementById('drawer-tabs');
        const body = document.getElementById('drawer-body');
        const footer = document.getElementById('drawer-footer');
        
        if (title) title.textContent = run.playbook_name;
        if (subtitle) subtitle.textContent = `Çalışma: ${run.id}`;
        if (tabs) tabs.innerHTML = '';
        
        const steps = run.steps || [];
        if (body) {
            body.innerHTML = `
                <div class="drawer-section">
                    <div class="info-grid">
                        <span class="info-label">Durum</span>
                        <span class="info-value">${this.renderRunStatus(run.status)}</span>
                        <span class="info-label">Vaka</span>
                        <span class="info-value"><code>${this.esc(run.case_id || '—')}</code></span>
                        <span class="info-label">Başlangıç</span>
                        <span class="info-value">${this.formatTime(run.started_at)}</span>
                        <span class="info-label">Bitiş</span>
                        <span class="info-value">${run.finished_at ? this.formatTime(run.finished_at) : '—'}</span>
                    </div>
                </div>
                
                <div class="drawer-section">
                    <div class="drawer-section-title">Adım İlerlemesi</div>
                    <div class="stepper">
                        ${steps.map((step, i) => `
                            <div class="step ${step.status === 'completed' ? 'completed' : step.status === 'running' ? 'active' : ''}">
                                <div class="step-indicator" style="background: ${step.status === 'completed' ? 'var(--color-success)' : step.status === 'running' ? 'var(--color-warning)' : 'var(--bg-active)'};">
                                    ${step.status === 'completed' ? '✓' : i + 1}
                                </div>
                                <div class="step-content">
                                    <div class="step-title">${this.esc(step.name)}</div>
                                    <div class="step-desc">${this.esc(step.type)} • ${step.status}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (footer) {
            footer.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="App.closeDrawer()">Kapat</button>`;
        }
    },
    
    clearPlaybookRuns() {
        if (confirm('Tüm playbook çalışma geçmişi silinecek. Devam?')) {
            this.state.soar.runs = [];
            this.saveSoarState();
            this.toast('Geçmiş temizlendi', 'success');
            this.renderView();
        }
    },
    
    renderPlaybookSelector() {
        const playbooks = this.state.data.playbooks || [];
        
        return `
            <div class="main-view" style="padding: var(--space-5);">
                <div style="text-align: center; padding: var(--space-7);">
                    <h3 style="color: var(--text-primary); margin-bottom: var(--space-3);">Playbook Seçin</h3>
                    <p style="color: var(--text-muted); margin-bottom: var(--space-5);">Görselleştirmek istediğiniz playbook'u aşağıdan seçin</p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: var(--space-4); max-width: 800px; margin: 0 auto;">
                        ${playbooks.map(p => `
                            <div class="integration-card" style="cursor: pointer;" onclick="App.showPlaybookVisualization('${this.esc(p.id)}')">
                                <div class="integration-icon">${this.esc(p.name.charAt(0))}</div>
                                <div class="integration-info">
                                    <div class="integration-name">${this.esc(p.name)}</div>
                                    <div class="integration-status">${p.steps?.length || 0} adım • ${this.esc(p.category || 'Genel')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // WAR ROOM
    // ==========================================
    getWarRoomNotes(caseId) {
        try {
            const key = `soc_warroom_${caseId}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    addWarRoomNote(caseId) {
        const input = document.getElementById('war-room-note');
        const message = input?.value?.trim();
        if (!message) return;
        
        this.addWarRoomNoteInternal(caseId, message);
        input.value = '';
        this.renderDrawerContent();
    },

    addWarRoomNoteInternal(caseId, message) {
        const key = `soc_warroom_${caseId}`;
        const notes = this.getWarRoomNotes(caseId);
        notes.push({ time: new Date().toISOString(), message });
        localStorage.setItem(key, JSON.stringify(notes));
    },

    // ==========================================
    // LIVE FEED
    // ==========================================
    toggleLive() {
        if (this.state.live.enabled) {
            this.stopLive();
        } else {
            this.startLive();
        }
    },

    startLive() {
        this.state.live.enabled = true;
        this.state.live.eventCount = 0;
        
        const btn = document.getElementById('btn-live');
        if (btn) {
            btn.classList.add('btn-primary');
            btn.innerHTML = '<span class="live-dot"></span> CANLI';
        }
        
        this.state.live.interval = setInterval(() => {
            this.generateLiveEvent();
        }, this.state.live.speed);
        
        this.toast('Canlı akış başladı', 'info');
    },

    stopLive() {
        this.state.live.enabled = false;
        
        if (this.state.live.interval) {
            clearInterval(this.state.live.interval);
            this.state.live.interval = null;
        }
        
        const btn = document.getElementById('btn-live');
        if (btn) {
            btn.classList.remove('btn-primary');
            btn.innerHTML = 'LIVE';
        }
        
        this.toast('Canlı akış durduruldu', 'info');
    },

    generateLiveEvent() {
        const sources = ['Email', 'IdP', 'Endpoint', 'Proxy', 'DNS'];
        const types = ['login_success', 'login_fail', 'email_delivered', 'file_download', 'process_start', 'dns_query'];
        const users = ['ayse.demir', 'mehmet.kaya', 'elif.yilmaz', 'mustafa.arslan'];
        
        const event = {
            event_id: 'live_' + Date.now(),
            ts: new Date().toISOString(),
            source: sources[Math.floor(Math.random() * sources.length)],
            event_type: types[Math.floor(Math.random() * types.length)],
            user: users[Math.floor(Math.random() * users.length)] + '@anadolufinans.example.tr',
            device: 'IST-WS-' + String(Math.floor(Math.random() * 100)).padStart(3, '0'),
            src_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            summary: 'Canlı olay simülasyonu'
        };
        
        // Add to data
        this.state.data.events.unshift(event);
        this.state.live.eventCount++;
        
        // Update table
        const tbody = document.getElementById('events-tbody');
        if (tbody) {
            const row = document.createElement('tr');
            row.innerHTML = this.renderEventRow(event, true).replace(/<tr[^>]*>|<\/tr>/g, '');
            row.dataset.eventId = event.event_id;
            row.className = 'event-row live-new';
            row.addEventListener('click', () => this.openDrawer('event', event.event_id));
            tbody.insertBefore(row, tbody.firstChild);
            
            // Remove old rows
            while (tbody.children.length > 100) {
                tbody.removeChild(tbody.lastChild);
            }
        }
        
        // Update counter in header
        if (this.state.view === 'events') {
            const subtitle = document.querySelector('.page-subtitle');
            if (subtitle) {
                subtitle.textContent = `${this.state.data.events.length} olay`;
            }
        }
    },

    // ==========================================
    // REPORTS
    // ==========================================
    async loadReport(type) {
        const container = document.getElementById('report-content');
        if (!container) return;
        
        container.innerHTML = '<div class="empty-state"><p class="empty-state-title">Yükleniyor...</p></div>';
        
        try {
            const file = type === 'executive' ? 'report_executive.md' : 'report_technical.md';
            const res = await fetch(`./dashboard_data/${file}`);
            if (!res.ok) throw new Error('Not found');
            const md = await res.text();
            container.innerHTML = `<div style="max-width: 800px;">${Security.renderMarkdown(md)}</div>`;
        } catch {
            container.innerHTML = '<div class="empty-state"><p class="empty-state-title">Rapor bulunamadı</p></div>';
        }
    },

    // ==========================================
    // FILTERS
    // ==========================================
    clearFilters() {
        this.state.filters = { severity: [], status: [], category: [], search: '' };
        document.querySelectorAll('.filter-pane input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('.filter-pane select').forEach(sel => sel.value = '');
        this.renderView();
    },

    clearDeviceFilters() {
        document.querySelectorAll('.filter-device-risk, .filter-device-os, .filter-device-isolation').forEach(cb => cb.checked = false);
    },

    applyEventFilter() {
        // Get filter values and re-render
        // Simplified for now
    },

    searchEvents() {
        const input = document.getElementById('event-search');
        if (input) {
            this.state.filters.search = input.value;
            this.renderView();
        }
    },

    saveSearch() {
        this.toast('Arama kaydedildi', 'success');
    },

    // ==========================================
    // EXPORT
    // ==========================================
    exportCurrentView() {
        const view = this.state.view;
        let data, filename;
        
        switch (view) {
            case 'alerts':
                data = this.state.data.alerts;
                filename = 'alerts.json';
                break;
            case 'events':
                data = this.state.data.events;
                filename = 'events.json';
                break;
            case 'devices':
                data = this.state.data.devices;
                filename = 'devices.json';
                break;
            case 'cases':
                data = this.state.data.cases;
                filename = 'cases.json';
                break;
            default:
                data = this.state.data.summary;
                filename = 'summary.json';
        }
        
        Security.createDownload(JSON.stringify(data, null, 2), filename);
        this.toast('Dışa aktarıldı', 'success');
    },

    exportEvents() {
        const events = this.state.data.events || [];
        const csv = [
            ['Zaman', 'Kaynak', 'Tip', 'Kullanıcı', 'Cihaz', 'IP', 'Özet'].join(','),
            ...events.map(e => [
                e.ts, e.source, e.event_type, e.user, e.device, e.src_ip, `"${(e.summary || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');
        
        Security.createDownload(csv, 'events.csv', 'text/csv');
        this.toast('CSV indirildi', 'success');
    },

    exportIOCs() {
        const iocs = this.state.data.iocs || [];
        const csv = [
            ['Gösterge', 'Tip', 'Güven', 'Etiketler', 'İlk Görülme', 'Son Görülme'].join(','),
            ...iocs.map(i => [
                i.indicator, i.type, i.confidence, (i.tags || []).join(';'), i.first_seen, i.last_seen
            ].join(','))
        ].join('\n');
        
        Security.createDownload(csv, 'iocs.csv', 'text/csv');
        this.toast('IOC CSV indirildi', 'success');
    },

    copyAlertDetails(alertId) {
        const alert = this.state.data.alerts?.find(a => (a.alert_id || a.id) === alertId);
        if (alert) {
            Security.copyToClipboard(JSON.stringify(alert, null, 2));
            this.toast('Kopyalandı', 'success');
        }
    },

    copyEventJson(eventId) {
        const event = this.state.data.events?.find(e => (e.event_id || e.id) === eventId);
        if (event) {
            Security.copyToClipboard(JSON.stringify(event, null, 2));
            this.toast('JSON kopyalandı', 'success');
        }
    },

    // ==========================================
    // UI HELPERS
    // ==========================================
    showSkeleton() {
        document.getElementById('skeleton-loader').style.display = 'flex';
        document.getElementById('view-container').style.display = 'none';
    },

    hideSkeleton() {
        document.getElementById('skeleton-loader').style.display = 'none';
        document.getElementById('view-container').style.display = 'flex';
    },

    showEmptyState(message) {
        const container = document.getElementById('view-container');
        if (container) {
            container.style.display = 'flex';
            container.innerHTML = `
                <div class="empty-state" style="flex: 1;">
                    <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p class="empty-state-title">${message}</p>
                </div>
            `;
        }
    },

    updateStatus(status, text) {
        const pill = document.getElementById('data-status');
        if (pill) {
            const dot = pill.querySelector('.status-dot');
            const span = pill.querySelector('span:not(.status-dot)');
            if (dot) {
                dot.classList.remove('error', 'warning');
                if (status === 'error') dot.classList.add('error');
                if (status === 'loading') dot.classList.add('warning');
            }
            if (span) span.textContent = text;
        }
    },

    updateLastLoaded() {
        const el = document.getElementById('last-loaded');
        if (el) {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }
    },

    updateBadges() {
        const alerts = this.state.data.alerts?.length || 0;
        const cases = this.state.data.cases?.filter(c => c.status !== 'closed').length || 0;
        
        const alertBadge = document.getElementById('badge-alerts');
        const caseBadge = document.getElementById('badge-cases');
        
        if (alertBadge) alertBadge.textContent = alerts;
        if (caseBadge) caseBadge.textContent = cases;
    },

    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    },

    formatTime(ts) {
        if (!ts) return '—';
        try {
            const d = new Date(ts);
            return d.toLocaleString('tr-TR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return ts;
        }
    },

    renderSeverityBadge(severity) {
        const classes = {
            critical: 'badge-critical',
            high: 'badge-high',
            medium: 'badge-medium',
            low: 'badge-low',
            info: 'badge-neutral'
        };
        const labels = {
            critical: 'Kritik',
            high: 'Yüksek',
            medium: 'Orta',
            low: 'Düşük',
            info: 'Bilgi'
        };
        const cls = classes[severity] || 'badge-neutral';
        const lbl = labels[severity] || severity || 'N/A';
        return `<span class="badge ${cls}">${this.esc(lbl)}</span>`;
    },

    renderStatusBadge(status) {
        const classes = {
            new: 'badge-info',
            in_progress: 'badge-warning',
            investigating: 'badge-warning',
            contained: 'badge-medium',
            closed: 'badge-neutral'
        };
        const labels = {
            new: 'Yeni',
            in_progress: 'İnceleniyor',
            investigating: 'İnceleniyor',
            contained: 'Kontrol Altında',
            closed: 'Kapatıldı'
        };
        const cls = classes[status] || 'badge-neutral';
        const lbl = labels[status] || status || 'N/A';
        return `<span class="badge ${cls}">${this.esc(lbl)}</span>`;
    },

    renderRiskBadge(score) {
        if (score >= 80) return '<span class="badge badge-critical">Kritik</span>';
        if (score >= 60) return '<span class="badge badge-high">Yüksek</span>';
        if (score >= 30) return '<span class="badge badge-medium">Orta</span>';
        return '<span class="badge badge-low">Düşük</span>';
    },

    renderRiskBar(score) {
        const level = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
        const filled = Math.ceil(score / 20);
        return `
            <div class="risk-bar">
                ${[1,2,3,4,5].map(i => `<div class="risk-bar-segment ${i <= filled ? level : ''}"></div>`).join('')}
            </div>
        `;
    },

    renderConfidenceBadge(confidence) {
        if (!confidence) return '<span class="badge badge-neutral">N/A</span>';
        const c = typeof confidence === 'string' ? confidence.toLowerCase() : confidence;
        if (c === 'high' || c > 0.7) return '<span class="badge badge-high">Yüksek</span>';
        if (c === 'medium' || c > 0.4) return '<span class="badge badge-medium">Orta</span>';
        return '<span class="badge badge-low">Düşük</span>';
    },

    getSeverityLabel(sev) {
        const labels = { critical: 'Kritik', high: 'Yüksek', medium: 'Orta', low: 'Düşük', info: 'Bilgi' };
        return labels[sev] || sev;
    },

    numToSeverity(num) {
        if (num >= 8) return 'critical';
        if (num >= 6) return 'high';
        if (num >= 4) return 'medium';
        if (num >= 2) return 'low';
        return 'info';
    },

    openEventDrawer(eventId) {
        const events = this.state.data.events || [];
        const event = events.find(e => (e.event_id || e.id) === eventId);
        if (!event) return;

        const title = document.getElementById('drawer-title');
        const subtitle = document.getElementById('drawer-subtitle');
        const tabs = document.getElementById('drawer-tabs');
        const body = document.getElementById('drawer-body');

        if (title) title.textContent = event.event_type || 'Olay Detayı';
        if (subtitle) subtitle.textContent = eventId;
        
        // Hide tabs for event view
        if (tabs) tabs.innerHTML = '';

        // Build event details
        const user = typeof event.user === 'object' ? event.user : { display: event.user };
        const device = typeof event.device === 'object' ? event.device : { hostname: event.device };
        const network = typeof event.network === 'object' ? event.network : { src_ip: event.src_ip };
        const process = event.process || {};
        const artifact = event.artifact || {};
        const tags = event.tags || [];

        if (body) {
            body.innerHTML = `
                <div class="drawer-section">
                    <div class="drawer-section-title">Genel Bilgi</div>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">Olay ID</span>
                            <code class="detail-value">${this.esc(eventId)}</code>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Zaman</span>
                            <span class="detail-value">${this.formatTime(event.ts || event.timestamp)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Kaynak</span>
                            <span class="badge badge-neutral">${this.esc(event.source || '—')}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Olay Tipi</span>
                            <span class="detail-value">${this.esc(event.event_type || '—')}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Seviye</span>
                            ${this.renderSeverityBadge(event.severity)}
                        </div>
                    </div>
                </div>

                ${user.display || user.email ? `
                <div class="drawer-section">
                    <div class="drawer-section-title">Kullanıcı</div>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">Ad</span>
                            <span class="detail-value">${this.esc(user.display || '—')}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">E-posta</span>
                            <code class="detail-value">${this.esc(user.email || '—')}</code>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Kullanıcı ID</span>
                            <code class="detail-value">${this.esc(user.id || '—')}</code>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${device.hostname ? `
                <div class="drawer-section">
                    <div class="drawer-section-title">Cihaz</div>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">Hostname</span>
                            <code class="detail-value">${this.esc(device.hostname)}</code>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">İşletim Sistemi</span>
                            <span class="detail-value">${this.esc(device.os || '—')}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${network.src_ip || network.dst_ip ? `
                <div class="drawer-section">
                    <div class="drawer-section-title">Ağ</div>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">Kaynak IP</span>
                            <code class="detail-value">${this.esc(network.src_ip || '—')}</code>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Hedef IP</span>
                            <code class="detail-value">${this.esc(network.dst_ip || '—')}</code>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Kaynak Geo</span>
                            <span class="detail-value">${this.esc(network.src_geo || '—')}</span>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${process.name ? `
                <div class="drawer-section">
                    <div class="drawer-section-title">Süreç</div>
                    <div class="detail-grid">
                        <div class="detail-row">
                            <span class="detail-label">İsim</span>
                            <code class="detail-value">${this.esc(process.name)}</code>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Komut Satırı</span>
                            <code class="detail-value" style="word-break: break-all;">${this.esc((process.cmdline || '—').substring(0, 200))}</code>
                        </div>
                        ${process.parent_name ? `
                        <div class="detail-row">
                            <span class="detail-label">Üst Süreç</span>
                            <code class="detail-value">${this.esc(process.parent_name)}</code>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}

                ${tags.length ? `
                <div class="drawer-section">
                    <div class="drawer-section-title">Etiketler</div>
                    <div class="tags-list">
                        ${tags.map(t => `<span class="chip ${t.startsWith('mitre:') ? 'chip-mitre' : ''}">${this.esc(t)}</span>`).join(' ')}
                    </div>
                </div>
                ` : ''}

                ${event.raw ? `
                <div class="drawer-section">
                    <div class="drawer-section-title">Ham Veri (Önizleme)</div>
                    <pre class="raw-data">${this.esc(JSON.stringify(event.raw, null, 2).substring(0, 1000))}</pre>
                </div>
                ` : ''}
            `;
        }

        // Open drawer
        document.getElementById('drawer-overlay')?.classList.add('open');
        document.getElementById('drawer')?.classList.add('open');
    },

    renderSeverityBadge(severity) {
        if (typeof severity === 'number') {
            severity = this.numToSeverity(severity);
        }
        const classes = {
            critical: 'badge-critical',
            high: 'badge-high',
            medium: 'badge-medium',
            low: 'badge-low',
            info: 'badge-info'
        };
        return `<span class="badge ${classes[severity] || 'badge-neutral'}">${this.getSeverityLabel(severity)}</span>`;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
