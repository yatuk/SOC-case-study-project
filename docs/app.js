/**
 * SOC Console - Main Application
 * With Authentication, RBAC, and Security Features
 */

const App = {
    // State
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
        cmdPalette: false
    },

    // Initialize
    init() {
        // Verify session
        this.state.session = Auth.getSession();
        if (!this.state.session) {
            window.location.href = './login.html';
            return;
        }

        this.updateUserDisplay();
        this.applyRBAC();
        this.bindEvents();
        this.loadData();
        this.initKeyboardShortcuts();
    },

    // Update user display
    updateUserDisplay() {
        const session = this.state.session;
        document.getElementById('user-name').textContent = session.displayName || session.username;
        document.getElementById('user-role').textContent = this.getRoleLabel(session.role);
        document.getElementById('user-avatar').textContent = (session.displayName || session.username).charAt(0).toUpperCase();
    },

    getRoleLabel(role) {
        const labels = { admin: 'Yönetici', analyst: 'Analist', viewer: 'İzleyici' };
        return labels[role] || role;
    },

    // Apply RBAC to UI
    applyRBAC() {
        const session = this.state.session;
        
        // Hide admin-only nav items for non-admins
        document.querySelectorAll('[data-role="admin"]').forEach(el => {
            if (!Auth.hasRole('admin')) {
                el.classList.add('hidden');
            }
        });
    },

    // Event Binding
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                const requiredRole = item.dataset.role;
                
                if (requiredRole && !Auth.hasRole(requiredRole)) {
                    this.toast('Bu sayfaya erişim yetkiniz yok', 'error');
                    return;
                }
                
                this.switchView(view);
            });
        });

        // Search box
        document.getElementById('search-box').addEventListener('click', () => this.openCmdPalette());
        document.getElementById('global-search').addEventListener('click', () => this.openCmdPalette());

        // Command bar buttons
        document.getElementById('refresh-btn').addEventListener('click', () => this.refreshData());
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());

        // Lock button
        document.getElementById('lock-btn').addEventListener('click', () => this.lockScreen());

        // Drawer
        document.getElementById('drawer-overlay').addEventListener('click', () => this.closeDrawer());
        document.getElementById('drawer-close').addEventListener('click', () => this.closeDrawer());

        // Command Palette
        document.getElementById('cmd-palette').addEventListener('click', (e) => {
            if (e.target.id === 'cmd-palette') this.closeCmdPalette();
        });
        document.getElementById('cmd-input').addEventListener('input', (e) => this.handleCmdSearch(e.target.value));

        // User modal
        document.getElementById('close-user-modal')?.addEventListener('click', () => {
            document.getElementById('user-modal').style.display = 'none';
        });
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

    // Lock screen
    lockScreen() {
        Auth.logout();
        window.location.href = './login.html';
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
                            .map(line => { try { return Security.parseJsonSafe(line); } catch { return null; }})
                            .filter(Boolean);
                    } else {
                        const text = await res.text();
                        const json = Security.parseJsonSafe(text);
                        if (json) {
                            this.state.data[key] = json[key] || json.cases || json.iocs || json.devices || json;
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to load ${file}:`, err);
                }
            }));

            this.updateStatus('ok', 'Veri Yüklendi');
            this.updateBadges();
            this.hideSkeleton();
            this.renderView();
            this.updateLastLoaded();

        } catch (err) {
            console.error('Data load failed:', err);
            this.updateStatus('error', 'Yükleme Hatası');
            this.hideSkeleton();
            this.showEmptyState('Veri yüklenemedi. python run_pipeline.py komutunu çalıştırın.');
        }
    },

    async refreshData() {
        const btn = document.getElementById('refresh-btn');
        btn.classList.add('spinning');
        await this.loadData();
        btn.classList.remove('spinning');
        this.toast('Veri yenilendi', 'success');
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
            reports: () => this.renderReports(),
            settings: () => this.renderSettings()
        };

        container.innerHTML = renderers[this.state.view]?.() || '<div class="empty-state">Sayfa bulunamadı</div>';
        container.style.animation = 'none';
        container.offsetHeight;
        container.style.animation = null;
    },

    // ============================================
    // VIEW RENDERERS (Using Security.escapeHtml)
    // ============================================

    renderOverview() {
        const s = this.state.data.summary?.metrics || {};
        const activeCases = this.state.data.cases?.filter(c => c.status !== 'closed').length || 0;
        const criticalAlerts = this.state.data.alerts?.filter(a => a.severity === 'critical').length || 0;
        
        return `
            <h1 class="view-title">Genel Bakış</h1>
            
            <div class="card-grid">
                <div class="card card-clickable" onclick="App.switchView('cases')">
                    <div class="card-label">Aktif Vakalar</div>
                    <div class="card-value">${activeCases}</div>
                    <div class="card-meta">${this.state.data.cases?.length || 0} toplam vaka</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('alerts')">
                    <div class="card-label">Toplam Uyarı</div>
                    <div class="card-value">${this.state.data.alerts?.length || 0}</div>
                    <div class="card-meta">${criticalAlerts} kritik</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('search')">
                    <div class="card-label">Analiz Edilen Olay</div>
                    <div class="card-value">${this.state.data.events?.length || 0}</div>
                    <div class="card-meta">Son 14 gün</div>
                </div>
                <div class="card card-clickable" onclick="App.switchView('edr')">
                    <div class="card-label">İzlenen Cihaz</div>
                    <div class="card-value">${this.state.data.devices?.length || 0}</div>
                    <div class="card-meta">${s.affected_devices || 0} etkilenen</div>
                </div>
            </div>

            <h2 class="section-title">Son Vakalar</h2>
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Vaka ID</th>
                            <th>Başlık</th>
                            <th>Önem</th>
                            <th>Durum</th>
                            <th>Kullanıcılar</th>
                            <th>Uyarılar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(this.state.data.cases || []).slice(0, 5).map(c => `
                            <tr onclick="App.openDrawer('case', '${Security.escapeAttr(c.case_id)}')">
                                <td class="mono">${Security.escapeHtml(c.case_id)}</td>
                                <td>${Security.escapeHtml(c.title)}</td>
                                <td><span class="badge ${Security.escapeAttr(c.severity)}">${Security.escapeHtml(c.severity)}</span></td>
                                <td>${Security.escapeHtml(c.status)}</td>
                                <td>${c.affected_users?.length || 0}</td>
                                <td>${c.alert_ids?.length || 0}</td>
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
                            <th>Kullanıcılar</th>
                            <th>Cihazlar</th>
                            <th>Uyarılar</th>
                            <th>Oluşturulma</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filterCases(cases).map(c => `
                            <tr onclick="App.openDrawer('case', '${Security.escapeAttr(c.case_id)}')">
                                <td class="mono">${Security.escapeHtml(c.case_id)}</td>
                                <td class="truncate" style="max-width:200px">${Security.escapeHtml(c.title)}</td>
                                <td><span class="badge ${Security.escapeAttr(c.severity)}${c.severity === 'critical' ? ' pulse' : ''}">${Security.escapeHtml(c.severity)}</span></td>
                                <td>${Security.escapeHtml(c.status)}</td>
                                <td>${Security.escapeHtml(c.owner || 'atanmamış')}</td>
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
            const caseId = a.case_id || 'Kategorisiz';
            if (!grouped[caseId]) grouped[caseId] = [];
            grouped[caseId].push(a);
        });

        return `
            <h1 class="view-title">Uyarılar</h1>
            
            ${Object.entries(grouped).map(([caseId, caseAlerts]) => {
                const caseData = this.state.data.cases?.find(c => c.case_id === caseId);
                return `
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="section-title" style="margin-bottom:0">
                                ${caseData ? `${Security.escapeHtml(caseId)} — ${Security.escapeHtml(caseData.title)}` : Security.escapeHtml(caseId)}
                            </h2>
                            ${caseData ? `<span class="badge ${Security.escapeAttr(caseData.severity)}">${Security.escapeHtml(caseData.severity)}</span>` : ''}
                        </div>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Uyarı</th>
                                        <th>Önem</th>
                                        <th>Güven</th>
                                        <th>Varlık</th>
                                        <th>Kanıt</th>
                                        <th>MITRE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${caseAlerts.map(a => `
                                        <tr onclick="App.openDrawer('alert', '${Security.escapeAttr(a.alert_id)}')">
                                            <td>
                                                <div>${Security.escapeHtml(a.name)}</div>
                                                <div class="muted mono" style="font-size:var(--text-xs)">${Security.escapeHtml(a.alert_id)}</div>
                                            </td>
                                            <td><span class="badge ${Security.escapeAttr(a.severity)}">${Security.escapeHtml(a.severity)}</span></td>
                                            <td><span class="badge">${Security.escapeHtml(a.confidence)}</span></td>
                                            <td>
                                                <span class="chip" onclick="event.stopPropagation(); App.pivotEntity('${Security.escapeAttr(a.entity?.user)}')">${Security.escapeHtml(a.entity?.user?.split('@')[0] || '—')}</span>
                                            </td>
                                            <td>${a.evidence?.length || 0} olay</td>
                                            <td>${a.mitre?.slice(0,2).map(m => `<span class="badge info">${Security.escapeHtml(m.id)}</span>`).join(' ') || '—'}</td>
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
            <h1 class="view-title">Olay Arama</h1>
            
            <div class="table-container mb-6">
                <div class="table-toolbar">
                    <input type="text" class="input" placeholder="Olay ara (örn: user:ayse source:idp)" 
                           style="width:400px" id="event-search" onkeyup="App.searchEvents(this.value)">
                    <span class="muted">${events.length} olay</span>
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
                        ${events.slice(0, 50).map(e => `
                            <tr onclick="App.openDrawer('event', '${Security.escapeAttr(e.event_id)}')">
                                <td class="mono muted" style="font-size:var(--text-xs)">${this.formatTime(e.timestamp)}</td>
                                <td><span class="badge info">${Security.escapeHtml(e.source)}</span></td>
                                <td>${Security.escapeHtml(e.event_type)}</td>
                                <td class="chip" onclick="event.stopPropagation(); App.pivotEntity('${Security.escapeAttr(e.user)}')">${Security.escapeHtml(e.user?.split('@')[0] || '—')}</td>
                                <td class="mono">${Security.escapeHtml(e.src_ip || '—')}</td>
                                <td class="truncate" style="max-width:300px">${Security.escapeHtml(e.summary)}</td>
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
            <tr onclick="App.openDrawer('event', '${Security.escapeAttr(e.event_id)}')">
                <td class="mono muted" style="font-size:var(--text-xs)">${this.formatTime(e.timestamp)}</td>
                <td><span class="badge info">${Security.escapeHtml(e.source)}</span></td>
                <td>${Security.escapeHtml(e.event_type)}</td>
                <td class="chip" onclick="event.stopPropagation(); App.pivotEntity('${Security.escapeAttr(e.user)}')">${Security.escapeHtml(e.user?.split('@')[0] || '—')}</td>
                <td class="mono">${Security.escapeHtml(e.src_ip || '—')}</td>
                <td class="truncate" style="max-width:300px">${Security.escapeHtml(e.summary)}</td>
            </tr>
        `).join('');
    },

    renderEntities() {
        const users = Object.entries(this.state.data.entities?.users || {});
        const risk = this.state.data.risk?.entity_scores || {};

        return `
            <h1 class="view-title">Varlıklar</h1>
            
            <div class="card-grid">
                ${users.map(([email, data]) => {
                    const score = risk[email]?.score || 0;
                    const severity = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
                    return `
                        <div class="card card-clickable" onclick="App.openDrawer('entity', '${Security.escapeAttr(email)}')">
                            <div class="flex justify-between items-center mb-4">
                                <div>
                                    <div style="font-weight:600">${Security.escapeHtml(data.name || email.split('@')[0])}</div>
                                    <div class="muted" style="font-size:var(--text-xs)">${Security.escapeHtml(email)}</div>
                                </div>
                                <span class="badge ${severity}">Risk: ${score}</span>
                            </div>
                            <div class="muted" style="font-size:var(--text-sm)">
                                <div>${data.event_count || 0} olay</div>
                                <div>${data.devices?.length || 0} cihaz</div>
                                <div>${data.ips?.length || 0} IP</div>
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
            <h1 class="view-title">Uç Nokta Algılama ve Yanıt</h1>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Hostname</th>
                            <th>İşletim Sistemi</th>
                            <th>Sahip</th>
                            <th>Son Görülme</th>
                            <th>Risk</th>
                            <th>Süreçler</th>
                            <th>Bağlantılar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devices.map(d => `
                            <tr onclick="App.openDrawer('device', '${Security.escapeAttr(d.id)}')">
                                <td class="mono">${Security.escapeHtml(d.hostname)}</td>
                                <td>${Security.escapeHtml(d.os)}</td>
                                <td class="chip" onclick="event.stopPropagation(); App.pivotEntity('${Security.escapeAttr(d.owner)}')">${Security.escapeHtml(d.owner?.split('@')[0] || '—')}</td>
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
            <h1 class="view-title">Olay Zaman Çizelgesi</h1>
            
            <div class="timeline">
                ${events.map(e => {
                    const sev = e.tags?.includes('suspicious') || e.tags?.includes('malicious') ? 'high' : '';
                    return `
                        <div class="timeline-item ${sev}" onclick="App.openDrawer('event', '${Security.escapeAttr(e.event_id)}')">
                            <div class="timeline-marker"></div>
                            <div class="timeline-time">${this.formatTime(e.timestamp)}</div>
                            <div class="timeline-content">
                                <div class="flex justify-between items-center">
                                    <span class="badge info">${Security.escapeHtml(e.source)}</span>
                                    <span>${Security.escapeHtml(e.event_type)}</span>
                                </div>
                                <div style="margin-top:var(--space-2)">${Security.escapeHtml(e.summary)}</div>
                                <div class="flex gap-2" style="margin-top:var(--space-2)">
                                    ${e.user ? `<span class="chip">${Security.escapeHtml(e.user.split('@')[0])}</span>` : ''}
                                    ${e.src_ip ? `<span class="chip">${Security.escapeHtml(e.src_ip)}</span>` : ''}
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
            <h1 class="view-title">MITRE ATT&CK Kapsamı</h1>
            
            <div class="mitre-grid">
                ${techniques.map(t => `
                    <div class="mitre-cell ${t.count > 0 ? 'active' : ''}" onclick="App.filterByMITRE('${Security.escapeAttr(t.id)}')">
                        <div class="mitre-id">${Security.escapeHtml(t.id)}</div>
                        <div class="mitre-name">${Security.escapeHtml(t.name)}</div>
                        <div class="mitre-tactic">${Security.escapeHtml(t.tactic)}</div>
                        <div style="margin-top:var(--space-2)">
                            <span class="badge">${t.count} gözlem</span>
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
                <h1 class="view-title" style="margin-bottom:0">Tehdit İstihbaratı</h1>
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
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${iocs.map(i => `
                            <tr>
                                <td><span class="badge">${Security.escapeHtml(i.type)}</span></td>
                                <td class="mono">${Security.escapeHtml(i.indicator)}</td>
                                <td>${i.tags?.map(t => `<span class="chip">${Security.escapeHtml(t)}</span>`).join(' ') || '—'}</td>
                                <td>${Security.escapeHtml(i.confidence || 'medium')}</td>
                                <td>${i.cases?.length || 0}</td>
                                <td><button class="btn btn-secondary btn-sm" onclick="App.copyText('${Security.escapeJs(i.indicator)}')">Kopyala</button></td>
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
            <h1 class="view-title">Otomasyonlar (SOAR)</h1>
            
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Playbook</th>
                            <th>Vaka</th>
                            <th>Durum</th>
                            <th>Süre</th>
                            <th>Aksiyonlar</th>
                            <th>Başlangıç</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playbooks.map(p => `
                            <tr onclick="App.openDrawer('playbook', '${Security.escapeAttr(p.run_id)}')">
                                <td>
                                    <div>${Security.escapeHtml(p.playbook_name)}</div>
                                    <div class="muted mono" style="font-size:var(--text-xs)">${Security.escapeHtml(p.run_id)}</div>
                                </td>
                                <td class="mono">${Security.escapeHtml(p.case_id || '—')}</td>
                                <td><span class="badge ${p.status === 'completed' ? 'low' : 'medium'}">${Security.escapeHtml(p.status)}</span></td>
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
                                <th>Oluşturulma</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(users).map(([username, user]) => `
                                <tr>
                                    <td class="mono">${Security.escapeHtml(username)}</td>
                                    <td>${Security.escapeHtml(user.displayName)}</td>
                                    <td><span class="badge">${Security.escapeHtml(user.role)}</span></td>
                                    <td class="mono muted">${this.formatTime(user.createdAt)}</td>
                                    <td>
                                        ${username !== 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="App.deleteUser('${Security.escapeJs(username)}')">Sil</button>` : '—'}
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
                <p class="muted mb-4">Simülasyon verilerini sıfırlamak için kullanın.</p>
                <button class="btn btn-secondary" onclick="App.resetAllData()">Tüm Verileri Sıfırla</button>
            </div>
        `;
    },

    async openReport(type) {
        try {
            const res = await fetch(`./dashboard_data/report_${type}.md`);
            const md = await res.text();
            
            this.openDrawer('report', type);
            document.getElementById('drawer-title').textContent = type === 'executive' ? 'Yönetici Özeti' : 'Teknik Analiz';
            document.getElementById('drawer-tabs').innerHTML = '';
            document.getElementById('drawer-content').innerHTML = `
                <div style="line-height:1.8">${Security.renderMarkdown(md)}</div>
            `;
        } catch (err) {
            this.toast('Rapor yüklenemedi', 'error');
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

        if (type === 'case') {
            const c = this.state.data.cases?.find(x => x.case_id === id);
            if (!c) return;

            titleEl.innerHTML = `
                <div>${Security.escapeHtml(c.case_id)}</div>
                <div class="flex gap-2" style="margin-top:var(--space-2)">
                    <span class="badge ${Security.escapeAttr(c.severity)}">${Security.escapeHtml(c.severity)}</span>
                    <span class="badge">${Security.escapeHtml(c.status)}</span>
                </div>
            `;

            tabsEl.innerHTML = ['Özet', 'Uyarılar', 'Zaman Çizelgesi', 'War Room'].map(t => {
                const tabKey = t.toLowerCase().replace(' ', '');
                return `<button class="drawer-tab ${tab === tabKey ? 'active' : ''}" 
                         onclick="App.switchDrawerTab('${tabKey}')">${t}</button>`;
            }).join('');

            if (tab === 'summary' || tab === 'özet') {
                contentEl.innerHTML = `
                    <div class="drawer-section">
                        <h4>Başlık</h4>
                        <p>${Security.escapeHtml(c.title)}</p>
                    </div>
                    <div class="drawer-section">
                        <h4>Anlatı</h4>
                        <p style="line-height:1.6">${Security.escapeHtml(c.narrative)}</p>
                    </div>
                    <div class="drawer-section">
                        <h4>Etkilenen Kullanıcılar</h4>
                        ${c.affected_users?.map(u => `<span class="chip">${Security.escapeHtml(u)}</span>`).join(' ') || '—'}
                    </div>
                    <div class="drawer-section">
                        <h4>MITRE Teknikleri</h4>
                        ${c.mitre_techniques?.map(t => `<span class="badge info">${Security.escapeHtml(t)}</span>`).join(' ') || '—'}
                    </div>
                `;
            } else if (tab === 'uyarılar') {
                const alerts = this.state.data.alerts?.filter(a => c.alert_ids?.includes(a.alert_id)) || [];
                contentEl.innerHTML = `
                    <div class="drawer-section">
                        <h4>Vaka Uyarıları (${alerts.length})</h4>
                        ${alerts.map(a => `
                            <div style="padding:var(--space-3);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
                                <div class="flex justify-between">
                                    <strong>${Security.escapeHtml(a.name)}</strong>
                                    <span class="badge ${Security.escapeAttr(a.severity)}">${Security.escapeHtml(a.severity)}</span>
                                </div>
                                <div class="muted" style="margin-top:var(--space-2)">${Security.escapeHtml(a.hypothesis)}</div>
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
                                    <div>${Security.escapeHtml(n.message)}</div>
                                </div>
                            `).join('') : '<div class="muted">Henüz aktivite yok</div>'}
                        </div>
                        ${Auth.hasRole('analyst') ? `
                        <div class="war-room-input">
                            <textarea id="war-room-note" placeholder="İnceleme notu ekle..."></textarea>
                            <button class="btn btn-primary" onclick="App.addWarRoomNote('${Security.escapeJs(id)}')">Ekle</button>
                        </div>
                        ` : '<div class="muted">Not eklemek için analist yetkisi gerekli</div>'}
                    </div>
                `;
            }
        } else if (type === 'alert') {
            const a = this.state.data.alerts?.find(x => x.alert_id === id);
            if (!a) return;

            titleEl.innerHTML = `<div>${Security.escapeHtml(a.alert_id)}</div>`;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="drawer-section">
                    <h4>Uyarı</h4>
                    <div style="font-size:var(--text-lg);font-weight:600">${Security.escapeHtml(a.name)}</div>
                    <div class="flex gap-2" style="margin-top:var(--space-2)">
                        <span class="badge ${Security.escapeAttr(a.severity)}">${Security.escapeHtml(a.severity)}</span>
                        <span class="badge">${Security.escapeHtml(a.confidence)}</span>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Hipotez</h4>
                    <p>${Security.escapeHtml(a.hypothesis)}</p>
                </div>
                <div class="drawer-section">
                    <h4>Varlık</h4>
                    <span class="chip">${Security.escapeHtml(a.entity?.user || '—')}</span>
                </div>
                <div class="drawer-section">
                    <h4>MITRE Teknikleri</h4>
                    ${a.mitre?.map(m => `
                        <div style="padding:var(--space-2);background:var(--bg-elevated);border-radius:var(--radius-md);margin-bottom:var(--space-2)">
                            <span class="badge info">${Security.escapeHtml(m.id)}</span>
                            <span style="margin-left:var(--space-2)">${Security.escapeHtml(m.name)}</span>
                        </div>
                    `).join('') || '—'}
                </div>
                <div class="drawer-section">
                    <h4>Kanıt (${a.evidence?.length || 0} olay)</h4>
                    <div class="mono muted" style="max-height:200px;overflow-y:auto;font-size:var(--text-xs)">
                        ${a.evidence?.slice(0, 20).map(e => Security.escapeHtml(e)).join('<br>') || '—'}
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Önerilen Aksiyonlar</h4>
                    <ul style="list-style:none">
                        ${a.recommended_actions?.map(ac => `<li style="padding:var(--space-2) 0;border-bottom:1px solid var(--border-subtle)">• ${Security.escapeHtml(ac)}</li>`).join('') || '—'}
                    </ul>
                    <button class="btn btn-secondary btn-sm" style="margin-top:var(--space-2)" 
                            onclick="App.copyText('${Security.escapeJs(a.recommended_actions?.join('\\n'))}')">Tümünü Kopyala</button>
                </div>
            `;
        } else if (type === 'event') {
            const e = this.state.data.events?.find(x => x.event_id === id);
            if (!e) return;

            titleEl.textContent = e.event_id;
            tabsEl.innerHTML = '';
            contentEl.innerHTML = `
                <div class="drawer-section">
                    <h4>Olay Detayları</h4>
                    <div style="display:grid;grid-template-columns:100px 1fr;gap:var(--space-2)">
                        <div class="muted">Zaman</div><div class="mono">${Security.escapeHtml(e.timestamp)}</div>
                        <div class="muted">Kaynak</div><div><span class="badge info">${Security.escapeHtml(e.source)}</span></div>
                        <div class="muted">Tür</div><div>${Security.escapeHtml(e.event_type)}</div>
                        <div class="muted">Kullanıcı</div><div class="chip">${Security.escapeHtml(e.user || '—')}</div>
                        <div class="muted">IP</div><div class="mono">${Security.escapeHtml(e.src_ip || '—')}</div>
                        <div class="muted">Cihaz</div><div class="mono">${Security.escapeHtml(e.device_id || '—')}</div>
                        <div class="muted">Domain</div><div class="mono">${Security.escapeHtml(e.domain || '—')}</div>
                    </div>
                </div>
                <div class="drawer-section">
                    <h4>Özet</h4>
                    <p>${Security.escapeHtml(e.summary)}</p>
                </div>
                <div class="drawer-section">
                    <h4>Etiketler</h4>
                    ${e.tags?.map(t => `<span class="chip">${Security.escapeHtml(t)}</span>`).join(' ') || '—'}
                </div>
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
            { icon: '📊', label: 'Genel Bakış', hint: 'Ana sayfaya git', action: () => this.switchView('overview') },
            { icon: '📋', label: 'Vakalar', hint: 'Tüm vakaları görüntüle', action: () => this.switchView('cases') },
            { icon: '⚠️', label: 'Uyarılar', hint: 'Tüm uyarıları görüntüle', action: () => this.switchView('alerts') },
            { icon: '🔍', label: 'Olay Arama', hint: 'Olay ara', action: () => this.switchView('search') },
            { icon: '👥', label: 'Varlıklar', hint: 'Varlıkları görüntüle', action: () => this.switchView('entities') },
            { icon: '💻', label: 'EDR', hint: 'Uç nokta algılama', action: () => this.switchView('edr') },
            { icon: '🎯', label: 'MITRE', hint: 'ATT&CK kapsamı', action: () => this.switchView('mitre') },
            { icon: '🔄', label: 'Yenile', hint: 'Veriyi yeniden yükle', action: () => this.refreshData() },
            { icon: '📥', label: 'Dışa Aktar', hint: 'Veriyi dışa aktar', action: () => this.exportData() },
            { icon: '🔒', label: 'Kilitle', hint: 'Oturumu kilitle', action: () => this.lockScreen() },
        ];

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
                    <div class="cmd-item-label">${Security.escapeHtml(c.label)}</div>
                    <div class="cmd-item-hint">${Security.escapeHtml(c.hint)}</div>
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
    // USER MANAGEMENT (Admin only)
    // ============================================

    showCreateUserForm() {
        const modal = document.getElementById('user-modal');
        const body = document.getElementById('user-modal-body');
        
        body.innerHTML = `
            <form id="create-user-form" style="display:flex;flex-direction:column;gap:var(--space-4)">
                <div class="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" id="new-username" class="input" required>
                </div>
                <div class="form-group">
                    <label>Görünen Ad</label>
                    <input type="text" id="new-displayname" class="input" required>
                </div>
                <div class="form-group">
                    <label>Parola</label>
                    <input type="password" id="new-password" class="input" required>
                </div>
                <div class="form-group">
                    <label>Rol</label>
                    <select id="new-role" class="select">
                        <option value="viewer">İzleyici</option>
                        <option value="analyst">Analist</option>
                        <option value="admin">Yönetici</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Oluştur</button>
            </form>
        `;
        
        document.getElementById('create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await Auth.createUser(
                    document.getElementById('new-username').value,
                    document.getElementById('new-password').value,
                    document.getElementById('new-role').value,
                    document.getElementById('new-displayname').value
                );
                modal.style.display = 'none';
                this.toast('Kullanıcı oluşturuldu', 'success');
                this.renderView();
            } catch (err) {
                this.toast(err.message, 'error');
            }
        });
        
        modal.style.display = 'flex';
    },

    deleteUser(username) {
        if (!confirm(`${username} kullanıcısını silmek istediğinizden emin misiniz?`)) return;
        
        try {
            Auth.deleteUser(username);
            this.toast('Kullanıcı silindi', 'success');
            this.renderView();
        } catch (err) {
            this.toast(err.message, 'error');
        }
    },

    resetAllData() {
        if (!confirm('Tüm verileri sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
        
        Auth.resetAll();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = './login.html';
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
        document.getElementById('last-loaded').textContent = `Son: ${new Date().toLocaleTimeString('tr-TR')}`;
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
                <h2>Veri Bulunamadı</h2>
                <p style="margin-top:var(--space-4)">${Security.escapeHtml(message)}</p>
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

    exportData() {
        if (!Auth.hasRole('analyst')) {
            this.toast('Dışa aktarma için analist yetkisi gerekli', 'error');
            return;
        }

        const data = {
            cases: this.state.data.cases,
            alerts: this.state.data.alerts,
            exported_at: new Date().toISOString(),
            exported_by: this.state.session.username
        };
        
        Security.createDownload(
            JSON.stringify(data, null, 2),
            `soc-export-${Date.now()}.json`,
            'application/json'
        );
        this.toast('Veri dışa aktarıldı', 'success');
    },

    exportIOCs() {
        if (!Auth.hasRole('analyst')) {
            this.toast('Dışa aktarma için analist yetkisi gerekli', 'error');
            return;
        }

        const iocs = this.state.data.iocs || [];
        const csv = 'type,indicator,tags,confidence\n' + 
            iocs.map(i => `${i.type},${i.indicator},"${i.tags?.join(';')}",${i.confidence}`).join('\n');
        
        Security.createDownload(csv, 'iocs.csv', 'text/csv');
        this.toast('IOC\'ler dışa aktarıldı', 'success');
    },

    copyText(text) {
        Security.copyToClipboard(text)
            .then(() => this.toast('Kopyalandı', 'success'))
            .catch(err => this.toast(err.message, 'error'));
    },

    pivotEntity(email) {
        if (!email) return;
        this.openDrawer('entity', email);
    },

    filterByMITRE(technique) {
        this.toast(`${technique} filtreleniyor`, 'info');
        this.switchView('alerts');
    },

    formatTime(isoString) {
        if (!isoString) return '—';
        try {
            const d = new Date(isoString);
            return d.toLocaleString('tr-TR', { 
                month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });
        } catch {
            return '—';
        }
    },

    getWarRoomNotes(caseId) {
        const key = `warroom_${caseId}`;
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
            return [];
        }
    },

    addWarRoomNote(caseId) {
        if (!Auth.hasRole('analyst')) {
            this.toast('Not eklemek için analist yetkisi gerekli', 'error');
            return;
        }

        const textarea = document.getElementById('war-room-note');
        const note = textarea.value.trim();
        if (!note) return;

        const key = `warroom_${caseId}`;
        const notes = this.getWarRoomNotes(caseId);
        notes.push({ 
            timestamp: new Date().toISOString(), 
            message: note,
            user: this.state.session.username
        });
        localStorage.setItem(key, JSON.stringify(notes));
        
        textarea.value = '';
        this.renderDrawerContent();
        this.toast('Not eklendi', 'success');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => App.init());
