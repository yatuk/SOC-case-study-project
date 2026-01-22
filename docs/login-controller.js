/**
 * Login Page Controller
 * Handles setup (first run) and login forms
 */

const LoginPage = {
    init() {
        this.checkSession();
        this.bindEvents();
        this.showAppropriateForm();
    },

    checkSession() {
        const session = Auth.getSession();
        if (session) {
            this.redirect();
        }
    },

    showAppropriateForm() {
        if (Auth.isFirstRun()) {
            document.getElementById('setup-form').style.display = 'block';
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('subtitle').textContent = 'İlk Kurulum';
        } else {
            document.getElementById('setup-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('subtitle').textContent = 'Güvenlik Operasyon Merkezi';
        }
    },

    bindEvents() {
        // Setup form
        document.getElementById('setup-form').addEventListener('submit', (e) => this.handleSetup(e));
        document.getElementById('setup-password').addEventListener('input', (e) => this.updateStrength(e.target.value));
        document.getElementById('setup-password').addEventListener('keyup', (e) => this.checkCapsLock(e, 'setup-caps'));

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('password').addEventListener('keyup', (e) => this.checkCapsLock(e, 'login-caps'));
        document.getElementById('username').addEventListener('input', () => this.checkLockout());

        // Password toggles
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => this.togglePassword(btn));
        });
    },

    togglePassword(btn) {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.classList.toggle('active', !isPassword);
    },

    checkCapsLock(event, warningId) {
        const warning = document.getElementById(warningId);
        warning.style.display = Security.isCapsLockOn(event) ? 'flex' : 'none';
    },

    updateStrength(password) {
        const strength = Auth.checkPasswordStrength(password);
        const fill = document.getElementById('setup-strength-fill');
        const label = document.getElementById('setup-strength-label');
        
        const widthPercent = (strength.score / 5) * 100;
        fill.style.width = widthPercent + '%';
        
        const colors = ['#dc3545', '#dc3545', '#ffc107', '#ffc107', '#28a745', '#28a745'];
        fill.style.backgroundColor = colors[strength.score];
        
        label.textContent = strength.label;
    },

    checkLockout() {
        const username = document.getElementById('username').value;
        if (!username) return;

        const lockStatus = Auth.isLocked(username);
        const lockoutDiv = document.getElementById('login-lockout');
        
        if (lockStatus.locked) {
            lockoutDiv.style.display = 'flex';
            this.startLockoutTimer(lockStatus.remainingMs);
        } else {
            lockoutDiv.style.display = 'none';
        }
    },

    startLockoutTimer(remainingMs) {
        const timerSpan = document.getElementById('lockout-timer');
        const btn = document.getElementById('login-btn');
        
        const update = () => {
            const remaining = Math.max(0, remainingMs - (Date.now() - this._lockoutStart));
            if (remaining <= 0) {
                document.getElementById('login-lockout').style.display = 'none';
                btn.disabled = false;
                return;
            }
            
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            timerSpan.textContent = `Kilitli: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            btn.disabled = true;
            requestAnimationFrame(update);
        };
        
        this._lockoutStart = Date.now();
        update();
    },

    async handleSetup(e) {
        e.preventDefault();
        this.clearError();
        
        const password = document.getElementById('setup-password').value;
        const confirm = document.getElementById('setup-confirm').value;
        
        if (password !== confirm) {
            this.showError('Parolalar eşleşmiyor');
            return;
        }
        
        try {
            await Auth.bootstrap(password);
            this.redirect();
        } catch (err) {
            this.showError(Security.escapeHtml(err.message));
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        this.clearError();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const btn = document.getElementById('login-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Doğrulanıyor...';
        
        try {
            await Auth.authenticate(username, password);
            this.redirect();
        } catch (err) {
            this.showError(Security.escapeHtml(err.message));
            this.checkLockout();
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Giriş Yap</span>';
        }
    },

    showError(message) {
        const errorDiv = document.getElementById('global-error');
        const msgSpan = document.getElementById('error-message');
        msgSpan.textContent = message;
        errorDiv.style.display = 'flex';
    },

    clearError() {
        document.getElementById('global-error').style.display = 'none';
    },

    redirect() {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || './index.html';
        // Validate redirect URL
        if (next.startsWith('./') || next.startsWith('/') || next === 'index.html') {
            window.location.href = next;
        } else {
            window.location.href = './index.html';
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => LoginPage.init());
