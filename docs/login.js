/**
 * SOC Console - Login Page Controller
 * Handles authentication UI, form validation, and session management
 * External file to comply with CSP (script-src 'self')
 */

(function() {
    'use strict';

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // Check if Auth is available
        if (typeof Auth === 'undefined') {
            showError('setup-error', 'Sistem hatası: Auth modülü yüklenemedi');
            showError('login-error', 'Sistem hatası: Auth modülü yüklenemedi');
            return;
        }

        // Check if already logged in
        if (Auth.getSession()) {
            redirect('./index.html');
            return;
        }

        // Show appropriate form
        if (Auth.isFirstRun()) {
            showForm('setup');
        } else {
            showForm('login');
        }

        // Bind event handlers
        bindSetupForm();
        bindLoginForm();
        bindPasswordToggles();
        bindCapsLockDetection();
    }

    // ==========================================
    // FORM VISIBILITY
    // ==========================================
    function showForm(type) {
        const setupForm = document.getElementById('setup-form');
        const loginForm = document.getElementById('login-form');

        if (setupForm) {
            setupForm.classList.toggle('hidden', type !== 'setup');
        }
        if (loginForm) {
            loginForm.classList.toggle('hidden', type !== 'login');
        }
    }

    // ==========================================
    // SETUP FORM
    // ==========================================
    function bindSetupForm() {
        const form = document.getElementById('setup-form');
        if (!form) return;

        const passwordInput = document.getElementById('setup-password');
        const confirmInput = document.getElementById('setup-confirm');

        // Password strength checker
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                updatePasswordStrength(this.value);
            });
        }

        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = passwordInput?.value || '';
            const confirm = confirmInput?.value || '';
            const btn = form.querySelector('.login-btn');
            
            // Clear previous errors
            hideError('setup-error');
            
            // Validation
            if (password.length < 8) {
                showError('setup-error', 'Parola en az 8 karakter olmalıdır');
                return;
            }
            
            if (password !== confirm) {
                showError('setup-error', 'Parolalar eşleşmiyor');
                return;
            }
            
            // Loading state
            setLoading(btn, true);
            
            try {
                await Auth.bootstrap(password);
                const session = await Auth.authenticate('admin', password);
                if (session) {
                    redirect('./index.html');
                }
            } catch (err) {
                showError('setup-error', err.message || 'Kurulum hatası');
                setLoading(btn, false);
            }
        });
    }

    // ==========================================
    // LOGIN FORM
    // ==========================================
    function bindLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        // Check for lockout on load
        if (usernameInput?.value) {
            checkLockout(usernameInput.value);
        }
        
        // Check lockout when username changes
        usernameInput?.addEventListener('change', function() {
            checkLockout(this.value);
        });

        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = usernameInput?.value?.trim() || '';
            const password = passwordInput?.value || '';
            const btn = document.getElementById('login-btn');
            
            // Clear previous errors
            hideError('login-error');
            
            // Basic validation
            if (!username) {
                showError('login-error', 'Kullanıcı adı gerekli');
                return;
            }
            
            if (!password) {
                showError('login-error', 'Parola gerekli');
                return;
            }
            
            // Check lockout
            const lockStatus = Auth.isLocked(username);
            if (lockStatus.locked) {
                const mins = Math.ceil(lockStatus.remainingMs / 60000);
                showError('login-error', `Hesap kilitli. ${mins} dakika bekleyin.`);
                return;
            }
            
            // Loading state
            setLoading(btn, true);
            
            try {
                const session = await Auth.authenticate(username, password);
                if (session) {
                    // Get redirect URL if present
                    const params = new URLSearchParams(window.location.search);
                    const next = params.get('next') || './index.html';
                    redirect(next);
                }
            } catch (err) {
                showError('login-error', err.message || 'Giriş hatası');
                setLoading(btn, false);
                
                // Update lockout display
                checkLockout(username);
            }
        });
    }

    // ==========================================
    // LOCKOUT CHECK
    // ==========================================
    function checkLockout(username) {
        if (!username || typeof Auth === 'undefined') return;
        
        const lockStatus = Auth.isLocked(username);
        const warningEl = document.getElementById('lockout-warning');
        
        if (!warningEl) return;
        
        if (lockStatus.locked) {
            const mins = Math.ceil(lockStatus.remainingMs / 60000);
            warningEl.textContent = `Hesap ${mins} dakika kilitli (${lockStatus.attempts} başarısız deneme)`;
            warningEl.classList.remove('hidden');
            
            // Start countdown
            startLockoutTimer(username, lockStatus.remainingMs);
        } else if (lockStatus.attempts > 0) {
            warningEl.textContent = `Uyarı: ${lockStatus.attempts} başarısız deneme`;
            warningEl.classList.remove('hidden');
        } else {
            warningEl.classList.add('hidden');
        }
    }

    let lockoutTimer = null;
    function startLockoutTimer(username, remainingMs) {
        if (lockoutTimer) clearInterval(lockoutTimer);
        
        const warningEl = document.getElementById('lockout-warning');
        if (!warningEl) return;
        
        const endTime = Date.now() + remainingMs;
        
        lockoutTimer = setInterval(function() {
            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                clearInterval(lockoutTimer);
                lockoutTimer = null;
                warningEl.classList.add('hidden');
                return;
            }
            
            const mins = Math.ceil(remaining / 60000);
            const secs = Math.ceil((remaining % 60000) / 1000);
            warningEl.textContent = `Hesap kilitli: ${mins}:${String(secs).padStart(2, '0')} kaldı`;
        }, 1000);
    }

    // ==========================================
    // PASSWORD STRENGTH
    // ==========================================
    function updatePasswordStrength(password) {
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');
        
        if (!strengthBar || !strengthText) return;
        
        if (typeof Auth === 'undefined' || !Auth.checkPasswordStrength) {
            return;
        }
        
        const result = Auth.checkPasswordStrength(password);
        
        // Colors for each level (0-5)
        const colors = ['#f85149', '#f85149', '#f0883e', '#d29922', '#3fb950', '#3fb950'];
        const widths = [0, 20, 40, 60, 80, 100];
        
        strengthBar.style.width = widths[result.score] + '%';
        strengthBar.style.backgroundColor = colors[result.score];
        strengthText.textContent = result.label;
        strengthText.style.color = colors[result.score];
    }

    // ==========================================
    // PASSWORD TOGGLE
    // ==========================================
    function bindPasswordToggles() {
        document.querySelectorAll('.login-toggle-password').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const inputId = this.getAttribute('data-target');
                const input = document.getElementById(inputId);
                
                if (!input) return;
                
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                
                // Update icon
                const icon = this.querySelector('svg');
                if (icon) {
                    icon.innerHTML = isPassword 
                        ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
                }
            });
        });
    }

    // ==========================================
    // CAPS LOCK DETECTION
    // ==========================================
    function bindCapsLockDetection() {
        const capsWarning = document.getElementById('caps-warning');
        if (!capsWarning) return;

        document.addEventListener('keydown', function(e) {
            if (e.getModifierState && e.getModifierState('CapsLock')) {
                capsWarning.classList.add('visible');
            } else {
                capsWarning.classList.remove('visible');
            }
        });
        
        document.addEventListener('keyup', function(e) {
            if (e.key === 'CapsLock') {
                capsWarning.classList.toggle('visible', e.getModifierState('CapsLock'));
            }
        });
    }

    // ==========================================
    // HELPERS
    // ==========================================
    function showError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.classList.remove('hidden');
        }
    }

    function hideError(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.classList.add('hidden');
        }
    }

    function setLoading(btn, loading) {
        if (!btn) return;
        
        if (loading) {
            btn.disabled = true;
            btn.classList.add('loading');
            btn.setAttribute('data-text', btn.textContent);
            btn.textContent = '';
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
            btn.textContent = btn.getAttribute('data-text') || 'Giriş Yap';
        }
    }

    function redirect(url) {
        // Small delay for better UX
        setTimeout(function() {
            window.location.href = url;
        }, 100);
    }

})();
