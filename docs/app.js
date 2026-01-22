/**
 * SOC Console v5.0 - Full SIEM + SOAR + EDR Platform
 * Live Feed, EDR Actions, Playbook Runner
 * All actions are SIMULATED - no real system changes
 */

const App = {
    // ============================================
    // STATE
    // ============================================
    state: {
        view: 'overview',
        session: null,
        data: {
            events: [],
            alerts: [],
            cases: [],
            iocs: [],
            devices: [],
            entities: null,
            mitre: null,
            playbooks: [],
            playbookLibrary: [],
            kpi: null,
            summary: null,
            risk: null,
            correlations: null
        },
        // Live feed state
        live: {
            enabled: false,
            speed: 1,
            paused: false,
            buffer: [],
            maxBuffer: 500,
            lastEventTime: null,
            intervalId: null,
            muted: false,
            autoScroll: true,
            dropped: 0
        },
        // EDR state (localStorage backed)
        edr: {
            deviceStates: {},
            actions: []
        },
        // SOAR state
        soar: {
            activeRuns: [],
            completedRuns: []
        },
        // Filters
        filters: {
            severity: 'all',
            status: 'all',
            search: ''
        },
        // Drawer
        drawer: {
            open: false,
            type: null,
            id: null,
            tab: 'summary'
        },
        cmdPalette: false,
        density: 'comfortable'
    },

    // ============================================
    // SEEDED RANDOM (Deterministic)
    // ============================================
    _seed: 1337,
    
    seededRandom() {
        this._seed = (this._seed * 1103515245 + 12345) & 0x7fffffff;
        return this._seed / 0x7fffffff;
    },
    
    resetSeed(seed) {
        this._seed = seed || parseInt(localStorage.getItem('soc_seed')) || 1337;
    },

    // ============================================
    // INITIALIZATION
    // ============================================
    init() {
        console.log('[SOC] Initializing...');
        
        // Check session
        this.state.session = Auth.getSession();
        if (!this.state.session) {
            window.location.href = './login.html';
            return;
        }

        // Load persisted state
        this.loadPersistedState();
        
        // Setup UI
        this.updateUserDisplay();
        this.applyRBAC();
        this.bindEvents();
        this.initKeyboardShortcuts();
        
        // Load data
        this.loadData();
        
        console.log('[SOC] Initialized');
    },

    loadPersistedState() {
        try {
            const edrState = localStorage.getItem('soc_edr_state');
            if (edrState) {
                this.state.edr = JSON.parse(edrState);
            }
            const soarState = localStorage.getItem('soc_soar_state');
            if (soarState) {
                this.state.soar = JSON.parse(soarState);
            }
            const density = localStorage.getItem('soc_density');
            if (density) {
                this.state.density = density;
                document.body.className = `density-${density}`;
            }
        } catch (e) {
            console.warn('Failed to load persisted state:', e);
        }
    },

    saveEdrState() {
        localStorage.setItem('soc_edr_state', JSON.stringify(this.state.edr));
    },

    saveSoarState() {
        localStorage.setItem('soc_soar_state', JSON.stringify(this.state.soar));
    },

    updateUserDisplay() {
        const s = this.state.session;
        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        const avatarEl = document.getElementById('user-avatar');
        if (nameEl) nameEl.textContent = s.displayName || s.username;
        if (roleEl) roleEl.textContent = this.getRoleLabel(s.role);
        if (avatarEl) avatarEl.textContent = (s.displayName || s.username).charAt(0).toUpperCase();
    },

    getRoleLabel(role) {
        return { admin: 'Yönetici', analyst: 'Analist', viewer: 'İzleyici' }[role] || role;
    },

    applyRBAC() {
        document.querySelectorAll('[data-role="admin"]').forEach(el => {
            if (!Auth.hasRole('admin')) el.classList.add('hidden');
        });
    },

    // ============================================
    // EVENT BINDING
    // ============================================
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) this.switchView(view);
            });
        });

        // Search box -> command palette
        const searchBox = document.getElementById('search-box');
        if (searchBox) searchBox.addEventListener('click', () => this.openCmdPalette());

        // Command bar
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.refreshData());
        
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());

        // Lock button
        const lockBtn = document.getElementById('lock-btn');
        if (lockBtn) lockBtn.addEventListener('click', () => this.lockScreen());

        // Drawer
        const drawerOverlay = document.getElementById('drawer-overlay');
        if (drawerOverlay) drawerOverlay.addEventListener('click', () => this.closeDrawer());
        
        const drawerClose = document.getElementById('drawer-close');
        if (drawerClose) drawerClose.addEventListener('click', () => this.closeDrawer());

        // Command Palette
        const cmdPalette = document.getElementById('cmd-palette');
        if (cmdPalette) {
            cmdPalette.addEventListener('click', (e) => {
                if (e.target.id === 'cmd-palette') this.closeCmdPalette();
            });
        }
        
        const cmdInput = document.getElementById('cmd-input');
        if (cmdInput) cmdInput.addEventListener('input', (e) => this.handleCmdSearch(e.target.value));

        // Modal close
        const closeUserModal = document.getElementById('close-user-modal');
        if (closeUserModal) {
            closeUserModal.addEventListener('click', () => {
                document.getElementById('user-modal').style.display = 'none';
            });
        }

        // Live toggle
        const liveToggle = document.getElementById('live-toggle');
        if (liveToggle) liveToggle.addEventListener('click', () => this.toggleLive());
    },

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openCmdPalette();
            }
            if (e.key === 'Escape') {
                if (this.state.cmdPalette) this.closeCmdPalette();
                else if (this.state.drawer.open) this.closeDrawer();
            }
        });
    },

    lockScreen() {
        this.stopLive();
        Auth.logout();
        window.location.href = './login.html';
    },

    // ============================================
    // DATA LOADING
    // ============================================
    async loadData() {
        this.showSkeleton();
        this.updateStatus('loading', 'Yükleniyor...');
        
        try {
            const files = [
                { key: 'events', file: 'events.jsonl', jsonl: true },
                { key: 'alerts', file: 'alerts.jsonl', jsonl: true },
                { key: 'cases', file: 'cases.json', prop: 'cases' },
                { key: 'iocs', file: 'iocs.json', prop: 'iocs' },
                { key: 'devices', file: 'edr_devices.json', prop: 'devices' },
                { key: 'entities', file: 'entities.json' },
                { key: 'mitre', file: 'mitre_coverage.json' },
                { key: 'playbooks', file: 'playbook_runs.jsonl', jsonl: true },
                { key: 'playbookLibrary', file: 'playbooks.json', prop: 'playbooks' },
                { key: 'kpi', file: 'kpi_timeseries.json' },
                { key: 'summary', file: 'summary.json' },
                { key: 'risk', file: 'risk_scores.json' },
                { key: 'correlations', file: 'correlations.json' }
            ];

            const results = await Promise.allSettled(
                files.map(f => this.loadFile(f))
            );

            let loaded = 0;
            results.forEach((r, i) => {
                if (r.status === 'fulfilled' && r.value !== null) {
                    this.state.data[files[i].key] = r.value;
                    loaded++;
                }
            });

            console.log(`[SOC] Loaded ${loaded}/${files.length} data files`);
            
            this.updateStatus('ok', 'Veri Yüklendi');
            this.updateBadges();
            this.hideSkeleton();
            this.renderView();
            this.updateLastLoaded();

        } catch (err) {
            console.error('Data load failed:', err);
            this.updateStatus('error', 'Yükleme Hatası');
            this.hideSkeleton();
            this.showEmptyState('Veri yüklenemedi. Konsolu kontrol edin.');
        }
    },

    async loadFile({ file, jsonl, prop }) {
        try {
            const res = await fetch(`./dashboard_data/${file}`);
            if (!res.ok) {
                console.warn(`Failed to fetch ${file}: ${res.status}`);
                return null;
            }
            
            const text = await res.text();
            if (!text.trim()) return jsonl ? [] : null;
            
            if (jsonl) {
                return text.trim().split('\n')
                    .map(line => {
                        try { return JSON.parse(line); }
                        catch { return null; }
                    })
                    .filter(Boolean);
            } else {
                const json = JSON.parse(text);
                return prop ? (json[prop] || json) : json;
            }
        } catch (err) {
            console.warn(`Error loading ${file}:`, err);
            return jsonl ? [] : null;
        }
    },

    async refreshData() {
        const btn = document.getElementById('refresh-btn');
        if (btn) btn.classList.add('spinning');
        await this.loadData();
        if (btn) btn.classList.remove('spinning');
        this.toast('Veri yenilendi', 'success');
    },

    // ============================================
    // VIEW MANAGEMENT
    // ============================================
    switchView(view) {
        this.state.view = view;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        this.renderView();
    },

    renderView() {
        const container = document.getElementById('view-container');
        if (!container) return;

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
            reports: () => this.renderReports(),
            settings: () => this.renderSettings()
        };

        const html = renderers[this.state.view]?.() || '<div class="empty-state">Sayfa bulunamadı</div>';
        container.innerHTML = html;

        // Restart animation
        container.style.animation = 'none';
        container.offsetHeight;
        container.style.animation = null;
    },

    // ============================================
    // LIVE FEED (SIEM)
    // ============================================
    toggleLive() {
        if (this.state.live.enabled) {
            this.stopLive();
        } else {
            this.startLive();
        }
        this.updateLiveUI();
    },

    startLive() {
        this.state.live.enabled = true;
        this.state.live.paused = false;
        this.resetSeed();
        
        const baseInterval = 1500; // ms
        
        this.state.live.intervalId = setInterval(() => {
            if (!this.state.live.paused) {
                this.generateLiveEvent();
            }
        }, baseInterval / this.state.live.speed);
        
        this.toast('Live Feed başlatıldı', 'success');
    },

    stopLive() {
        this.state.live.enabled = false;
        if (this.state.live.intervalId) {
            clearInterval(this.state.live.intervalId);
            this.state.live.intervalId = null;
        }
        this.toast('Live Feed durduruldu', 'info');
    },

    setLiveSpeed(speed) {
        this.state.live.speed = speed;
        if (this.state.live.enabled) {
            this.stopLive();
            this.startLive();
        }
    },

    generateLiveEvent() {
        const r = this.seededRandom();
        let eventType, severity, tags;
        
        // Distribution: 55% benign, 25% low, 15% medium, 5% high/critical
        if (r < 0.55) {
            eventType = this.pickRandom(['login_success', 'email_delivered', 'url_visited', 'file_accessed', 'process_start']);
            severity = 'info';
            tags = [];
        } else if (r < 0.80) {
            eventType = this.pickRandom(['new_device', 'geo_anomaly_low', 'uncommon_domain', 'mfa_challenge']);
            severity = 'low';
            tags = ['anomaly'];
        } else if (r < 0.95) {
            eventType = this.pickRandom(['mfa_push_burst', 'dns_query_spike', 'inbox_search', 'failed_login_burst']);
            severity = 'medium';
            tags = ['suspicious'];
        } else {
            eventType = this.pickRandom(['impossible_travel', 'inbox_rule_created', 'oauth_app_granted', 'malicious_process']);
            severity = 'high';
            tags = ['critical', 'alert'];
        }

        const users = this.state.data.entities?.users ? Object.keys(this.state.data.entities.users) : ['user@example.tr'];
        const devices = this.state.data.devices || [];
        
        const event = {
            event_id: `LIVE-${Date.now()}-${Math.floor(this.seededRandom() * 1000)}`,
            timestamp: new Date().toISOString(),
            source: this.pickRandom(['idp_auth', 'email_gateway', 'proxy_dns', 'endpoint_edr_sim', 'm365_audit']),
            event_type: eventType,
            user: this.pickRandom(users),
            device_id: devices.length ? this.pickRandom(devices).id : 'DEV-LIVE',
            src_ip: `10.${Math.floor(this.seededRandom()*255)}.${Math.floor(this.seededRandom()*255)}.${Math.floor(this.seededRandom()*255)}`,
            geo: { city: this.pickRandom(['İstanbul', 'Ankara', 'İzmir']), country: 'Türkiye' },
            tags: tags,
            severity: severity,
            summary: `[LIVE] ${eventType} - ${severity}`,
            _live: true
        };

        // Add to buffer
        if (this.state.live.buffer.length >= this.state.live.maxBuffer) {
            this.state.live.buffer.shift();
            this.state.live.dropped++;
        }
        this.state.live.buffer.unshift(event);
        this.state.live.lastEventTime = event.timestamp;

        // Update UI if on search view
        if (this.state.view === 'search') {
            this.addLiveEventToUI(event);
        }

        // Toast for high severity
        if (severity === 'high' && !this.state.live.muted) {
            this.toast(`⚠️ ${eventType}`, 'error');
        }
    },

    addLiveEventToUI(event) {
        const tbody = document.getElementById('events-tbody');
        if (!tbody) return;

        const tr = document.createElement('tr');
        tr.className = 'live-event-new';
        tr.innerHTML = `
            <td class="mono muted" style="font-size:var(--text-xs)">${this.formatTime(event.timestamp)}</td>
            <td><span class="badge info">${this.esc(event.source)}</span></td>
            <td>${this.esc(event.event_type)}</td>
            <td><span class="chip">${this.esc(event.user?.split('@')[0] || '—')}</span></td>
            <td class="mono">${this.esc(event.src_ip || '—')}</td>
            <td class="truncate" style="max-width:300px">${this.esc(event.summary)}</td>
        `;
        tr.onclick = () => this.openDrawer('event', event.event_id);
        
        tbody.insertBefore(tr, tbody.firstChild);

        // Remove glow after animation
        setTimeout(() => tr.classList.remove('live-event-new'), 1500);

        // Keep table size manageable
        while (tbody.children.length > 100) {
            tbody.removeChild(tbody.lastChild);
        }
    },

    updateLiveUI() {
        const toggle = document.getElementById('live-toggle');
        if (toggle) {
            toggle.classList.toggle('active', this.state.live.enabled);
            toggle.innerHTML = this.state.live.enabled 
                ? '<span class="live-dot"></span> LIVE' 
                : '<span class="live-dot off"></span> LIVE';
        }
    },

    pickRandom(arr) {
        return arr[Math.floor(this.seededRandom() * arr.length)];
    },

    // ============================================
    // EDR ACTIONS (SIMULATED)
    // ============================================
    getDeviceState(deviceId) {
        return this.state.edr.deviceStates[deviceId] || {
            isolated: false,
            lastAvScan: null,
            quarantinedFiles: [],
            blockedIps: [],
            blockedDomains: []
        };
    },

    performEdrAction(deviceId, action, params = {}) {
        if (!Auth.hasRole('analyst')) {
            this.toast('EDR aksiyonları için analist yetkisi gerekli', 'error');
            return;
        }

        const state = this.getDeviceState(deviceId);
        const timestamp = new Date().toISOString();
        const device = this.state.data.devices?.find(d => d.id === deviceId);
        
        let actionResult = { success: true, message: '' };

        switch (action) {
            case 'isolate':
                state.isolated = true;
                actionResult.message = `${device?.hostname || deviceId} izole edildi (SİMÜLASYON)`;
                break;
            case 'release':
                state.isolated = false;
                actionResult.message = `${device?.hostname || deviceId} izolasyonu kaldırıldı (SİMÜLASYON)`;
                break;
            case 'av_scan':
                state.lastAvScan = timestamp;
                actionResult.message = `AV taraması başlatıldı: ${params.type || 'quick'} (SİMÜLASYON)`;
                break;
            case 'kill_process':
                actionResult.message = `Process sonlandırıldı: ${params.process || 'unknown'} (SİMÜLASYON)`;
                break;
            case 'quarantine_file':
                state.quarantinedFiles.push({ path: params.path, time: timestamp });
                actionResult.message = `Dosya karantinaya alındı: ${params.path} (SİMÜLASYON)`;
                break;
            case 'collect_triage':
                actionResult.message = `Triyaj paketi toplanıyor (SİMÜLASYON)`;
                setTimeout(() => this.toast('Triyaj paketi hazır (SİMÜLASYON)', 'success'), 2000);
                break;
            case 'block_ip':
                state.blockedIps.push(params.ip);
                actionResult.message = `IP engellendi: ${params.ip} (SİMÜLASYON)`;
                break;
            case 'block_domain':
                state.blockedDomains.push(params.domain);
                actionResult.message = `Domain engellendi: ${params.domain} (SİMÜLASYON)`;
                break;
        }

        // Save state
        this.state.edr.deviceStates[deviceId] = state;
        
        // Log action
        const actionLog = {
            id: `EDR-${Date.now()}`,
            timestamp,
            deviceId,
            action,
            params,
            result: actionResult,
            user: this.state.session.username
        };
        this.state.edr.actions.push(actionLog);
        this.saveEdrState();

        // Add to live feed
        if (this.state.live.enabled) {
            this.state.live.buffer.unshift({
                event_id: actionLog.id,
                timestamp,
                source: 'edr_action',
                event_type: action,
                device_id: deviceId,
                user: this.state.session.username,
                tags: ['simulated', 'edr'],
                summary: actionResult.message,
                _live: true
            });
        }

        // Toast
        this.toast(actionResult.message, 'success');

        // Re-render if on EDR view
        if (this.state.view === 'edr') {
            this.renderView();
        }

        return actionResult;
    },

    // ============================================
    // SOAR PLAYBOOK RUNNER
    // ============================================
    async runPlaybook(playbookId, caseId) {
        if (!Auth.hasRole('analyst')) {
            this.toast('Playbook çalıştırmak için analist yetkisi gerekli', 'error');
            return;
        }

        const playbook = this.state.data.playbookLibrary?.find(p => p.id === playbookId);
        if (!playbook) {
            this.toast('Playbook bulunamadı', 'error');
            return;
        }

        const run = {
            id: `RUN-${Date.now()}`,
            playbookId,
            playbookName: playbook.name,
            caseId,
            startedAt: new Date().toISOString(),
            status: 'running',
            currentStep: 0,
            steps: playbook.steps.map(s => ({ ...s, status: 'pending', result: null })),
            user: this.state.session.username
        };

        this.state.soar.activeRuns.push(run);
        this.saveSoarState();

        this.toast(`Playbook başlatıldı: ${playbook.name}`, 'info');

        // Execute steps
        await this.executePlaybookSteps(run);

        return run;
    },

    async executePlaybookSteps(run) {
        for (let i = 0; i < run.steps.length; i++) {
            run.currentStep = i;
            const step = run.steps[i];
            step.status = 'running';
            this.saveSoarState();

            // Update UI
            if (this.state.drawer.open && this.state.drawer.type === 'playbook-run') {
                this.renderDrawerContent();
            }

            // Check for approval
            if (step.type === 'approval') {
                step.status = 'waiting_approval';
                this.saveSoarState();
                
                // Wait for approval (in real app, this would be async)
                const approved = await this.waitForApproval(run.id, step.id);
                if (!approved) {
                    step.status = 'rejected';
                    run.status = 'cancelled';
                    break;
                }
            }

            // Simulate step execution
            await this.sleep(800 + Math.random() * 1200);

            step.status = 'completed';
            step.result = `${step.name} tamamlandı (SİMÜLASYON)`;
            step.completedAt = new Date().toISOString();

            // If step has EDR action, execute it
            if (step.edr_action && run.caseId) {
                const caseData = this.state.data.cases?.find(c => c.case_id === run.caseId);
                if (caseData?.affected_devices?.length) {
                    this.performEdrAction(caseData.affected_devices[0], step.edr_action);
                }
            }

            this.saveSoarState();
        }

        // Complete run
        run.status = 'completed';
        run.completedAt = new Date().toISOString();
        
        // Move to completed
        const idx = this.state.soar.activeRuns.findIndex(r => r.id === run.id);
        if (idx > -1) {
            this.state.soar.activeRuns.splice(idx, 1);
            this.state.soar.completedRuns.unshift(run);
        }
        this.saveSoarState();

        // Add war room note
        if (run.caseId) {
            this.addWarRoomNote(run.caseId, `Playbook tamamlandı: ${run.playbookName}`);
        }

        this.toast(`Playbook tamamlandı: ${run.playbookName}`, 'success');

        if (this.state.view === 'automations') {
            this.renderView();
        }
    },

    async waitForApproval(runId, stepId) {
        // In this simulation, auto-approve after showing dialog
        return new Promise(resolve => {
            const confirmed = confirm('Bu adımı onaylıyor musunuz? (SİMÜLASYON)');
            resolve(confirmed);
        });
    },

    approveStep(runId, stepId) {
        const run = this.state.soar.activeRuns.find(r => r.id === runId);
        if (run) {
            const step = run.steps.find(s => s.id === stepId);
            if (step) {
                step.status = 'approved';
                this.saveSoarState();
            }
        }
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ============================================
    // VIEW RENDERERS
    // ============================================
    renderOverview() {
        const s = this.state.data.summary || {};
        const m = s.metrics || {};
        const cases = this.state.data.cases || [];
        const alerts = this.state.data.alerts || [];
        const activeCases = cases.filter(c => c.status !== 'closed').length;
        const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
        
        return `
            <h1 class="view-title">Genel Bakış</h1>
            
            <div class="card-grid">
                <div class="card card-clickable" onclick="App.switchView('cases')">
                    <div class="card-label">Aktif Vakalar</div>
                    <div class="card-value">${activeCases}</div>
                    <div class="card-meta">${cases.length} toplam vaka</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('alerts')">
                    <div class="card-label">Toplam Uyarı</div>
                    <div class="card-value ${criticalAlerts > 0 ? 'critical' : ''}">${alerts.length}</div>
                    <div class="card-meta">${criticalAlerts} kritik</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('search')">
                    <div class="card-label">Analiz Edilen Olay</div>
                    <div class="card-value">${this.state.data.events?.length || 0}</div>
                    <div class="card-meta">+ ${this.state.live.buffer.length} live</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('edr')">
                    <div class="card-label">İzlenen Cihaz</div>
                    <div class="card-value">${this.state.data.devices?.length || 0}</div>
                    <div class="card-meta">${Object.values(this.state.edr.deviceStates).filter(s => s.isolated).length} izole</div>
                </div>
            </div>

            <div class="section-header flex justify-between items-center mb-4">
                <h2 class="section-title" style="margin:0">Son Vakalar</h2>
                <button class="btn btn-secondary btn-sm" onclick="App.switchView('cases')">Tümünü Gör</button>
            </div>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Vaka ID</th>
                            <th>Başlık</th>
                            <th>Önem</th>
                            <th>Durum</th>
                            <th>Uyarılar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cases.slice(0, 5).map(c => `
                            <tr onclick="App.openDrawer('case', '${this.esc(c.case_id)}')">
                                <td class="mono">${this.esc(c.case_id)}</td>
                                <td class="truncate" style="max-width:250px">${this.esc(c.title)}</td>
                                <td><span class="badge ${this.esc(c.severity)}${c.severity === 'critical' ? ' pulse' : ''}">${this.esc(c.severity)}</span></td>
                                <td>${this.esc(c.status)}</td>
                                <td>${c.alert_ids?.length || 0}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="muted">Vaka bulunamadı</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div class="section-header flex justify-between items-center mb-4 mt-6">
                <h2 class="section-title" style="margin:0">Aktif Playbook Çalışmaları</h2>
            </div>
            ${this.state.soar.activeRuns.length ? `
                <div class="card-grid">
                    ${this.state.soar.activeRuns.map(r => `
                        <div class="card">
                            <div class="flex justify-between items-center mb-2">
                                <span class="badge info">${this.esc(r.playbookName)}</span>
                                <span class="badge">${r.currentStep + 1}/${r.steps.length}</span>
                            </div>
                            <div class="muted">Vaka: ${this.esc(r.caseId)}</div>
                            <div class="progress-bar mt-2">
                                <div class="progress-fill" style="width:${((r.currentStep + 1) / r.steps.length) * 100}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<div class="muted">Aktif playbook çalışması yok</div>'}
        `;
    },

    renderCases() {
        const cases = this.state.data.cases || [];
        
        return `
            <div class="view-header">
                <h1 class="view-title" style="margin-bottom:0">Vakalar</h1>
                <div class="flex gap-2">
                    <select class="select select-sm" onchange="App.state.filters.status = this.value; App.renderView()">
                        <option value="all">Tüm Durumlar</option>
                        <option value="new">Yeni</option>
                        <option value="investigating">İnceleniyor</option>
                        <option value="contained">Kontrol Altında</option>
                        <option value="closed">Kapatıldı</option>
                    </select>
                    <select class="select select-sm" onchange="App.state.filters.severity = this.value; App.renderView()">
                        <option value="all">Tüm Önemler</option>
                        <option value="critical">Kritik</option>
                        <option value="high">Yüksek</option>
                        <option value="medium">Orta</option>
                    </select>
                </div>
            </div>

            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Vaka ID</th>
                            <th>Başlık</th>
                            <th>Önem</th>
                            <th>Durum</th>
                            <th>Sahip</th>
                            <th>Uyarılar</th>
                            <th>Aksiyonlar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filterCases(cases).map(c => `
                            <tr>
                                <td class="mono" onclick="App.openDrawer('case', '${this.esc(c.case_id)}')" style="cursor:pointer">${this.esc(c.case_id)}</td>
                                <td class="truncate" style="max-width:200px" onclick="App.openDrawer('case', '${this.esc(c.case_id)}')" style="cursor:pointer">${this.esc(c.title)}</td>
                                <td><span class="badge ${this.esc(c.severity)}${c.severity === 'critical' ? ' pulse' : ''}">${this.esc(c.severity)}</span></td>
                                <td>${this.esc(c.status)}</td>
                                <td>${this.esc(c.owner || 'atanmamış')}</td>
                                <td>${c.alert_ids?.length || 0}</td>
                                <td>
                                    <button class="btn btn-secondary btn-sm" onclick="App.showPlaybookPicker('${this.esc(c.case_id)}')">
                                        Playbook Çalıştır
                                    </button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="7" class="muted">Vaka bulunamadı</td></tr>'}
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
        
        return `
            <h1 class="view-title">Uyarılar</h1>
            
            <div class="table-container">
                <div class="table-toolbar">
                    <input type="text" class="input" placeholder="Uyarı ara..." 
                           style="width:300px" onkeyup="App.filterAlerts(this.value)">
                    <span class="muted">${alerts.length} uyarı</span>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Uyarı</th>
                            <th>Önem</th>
                            <th>Vaka</th>
                            <th>Varlık</th>
                            <th>MITRE</th>
                        </tr>
                    </thead>
                    <tbody id="alerts-tbody">
                        ${alerts.map(a => `
                            <tr onclick="App.openDrawer('alert', '${this.esc(a.alert_id)}')">
                                <td>
                                    <div>${this.esc(a.name)}</div>
                                    <div class="muted mono" style="font-size:var(--text-xs)">${this.esc(a.alert_id)}</div>
                                </td>
                                <td><span class="badge ${this.esc(a.severity)}${a.severity === 'critical' ? ' pulse' : ''}">${this.esc(a.severity)}</span></td>
                                <td class="mono">${this.esc(a.case_id || '—')}</td>
                                <td><span class="chip">${this.esc(a.entity?.user?.split('@')[0] || '—')}</span></td>
                                <td>${a.mitre?.slice(0,2).map(m => `<span class="badge info">${this.esc(m.id)}</span>`).join(' ') || '—'}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="muted">Uyarı bulunamadı</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderSearch() {
        const baseEvents = this.state.data.events || [];
        const liveEvents = this.state.live.buffer;
        const allEvents = [...liveEvents, ...baseEvents].slice(0, 100);
        
        return `
            <div class="view-header">
                <h1 class="view-title" style="margin-bottom:0">Olay Arama (SIEM)</h1>
                <div class="flex gap-2 items-center">
                    <button class="btn ${this.state.live.enabled ? 'btn-primary' : 'btn-secondary'}" id="live-toggle" onclick="App.toggleLive()">
                        <span class="live-dot ${this.state.live.enabled ? '' : 'off'}"></span> LIVE
                    </button>
                    ${this.state.live.enabled ? `
                        <select class="select select-sm" onchange="App.setLiveSpeed(parseInt(this.value))">
                            <option value="1" ${this.state.live.speed === 1 ? 'selected' : ''}>x1</option>
                            <option value="2" ${this.state.live.speed === 2 ? 'selected' : ''}>x2</option>
                            <option value="5" ${this.state.live.speed === 5 ? 'selected' : ''}>x5</option>
                        </select>
                        <button class="btn btn-secondary btn-sm" onclick="App.state.live.buffer = []; App.renderView()">Temizle</button>
                    ` : ''}
                </div>
            </div>
            
            <div class="live-stats mb-4 flex gap-4">
                <span class="muted">Base: ${baseEvents.length}</span>
                <span class="muted">Live Buffer: ${liveEvents.length}</span>
                ${this.state.live.dropped > 0 ? `<span class="muted" style="color:var(--warning)">Dropped: ${this.state.live.dropped}</span>` : ''}
            </div>

            <div class="table-container">
                <div class="table-toolbar">
                    <input type="text" class="input" placeholder="Olay ara (user:, source:, type:)" 
                           style="width:400px" id="event-search" onkeyup="App.searchEvents(this.value)">
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Zaman</th>
                            <th>Kaynak</th>
                            <th>Tür</th>
                            <th>Kullanıcı</th>
                            <th>IP</th>
                            <th>Özet</th>
                        </tr>
                    </thead>
                    <tbody id="events-tbody">
                        ${allEvents.slice(0, 50).map(e => `
                            <tr class="${e._live ? 'live-event' : ''}" onclick="App.openDrawer('event', '${this.esc(e.event_id)}')">
                                <td class="mono muted" style="font-size:var(--text-xs)">${this.formatTime(e.timestamp)}</td>
                                <td><span class="badge info">${this.esc(e.source)}</span></td>
                                <td>${this.esc(e.event_type)}</td>
                                <td><span class="chip">${this.esc(e.user?.split('@')[0] || '—')}</span></td>
                                <td class="mono">${this.esc(e.src_ip || '—')}</td>
                                <td class="truncate" style="max-width:300px">${this.esc(e.summary)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" class="muted">Olay bulunamadı</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    searchEvents(query) {
        const q = query.toLowerCase();
        const baseEvents = this.state.data.events || [];
        const allEvents = [...this.state.live.buffer, ...baseEvents];
        
        const filtered = allEvents.filter(e => {
            if (!q) return true;
            const searchable = [e.user, e.source, e.event_type, e.summary, e.src_ip].join(' ').toLowerCase();
            return searchable.includes(q);
        }).slice(0, 50);

        const tbody = document.getElementById('events-tbody');
        if (tbody) {
            tbody.innerHTML = filtered.map(e => `
                <tr class="${e._live ? 'live-event' : ''}" onclick="App.openDrawer('event', '${this.esc(e.event_id)}')">
                    <td class="mono muted" style="font-size:var(--text-xs)">${this.formatTime(e.timestamp)}</td>
                    <td><span class="badge info">${this.esc(e.source)}</span></td>
                    <td>${this.esc(e.event_type)}</td>
                    <td><span class="chip">${this.esc(e.user?.split('@')[0] || '—')}</span></td>
                    <td class="mono">${this.esc(e.src_ip || '—')}</td>
                    <td class="truncate" style="max-width:300px">${this.esc(e.summary)}</td>
                </tr>
            `).join('');
        }
    },

    renderEntities() {
        const users = this.state.data.entities?.users ? Object.entries(this.state.data.entities.users) : [];
        const risk = this.state.data.risk?.entity_scores || {};

        return `
            <h1 class="view-title">Varlıklar</h1>
            
            <div class="card-grid">
                ${users.map(([email, data]) => {
                    const score = risk[email]?.score || 0;
                    const sev = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
                    return `
                        <div class="card card-clickable" onclick="App.openDrawer('entity', '${this.esc(email)}')">
                            <div class="flex justify-between items-center mb-3">
                                <div>
                                    <div style="font-weight:600">${this.esc(data.name || email.split('@')[0])}</div>
                                    <div class="muted" style="font-size:var(--text-xs)">${this.esc(email)}</div>
                                </div>
                                <span class="badge ${sev}">Risk: ${score}</span>
                            </div>
                            <div class="muted" style="font-size:var(--text-sm)">
                                ${data.event_count || 0} olay • ${data.devices?.length || 0} cihaz
                            </div>
                        </div>
                    `;
                }).join('') || '<div class="empty-state">Varlık bulunamadı</div>'}
            </div>
        `;
    },

    renderEDR() {
        const devices = this.state.data.devices || [];

        return `
            <div class="view-header">
                <h1 class="view-title" style="margin-bottom:0">Uç Nokta Algılama ve Yanıt (EDR)</h1>
                <div class="simulation-label">
                    <span class="badge medium">SİMÜLASYON</span>
                    <span class="muted">Gerçek cihazlara etki yok</span>
                </div>
            </div>
            
            <div class="table-container">
                <div class="table-toolbar">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" onchange="App.state.filters.isolatedOnly = this.checked; App.renderView()">
                        Sadece İzole
                    </label>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Hostname</th>
                            <th>İşletim Sistemi</th>
                            <th>Sahip</th>
                            <th>Durum</th>
                            <th>Risk</th>
                            <th>Aksiyonlar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devices.filter(d => !this.state.filters.isolatedOnly || this.getDeviceState(d.id).isolated).map(d => {
                            const state = this.getDeviceState(d.id);
                            return `
                                <tr>
                                    <td>
                                        <span class="mono" style="cursor:pointer" onclick="App.openDrawer('device', '${this.esc(d.id)}')">${this.esc(d.hostname)}</span>
                                        ${state.isolated ? '<span class="badge critical" style="margin-left:8px">İZOLE</span>' : ''}
                                    </td>
                                    <td>${this.esc(d.os)}</td>
                                    <td><span class="chip">${this.esc(d.owner?.split('@')[0] || '—')}</span></td>
                                    <td>${state.isolated ? '<span class="badge critical">İzole</span>' : '<span class="badge low">Aktif</span>'}</td>
                                    <td><span class="badge ${d.risk_score >= 50 ? 'high' : 'low'}">${d.risk_score || 0}</span></td>
                                    <td>
                                        <div class="flex gap-1">
                                            ${state.isolated 
                                                ? `<button class="btn btn-secondary btn-sm" onclick="App.performEdrAction('${this.esc(d.id)}', 'release')">Serbest Bırak</button>`
                                                : `<button class="btn btn-secondary btn-sm" onclick="App.performEdrAction('${this.esc(d.id)}', 'isolate')">İzole Et</button>`
                                            }
                                            <button class="btn btn-secondary btn-sm" onclick="App.performEdrAction('${this.esc(d.id)}', 'av_scan', {type:'quick'})">AV Tara</button>
                                            <button class="btn btn-secondary btn-sm" onclick="App.performEdrAction('${this.esc(d.id)}', 'collect_triage')">Triyaj</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="6" class="muted">Cihaz bulunamadı</td></tr>'}
                    </tbody>
                </table>
            </div>

            <h2 class="section-title mt-6">EDR Aksiyon Geçmişi</h2>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Zaman</th>
                            <th>Cihaz</th>
                            <th>Aksiyon</th>
                            <th>Sonuç</th>
                            <th>Kullanıcı</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.state.edr.actions.slice(-20).reverse().map(a => `
                            <tr>
                                <td class="mono muted">${this.formatTime(a.timestamp)}</td>
                                <td class="mono">${this.esc(a.deviceId)}</td>
                                <td><span class="badge info">${this.esc(a.action)}</span></td>
                                <td>${this.esc(a.result?.message || '—')}</td>
                                <td>${this.esc(a.user)}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="muted">Aksiyon geçmişi yok</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderTimeline() {
        const events = [...(this.state.live.buffer || []), ...(this.state.data.events || [])].slice(0, 30);

        return `
            <h1 class="view-title">Olay Zaman Çizelgesi</h1>
            
            <div class="timeline">
                ${events.map(e => {
                    const sev = e.tags?.includes('critical') || e.tags?.includes('suspicious') ? 'high' : '';
                    return `
                        <div class="timeline-item ${sev} ${e._live ? 'live' : ''}" onclick="App.openDrawer('event', '${this.esc(e.event_id)}')">
                            <div class="timeline-marker"></div>
                            <div class="timeline-time">${this.formatTime(e.timestamp)} ${e._live ? '<span class="badge info">LIVE</span>' : ''}</div>
                            <div class="timeline-content">
                                <div class="flex justify-between items-center">
                                    <span class="badge info">${this.esc(e.source)}</span>
                                    <span>${this.esc(e.event_type)}</span>
                                </div>
                                <div style="margin-top:var(--space-2)">${this.esc(e.summary)}</div>
                            </div>
                        </div>
                    `;
                }).join('') || '<div class="empty-state">Olay bulunamadı</div>'}
            </div>
        `;
    },

    renderMITRE() {
        const techniques = this.state.data.mitre?.techniques || [];

        return `
            <h1 class="view-title">MITRE ATT&CK Kapsamı</h1>
            
            <div class="mitre-grid">
                ${techniques.map(t => `
                    <div class="mitre-cell ${t.count > 0 ? 'active' : ''}">
                        <div class="mitre-id">${this.esc(t.id)}</div>
                        <div class="mitre-name">${this.esc(t.name)}</div>
                        <div class="mitre-tactic">${this.esc(t.tactic)}</div>
                        <div style="margin-top:var(--space-2)">
                            <span class="badge">${t.count} gözlem</span>
                        </div>
                    </div>
                `).join('') || '<div class="empty-state">MITRE verisi bulunamadı</div>'}
            </div>
        `;
    },

    renderIntel() {
        const iocs = this.state.data.iocs || [];

        return `
            <div class="view-header">
                <h1 class="view-title" style="margin-bottom:0">Tehdit İstihbaratı (IOC)</h1>
                <button class="btn btn-secondary btn-sm" onclick="App.exportIOCs()">CSV Dışa Aktar</button>
            </div>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tür</th>
                            <th>Gösterge</th>
                            <th>Etiketler</th>
                            <th>Güven</th>
                            <th>Vakalar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${iocs.map(i => `
                            <tr>
                                <td><span class="badge">${this.esc(i.type)}</span></td>
                                <td class="mono">${this.esc(i.indicator)}</td>
                                <td>${i.tags?.map(t => `<span class="chip">${this.esc(t)}</span>`).join(' ') || '—'}</td>
                                <td>${this.esc(i.confidence || 'medium')}</td>
                                <td>${i.cases?.length || 0}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="muted">IOC bulunamadı</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderAutomations() {
        const library = this.state.data.playbookLibrary || [];
        const activeRuns = this.state.soar.activeRuns || [];
        const completedRuns = this.state.soar.completedRuns || [];

        return `
            <h1 class="view-title">Otomasyonlar (SOAR)</h1>
            
            <div class="simulation-label mb-4">
                <span class="badge medium">SİMÜLASYON</span>
                <span class="muted">Tüm aksiyonlar simüle edilir, gerçek sistemlere etki yoktur</span>
            </div>

            <h2 class="section-title">Playbook Kütüphanesi</h2>
            <div class="card-grid mb-6">
                ${library.map(p => `
                    <div class="card">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <div style="font-weight:600">${this.esc(p.name)}</div>
                                <span class="badge info">${this.esc(p.category)}</span>
                            </div>
                            ${p.requires_approval ? '<span class="badge medium">Onay Gerekli</span>' : ''}
                        </div>
                        <p class="muted" style="font-size:var(--text-sm);margin-bottom:var(--space-3)">${this.esc(p.description)}</p>
                        <div class="muted" style="font-size:var(--text-xs);margin-bottom:var(--space-3)">${p.steps?.length || 0} adım • ${this.esc(p.estimated_time)}</div>
                        <button class="btn btn-secondary btn-sm" onclick="App.showPlaybookPicker(null, '${this.esc(p.id)}')">Vaka Seç ve Çalıştır</button>
                    </div>
                `).join('') || '<div class="empty-state">Playbook bulunamadı</div>'}
            </div>

            ${activeRuns.length ? `
                <h2 class="section-title">Aktif Çalışmalar</h2>
                <div class="table-container mb-6">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Playbook</th>
                                <th>Vaka</th>
                                <th>İlerleme</th>
                                <th>Durum</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activeRuns.map(r => `
                                <tr onclick="App.openDrawer('playbook-run', '${this.esc(r.id)}')">
                                    <td>${this.esc(r.playbookName)}</td>
                                    <td class="mono">${this.esc(r.caseId)}</td>
                                    <td>
                                        <div class="progress-bar" style="width:100px">
                                            <div class="progress-fill" style="width:${((r.currentStep + 1) / r.steps.length) * 100}%"></div>
                                        </div>
                                    </td>
                                    <td><span class="badge info">${r.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <h2 class="section-title">Tamamlanan Çalışmalar</h2>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Playbook</th>
                            <th>Vaka</th>
                            <th>Başlangıç</th>
                            <th>Süre</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...completedRuns, ...(this.state.data.playbooks || [])].slice(0, 20).map(r => `
                            <tr onclick="App.openDrawer('playbook-run', '${this.esc(r.id || r.run_id)}')">
                                <td>${this.esc(r.playbookName || r.playbook_name)}</td>
                                <td class="mono">${this.esc(r.caseId || r.case_id)}</td>
                                <td class="mono muted">${this.formatTime(r.startedAt || r.started_at)}</td>
                                <td>${this.esc(r.duration || '—')}</td>
                                <td><span class="badge ${r.status === 'completed' ? 'low' : 'medium'}">${this.esc(r.status)}</span></td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="muted">Tamamlanan çalışma yok</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderReports() {
        return `
            <h1 class="view-title">Raporlar</h1>
            
            <div class="card-grid">
                <div class="card card-clickable" onclick="App.openReport('executive')">
                    <div class="card-label">Yönetici Özeti</div>
                    <div style="margin-top:var(--space-3);color:var(--text-secondary)">
                        Üst yönetim için üst düzey genel bakış
                    </div>
                </div>
                <div class="card card-clickable" onclick="App.openReport('technical')">
                    <div class="card-label">Teknik Analiz</div>
                    <div style="margin-top:var(--space-3);color:var(--text-secondary)">
                        Detaylı teknik bulgular
                    </div>
                </div>
            </div>
        `;
    },

    renderSettings() {
        if (!Auth.hasRole('admin')) {
            return '<div class="empty-state">Yönetici yetkisi gerekli</div>';
        }

        const users = Auth.getUsers() || {};
        
        return `
            <h1 class="view-title">Ayarlar</h1>
            
            <div class="card mb-6">
                <h2 class="section-title">Kullanıcı Yönetimi</h2>
                <div class="table-container" style="border:none">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Kullanıcı Adı</th>
                                <th>Görünen Ad</th>
                                <th>Rol</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(users).map(([username, user]) => `
                                <tr>
                                    <td class="mono">${this.esc(username)}</td>
                                    <td>${this.esc(user.displayName)}</td>
                                    <td><span class="badge">${this.esc(user.role)}</span></td>
                                    <td>
                                        ${username !== 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="App.deleteUser('${this.esc(username)}')">Sil</button>` : '—'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <button class="btn btn-primary" style="margin-top:var(--space-4)" onclick="App.showCreateUserForm()">Yeni Kullanıcı</button>
            </div>
            
            <div class="card">
                <h2 class="section-title">Sistem</h2>
                <div class="flex gap-4 items-center mb-4">
                    <span>Density:</span>
                    <select class="select" onchange="App.setDensity(this.value)">
                        <option value="comfortable" ${this.state.density === 'comfortable' ? 'selected' : ''}>Rahat</option>
                        <option value="compact" ${this.state.density === 'compact' ? 'selected' : ''}>Kompakt</option>
                    </select>
                </div>
                <button class="btn btn-secondary" onclick="App.resetAllData()">Tüm Verileri Sıfırla</button>
            </div>
        `;
    },

    // ============================================
    // DRAWER
    // ============================================
    openDrawer(type, id) {
        this.state.drawer = { open: true, type, id, tab: 'summary' };
        document.getElementById('drawer-overlay')?.classList.add('active');
        document.getElementById('drawer')?.classList.add('active');
        this.renderDrawerContent();
    },

    closeDrawer() {
        this.state.drawer.open = false;
        document.getElementById('drawer-overlay')?.classList.remove('active');
        document.getElementById('drawer')?.classList.remove('active');
    },

    renderDrawerContent() {
        const { type, id, tab } = this.state.drawer;
        const titleEl = document.getElementById('drawer-title');
        const tabsEl = document.getElementById('drawer-tabs');
        const contentEl = document.getElementById('drawer-content');
        const footerEl = document.getElementById('drawer-footer');

        if (!contentEl) return;

        if (type === 'case') {
            const c = this.state.data.cases?.find(x => x.case_id === id);
            if (!c) { contentEl.innerHTML = '<div class="empty-state">Vaka bulunamadı</div>'; return; }

            titleEl.innerHTML = `<div>${this.esc(c.case_id)}</div><div class="flex gap-2 mt-2"><span class="badge ${this.esc(c.severity)}">${this.esc(c.severity)}</span><span class="badge">${this.esc(c.status)}</span></div>`;
            tabsEl.innerHTML = ['Özet', 'Uyarılar', 'War Room'].map((t, i) => {
                const tabKey = ['summary', 'alerts', 'warroom'][i];
                return `<button class="drawer-tab ${tab === tabKey ? 'active' : ''}" onclick="App.switchDrawerTab('${tabKey}')">${t}</button>`;
            }).join('');

            if (tab === 'summary') {
                contentEl.innerHTML = `
                    <div class="drawer-section"><h4>Başlık</h4><p>${this.esc(c.title)}</p></div>
                    <div class="drawer-section"><h4>Anlatı</h4><p style="line-height:1.6">${this.esc(c.narrative)}</p></div>
                    <div class="drawer-section"><h4>Etkilenen Kullanıcılar</h4>${c.affected_users?.map(u => `<span class="chip">${this.esc(u)}</span>`).join(' ') || '—'}</div>
                    <div class="drawer-section"><h4>Etkilenen Cihazlar</h4>${c.affected_devices?.map(d => `<span class="chip">${this.esc(d)}</span>`).join(' ') || '—'}</div>
                    <div class="drawer-section"><h4>MITRE Teknikleri</h4>${c.mitre_techniques?.map(t => `<span class="badge info">${this.esc(t)}</span>`).join(' ') || '—'}</div>
                `;
                footerEl.innerHTML = `<button class="btn btn-primary" onclick="App.showPlaybookPicker('${this.esc(c.case_id)}')">Playbook Çalıştır</button>`;
            } else if (tab === 'alerts') {
                const alerts = this.state.data.alerts?.filter(a => c.alert_ids?.includes(a.alert_id)) || [];
                contentEl.innerHTML = `<div class="drawer-section"><h4>Vaka Uyarıları (${alerts.length})</h4>${alerts.map(a => `
                    <div style="padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2);cursor:pointer" onclick="App.openDrawer('alert','${this.esc(a.alert_id)}')">
                        <div class="flex justify-between"><strong>${this.esc(a.name)}</strong><span class="badge ${this.esc(a.severity)}">${this.esc(a.severity)}</span></div>
                        <div class="muted mt-2">${this.esc(a.hypothesis)}</div>
                    </div>
                `).join('') || '<div class="muted">Uyarı yok</div>'}</div>`;
                footerEl.innerHTML = '';
            } else if (tab === 'warroom') {
                const notes = this.getWarRoomNotes(id);
                contentEl.innerHTML = `
                    <div class="war-room">
                        <div class="war-room-feed">${notes.length ? notes.map(n => `
                            <div class="war-room-item">
                                <div class="war-room-time">${this.formatTime(n.timestamp)} - ${this.esc(n.user || 'sistem')}</div>
                                <div>${this.esc(n.message)}</div>
                            </div>
                        `).join('') : '<div class="muted">Henüz aktivite yok</div>'}</div>
                        ${Auth.hasRole('analyst') ? `
                            <div class="war-room-input">
                                <textarea id="war-room-note" placeholder="Not ekle..."></textarea>
                                <button class="btn btn-primary" onclick="App.addWarRoomNote('${this.esc(id)}')">Ekle</button>
                            </div>
                        ` : ''}
                    </div>
                `;
                footerEl.innerHTML = '';
            }
        } else if (type === 'alert') {
            const a = this.state.data.alerts?.find(x => x.alert_id === id);
            if (!a) { contentEl.innerHTML = '<div class="empty-state">Uyarı bulunamadı</div>'; return; }

            titleEl.textContent = a.alert_id;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="drawer-section"><h4>Uyarı</h4><div style="font-size:var(--text-lg);font-weight:600">${this.esc(a.name)}</div><div class="flex gap-2 mt-2"><span class="badge ${this.esc(a.severity)}">${this.esc(a.severity)}</span><span class="badge">${this.esc(a.confidence)}</span></div></div>
                <div class="drawer-section"><h4>Hipotez</h4><p>${this.esc(a.hypothesis)}</p></div>
                <div class="drawer-section"><h4>Varlık</h4><span class="chip">${this.esc(a.entity?.user || '—')}</span></div>
                <div class="drawer-section"><h4>MITRE</h4>${a.mitre?.map(m => `<div style="padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2)"><span class="badge info">${this.esc(m.id)}</span> <span style="margin-left:var(--space-2)">${this.esc(m.name)}</span></div>`).join('') || '—'}</div>
                <div class="drawer-section"><h4>Önerilen Aksiyonlar</h4><ul style="list-style:none">${a.recommended_actions?.map(ac => `<li style="padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle)">• ${this.esc(ac)}</li>`).join('') || '—'}</ul></div>
            `;
            footerEl.innerHTML = a.case_id ? `<button class="btn btn-primary" onclick="App.openDrawer('case','${this.esc(a.case_id)}')">Vakayı Aç</button>` : '';
        } else if (type === 'device') {
            const d = this.state.data.devices?.find(x => x.id === id);
            if (!d) { contentEl.innerHTML = '<div class="empty-state">Cihaz bulunamadı</div>'; return; }
            const state = this.getDeviceState(id);

            titleEl.innerHTML = `<div>${this.esc(d.hostname)}</div>${state.isolated ? '<span class="badge critical mt-2">İZOLE</span>' : ''}`;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="simulation-label mb-4"><span class="badge medium">SİMÜLASYON</span></div>
                <div class="drawer-section">
                    <h4>Cihaz Bilgileri</h4>
                    <div style="display:grid;grid-template-columns:100px 1fr;gap:var(--space-2)">
                        <div class="muted">ID</div><div class="mono">${this.esc(d.id)}</div>
                        <div class="muted">OS</div><div>${this.esc(d.os)}</div>
                        <div class="muted">Sahip</div><div>${this.esc(d.owner)}</div>
                        <div class="muted">Konum</div><div>${this.esc(d.location)}</div>
                        <div class="muted">Risk</div><div><span class="badge ${d.risk_score >= 50 ? 'high' : 'low'}">${d.risk_score || 0}</span></div>
                        <div class="muted">Son AV</div><div class="mono">${state.lastAvScan ? this.formatTime(state.lastAvScan) : '—'}</div>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>EDR Aksiyonları</h4>
                    <div class="flex gap-2 flex-wrap">
                        ${state.isolated 
                            ? `<button class="btn btn-secondary" onclick="App.performEdrAction('${this.esc(d.id)}', 'release')">İzolasyonu Kaldır</button>`
                            : `<button class="btn btn-secondary" onclick="App.performEdrAction('${this.esc(d.id)}', 'isolate')">Cihazı İzole Et</button>`
                        }
                        <button class="btn btn-secondary" onclick="App.performEdrAction('${this.esc(d.id)}', 'av_scan', {type:'full'})">Tam AV Tarama</button>
                        <button class="btn btn-secondary" onclick="App.performEdrAction('${this.esc(d.id)}', 'collect_triage')">Triyaj Paketi</button>
                    </div>
                </div>
                ${state.quarantinedFiles?.length ? `<div class="drawer-section"><h4>Karantina Dosyaları</h4>${state.quarantinedFiles.map(f => `<div class="mono" style="font-size:var(--text-xs)">${this.esc(f.path)}</div>`).join('')}</div>` : ''}
                <div class="drawer-section">
                    <h4>Son Prosesler</h4>
                    ${d.recent_processes?.slice(0, 10).map(p => `<div class="mono" style="font-size:var(--text-xs);padding:var(--space-1) 0">${this.esc(p.process)} ${p.parent ? `← ${this.esc(p.parent)}` : ''}</div>`).join('') || '<div class="muted">Veri yok</div>'}
                </div>
            `;
            footerEl.innerHTML = '';
        } else if (type === 'event') {
            const allEvents = [...this.state.live.buffer, ...(this.state.data.events || [])];
            const e = allEvents.find(x => x.event_id === id);
            if (!e) { contentEl.innerHTML = '<div class="empty-state">Olay bulunamadı</div>'; return; }

            titleEl.textContent = e.event_id;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                ${e._live ? '<div class="simulation-label mb-4"><span class="badge info">LIVE EVENT</span></div>' : ''}
                <div class="drawer-section">
                    <h4>Olay Detayları</h4>
                    <div style="display:grid;grid-template-columns:100px 1fr;gap:var(--space-2)">
                        <div class="muted">Zaman</div><div class="mono">${this.esc(e.timestamp)}</div>
                        <div class="muted">Kaynak</div><div><span class="badge info">${this.esc(e.source)}</span></div>
                        <div class="muted">Tür</div><div>${this.esc(e.event_type)}</div>
                        <div class="muted">Kullanıcı</div><div><span class="chip">${this.esc(e.user || '—')}</span></div>
                        <div class="muted">IP</div><div class="mono">${this.esc(e.src_ip || '—')}</div>
                        <div class="muted">Cihaz</div><div class="mono">${this.esc(e.device_id || '—')}</div>
                        <div class="muted">Domain</div><div class="mono">${this.esc(e.domain || '—')}</div>
                    </div>
                </div>
                <div class="drawer-section"><h4>Özet</h4><p>${this.esc(e.summary)}</p></div>
                <div class="drawer-section"><h4>Etiketler</h4>${e.tags?.map(t => `<span class="chip">${this.esc(t)}</span>`).join(' ') || '—'}</div>
            `;
            footerEl.innerHTML = e.device_id ? `<button class="btn btn-secondary" onclick="App.openDrawer('device','${this.esc(e.device_id)}')">Cihazı Aç</button>` : '';
        }
    },

    switchDrawerTab(tab) {
        this.state.drawer.tab = tab;
        this.renderDrawerContent();
    },

    // ============================================
    // PLAYBOOK PICKER
    // ============================================
    showPlaybookPicker(caseId, playbookId) {
        const modal = document.getElementById('user-modal');
        const body = document.getElementById('user-modal-body');
        const header = document.querySelector('#user-modal .modal-header h2');
        
        if (header) header.textContent = playbookId ? 'Vaka Seç' : 'Playbook Seç';
        
        if (playbookId) {
            // Select case for playbook
            const cases = this.state.data.cases || [];
            body.innerHTML = `
                <div class="simulation-label mb-4"><span class="badge medium">SİMÜLASYON</span></div>
                <div style="max-height:400px;overflow-y:auto">
                    ${cases.map(c => `
                        <div style="padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2);cursor:pointer" onclick="App.runPlaybook('${this.esc(playbookId)}','${this.esc(c.case_id)}'); document.getElementById('user-modal').style.display='none';">
                            <div class="flex justify-between"><strong>${this.esc(c.case_id)}</strong><span class="badge ${this.esc(c.severity)}">${this.esc(c.severity)}</span></div>
                            <div class="muted">${this.esc(c.title)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Select playbook for case
            const library = this.state.data.playbookLibrary || [];
            body.innerHTML = `
                <div class="simulation-label mb-4"><span class="badge medium">SİMÜLASYON</span></div>
                <div style="max-height:400px;overflow-y:auto">
                    ${library.map(p => `
                        <div style="padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2);cursor:pointer" onclick="App.runPlaybook('${this.esc(p.id)}','${this.esc(caseId)}'); document.getElementById('user-modal').style.display='none';">
                            <div class="flex justify-between"><strong>${this.esc(p.name)}</strong><span class="badge info">${this.esc(p.category)}</span></div>
                            <div class="muted" style="font-size:var(--text-sm)">${this.esc(p.description)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        modal.style.display = 'flex';
    },

    // ============================================
    // COMMAND PALETTE
    // ============================================
    openCmdPalette() {
        this.state.cmdPalette = true;
        document.getElementById('cmd-palette')?.classList.add('active');
        document.getElementById('cmd-input')?.focus();
        this.renderCmdResults('');
    },

    closeCmdPalette() {
        this.state.cmdPalette = false;
        document.getElementById('cmd-palette')?.classList.remove('active');
        const input = document.getElementById('cmd-input');
        if (input) input.value = '';
    },

    handleCmdSearch(query) {
        this.renderCmdResults(query.toLowerCase());
    },

    renderCmdResults(query) {
        const results = document.getElementById('cmd-results');
        if (!results) return;

        const commands = [
            { icon: '📊', label: 'Genel Bakış', hint: 'Ana sayfaya git', action: () => this.switchView('overview') },
            { icon: '📋', label: 'Vakalar', hint: 'Tüm vakaları görüntüle', action: () => this.switchView('cases') },
            { icon: '⚠️', label: 'Uyarılar', hint: 'Tüm uyarıları görüntüle', action: () => this.switchView('alerts') },
            { icon: '🔍', label: 'Olay Arama', hint: 'SIEM arama', action: () => this.switchView('search') },
            { icon: '💻', label: 'EDR', hint: 'Uç nokta yönetimi', action: () => this.switchView('edr') },
            { icon: '🤖', label: 'Otomasyonlar', hint: 'SOAR playbook\'lar', action: () => this.switchView('automations') },
            { icon: '▶️', label: 'Live Toggle', hint: 'Live feed aç/kapat', action: () => this.toggleLive() },
            { icon: '🔄', label: 'Yenile', hint: 'Veriyi yeniden yükle', action: () => this.refreshData() },
            { icon: '🔒', label: 'Kilitle', hint: 'Oturumu kilitle', action: () => this.lockScreen() },
        ];

        const filtered = query 
            ? commands.filter(c => c.label.toLowerCase().includes(query) || c.hint.toLowerCase().includes(query))
            : commands;

        results.innerHTML = filtered.slice(0, 10).map((c, i) => `
            <div class="cmd-item ${i === 0 ? 'selected' : ''}" onclick="App._cmdCommands[${commands.indexOf(c)}].action(); App.closeCmdPalette();">
                <span class="cmd-item-icon">${c.icon}</span>
                <div class="cmd-item-text">
                    <div class="cmd-item-label">${this.esc(c.label)}</div>
                    <div class="cmd-item-hint">${this.esc(c.hint)}</div>
                </div>
            </div>
        `).join('');
        
        this._cmdCommands = commands;
    },

    // ============================================
    // UTILITIES
    // ============================================
    showSkeleton() {
        const skeleton = document.getElementById('skeleton');
        const container = document.getElementById('view-container');
        if (skeleton) skeleton.classList.add('active');
        if (container) container.style.display = 'none';
    },

    hideSkeleton() {
        const skeleton = document.getElementById('skeleton');
        const container = document.getElementById('view-container');
        if (skeleton) skeleton.classList.remove('active');
        if (container) container.style.display = 'block';
    },

    updateStatus(status, text) {
        const pill = document.getElementById('status-pill');
        if (pill) {
            pill.className = `status-pill ${status}`;
            const textEl = pill.querySelector('.status-text');
            if (textEl) textEl.textContent = text;
        }
    },

    updateLastLoaded() {
        const el = document.getElementById('last-loaded');
        if (el) el.textContent = `Son: ${new Date().toLocaleTimeString('tr-TR')}`;
    },

    updateBadges() {
        const casesBadge = document.getElementById('cases-badge');
        const alertsBadge = document.getElementById('alerts-badge');
        if (casesBadge) casesBadge.textContent = this.state.data.cases?.filter(c => c.status !== 'closed').length || 0;
        if (alertsBadge) alertsBadge.textContent = this.state.data.alerts?.filter(a => a.severity === 'critical').length || 0;
    },

    showEmptyState(message) {
        const container = document.getElementById('view-container');
        if (container) {
            container.innerHTML = `<div class="empty-state"><h2>Veri Bulunamadı</h2><p style="margin-top:var(--space-4)">${this.esc(message)}</p></div>`;
        }
    },

    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    },

    setDensity(density) {
        this.state.density = density;
        document.body.className = `density-${density}`;
        localStorage.setItem('soc_density', density);
    },

    exportData() {
        if (!Auth.hasRole('analyst')) {
            this.toast('Dışa aktarma için analist yetkisi gerekli', 'error');
            return;
        }
        const data = { cases: this.state.data.cases, alerts: this.state.data.alerts, exported_at: new Date().toISOString() };
        this.downloadFile(JSON.stringify(data, null, 2), `soc-export-${Date.now()}.json`, 'application/json');
        this.toast('Veri dışa aktarıldı', 'success');
    },

    exportIOCs() {
        const iocs = this.state.data.iocs || [];
        const csv = 'type,indicator,tags,confidence\n' + iocs.map(i => `${i.type},${i.indicator},"${i.tags?.join(';')}",${i.confidence}`).join('\n');
        this.downloadFile(csv, 'iocs.csv', 'text/csv');
        this.toast('IOC\'ler dışa aktarıldı', 'success');
    },

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    async openReport(type) {
        try {
            const res = await fetch(`./dashboard_data/report_${type}.md`);
            const md = await res.text();
            this.openDrawer('report', type);
            document.getElementById('drawer-title').textContent = type === 'executive' ? 'Yönetici Özeti' : 'Teknik Analiz';
            document.getElementById('drawer-tabs').innerHTML = '';
            document.getElementById('drawer-content').innerHTML = `<div style="line-height:1.8">${this.renderMarkdown(md)}</div>`;
        } catch { this.toast('Rapor yüklenemedi', 'error'); }
    },

    formatTime(isoString) {
        if (!isoString) return '—';
        try {
            return new Date(isoString).toLocaleString('tr-TR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    },

    esc(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    renderMarkdown(md) {
        if (!md) return '';
        let html = this.esc(md);
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/\n\n/g, '</p><p>');
        return '<p>' + html + '</p>';
    },

    getWarRoomNotes(caseId) {
        try { return JSON.parse(localStorage.getItem(`warroom_${caseId}`) || '[]'); } catch { return []; }
    },

    addWarRoomNote(caseId, message) {
        if (!message && document.getElementById('war-room-note')) {
            message = document.getElementById('war-room-note').value.trim();
        }
        if (!message) return;
        
        const notes = this.getWarRoomNotes(caseId);
        notes.push({ timestamp: new Date().toISOString(), message, user: this.state.session?.username });
        localStorage.setItem(`warroom_${caseId}`, JSON.stringify(notes));
        
        if (document.getElementById('war-room-note')) {
            document.getElementById('war-room-note').value = '';
        }
        this.renderDrawerContent();
        this.toast('Not eklendi', 'success');
    },

    showCreateUserForm() {
        const modal = document.getElementById('user-modal');
        const body = document.getElementById('user-modal-body');
        body.innerHTML = `
            <form id="create-user-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="form-group"><label>Kullanıcı Adı</label><input type="text" id="new-username" class="input" required></div>
                <div class="form-group"><label>Görünen Ad</label><input type="text" id="new-displayname" class="input" required></div>
                <div class="form-group"><label>Parola</label><input type="password" id="new-password" class="input" required></div>
                <div class="form-group"><label>Rol</label><select id="new-role" class="select"><option value="viewer">İzleyici</option><option value="analyst">Analist</option><option value="admin">Yönetici</option></select></div>
                <button type="submit" class="btn btn-primary">Oluştur</button>
            </form>
        `;
        document.getElementById('create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await Auth.createUser(document.getElementById('new-username').value, document.getElementById('new-password').value, document.getElementById('new-role').value, document.getElementById('new-displayname').value);
                modal.style.display = 'none';
                this.toast('Kullanıcı oluşturuldu', 'success');
                this.renderView();
            } catch (err) { this.toast(err.message, 'error'); }
        });
        modal.style.display = 'flex';
    },

    deleteUser(username) {
        if (!confirm(`${username} kullanıcısını silmek istediğinizden emin misiniz?`)) return;
        try { Auth.deleteUser(username); this.toast('Kullanıcı silindi', 'success'); this.renderView(); }
        catch (err) { this.toast(err.message, 'error'); }
    },

    resetAllData() {
        if (!confirm('Tüm verileri sıfırlamak istediğinizden emin misiniz?')) return;
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = './login.html';
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => App.init());
