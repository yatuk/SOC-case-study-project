/**
 * SOC Console - Secure Authentication Module
 * 
 * IMPORTANT: This is a SIMULATION/EDUCATIONAL project.
 * GitHub Pages is static - there is NO server-side security.
 * This module demonstrates security best practices for learning purposes.
 * 
 * Features:
 * - WebCrypto PBKDF2 password hashing (310,000 iterations)
 * - Per-installation salt (device-bound)
 * - Session management with expiry
 * - Brute-force protection with exponential backoff
 * - Role-based access control (RBAC)
 */

const Auth = {
    // Configuration
    config: {
        PBKDF2_ITERATIONS: 310000,  // 2025 recommended minimum
        SALT_LENGTH: 32,            // 256 bits
        KEY_LENGTH: 256,            // bits
        SESSION_TIMEOUT: 30 * 60 * 1000,      // 30 minutes inactivity
        SESSION_MAX_AGE: 8 * 60 * 60 * 1000,  // 8 hours absolute
        MAX_ATTEMPTS: 5,
        LOCKOUT_TIMES: {
            5: 5 * 60 * 1000,    // 5 attempts = 5 min lockout
            10: 30 * 60 * 1000   // 10 attempts = 30 min lockout
        }
    },

    // Storage keys
    keys: {
        INSTALL_ID: 'soc_install_id',
        MASTER_HASH: 'soc_master_hash',
        MASTER_SALT: 'soc_master_salt',
        USERS: 'soc_users',
        ATTEMPTS: 'soc_login_attempts',
        SESSION: 'soc_session',
        LAST_ACTIVITY: 'soc_last_activity'
    },

    /**
     * Check if this is first-time setup
     */
    isFirstRun() {
        return !localStorage.getItem(this.keys.MASTER_HASH);
    },

    /**
     * Generate cryptographically secure random bytes
     */
    generateRandomBytes(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    },

    /**
     * Convert ArrayBuffer to hex string
     */
    bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    /**
     * Convert hex string to ArrayBuffer
     */
    hexToBuffer(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes.buffer;
    },

    /**
     * Hash password using PBKDF2 with WebCrypto
     */
    async hashPassword(password, salt) {
        const encoder = new TextEncoder();
        
        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits']
        );

        // Derive key using PBKDF2
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.config.PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            this.config.KEY_LENGTH
        );

        return this.bufferToHex(derivedBits);
    },

    /**
     * Bootstrap first admin account
     */
    async bootstrap(password) {
        // Validate password strength
        const strength = this.checkPasswordStrength(password);
        if (strength.score < 3) {
            throw new Error('Parola çok zayıf. Lütfen daha güçlü bir parola seçin.');
        }

        // Generate installation ID (device binding)
        const installId = this.bufferToHex(this.generateRandomBytes(16));
        localStorage.setItem(this.keys.INSTALL_ID, installId);

        // Generate salt
        const salt = this.generateRandomBytes(this.config.SALT_LENGTH);
        const saltHex = this.bufferToHex(salt);
        localStorage.setItem(this.keys.MASTER_SALT, saltHex);

        // Hash password
        const hash = await this.hashPassword(password, salt);
        localStorage.setItem(this.keys.MASTER_HASH, hash);

        // Create admin user
        const users = {
            'admin': {
                username: 'admin',
                role: 'admin',
                displayName: 'Sistem Yöneticisi',
                createdAt: new Date().toISOString()
            }
        };
        localStorage.setItem(this.keys.USERS, JSON.stringify(users));

        // Clear any previous attempts
        localStorage.removeItem(this.keys.ATTEMPTS);

        return true;
    },

    /**
     * Check password strength (no external libs)
     */
    checkPasswordStrength(password) {
        let score = 0;
        const checks = [];

        // Length check
        if (password.length >= 8) { score++; checks.push('8+ karakter'); }
        if (password.length >= 12) { score++; checks.push('12+ karakter'); }
        if (password.length >= 16) { score++; checks.push('16+ karakter'); }

        // Character diversity
        if (/[a-z]/.test(password)) { score++; checks.push('Küçük harf'); }
        if (/[A-Z]/.test(password)) { score++; checks.push('Büyük harf'); }
        if (/[0-9]/.test(password)) { score++; checks.push('Rakam'); }
        if (/[^a-zA-Z0-9]/.test(password)) { score++; checks.push('Özel karakter'); }

        // Blacklist check (common passwords)
        const blacklist = ['password', 'parola', '123456', 'qwerty', 'admin', 'letmein', 
                          'welcome', 'monkey', 'dragon', 'master', 'abc123', 'sifre'];
        const lowerPass = password.toLowerCase();
        if (blacklist.some(b => lowerPass.includes(b))) {
            score = Math.max(0, score - 3);
            checks.push('UYARI: Yaygın parola kalıbı');
        }

        // Sequential/repeated characters
        if (/(.)\1{2,}/.test(password)) {
            score = Math.max(0, score - 1);
            checks.push('UYARI: Tekrarlayan karakterler');
        }

        const labels = ['Çok Zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü', 'Çok Güçlü'];
        
        return {
            score: Math.min(score, 5),
            label: labels[Math.min(score, 5)],
            checks
        };
    },

    /**
     * Get login attempts for rate limiting
     */
    getAttempts(username) {
        const attempts = JSON.parse(localStorage.getItem(this.keys.ATTEMPTS) || '{}');
        return attempts[username] || { count: 0, lastAttempt: 0, lockedUntil: 0 };
    },

    /**
     * Record login attempt
     */
    recordAttempt(username, success) {
        const attempts = JSON.parse(localStorage.getItem(this.keys.ATTEMPTS) || '{}');
        
        if (success) {
            delete attempts[username];
        } else {
            const current = attempts[username] || { count: 0, lastAttempt: 0, lockedUntil: 0 };
            current.count++;
            current.lastAttempt = Date.now();
            
            // Calculate lockout
            if (current.count >= 10) {
                current.lockedUntil = Date.now() + this.config.LOCKOUT_TIMES[10];
            } else if (current.count >= 5) {
                current.lockedUntil = Date.now() + this.config.LOCKOUT_TIMES[5];
            }
            
            attempts[username] = current;
        }
        
        localStorage.setItem(this.keys.ATTEMPTS, JSON.stringify(attempts));
    },

    /**
     * Check if account is locked
     */
    isLocked(username) {
        const attempts = this.getAttempts(username);
        if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
            return {
                locked: true,
                remainingMs: attempts.lockedUntil - Date.now(),
                attempts: attempts.count
            };
        }
        return { locked: false, attempts: attempts.count };
    },

    /**
     * Authenticate user
     */
    async authenticate(username, password) {
        // Check lockout
        const lockStatus = this.isLocked(username);
        if (lockStatus.locked) {
            throw new Error(`Hesap kilitli. ${Math.ceil(lockStatus.remainingMs / 60000)} dakika bekleyin.`);
        }

        // Get stored credentials
        const masterHash = localStorage.getItem(this.keys.MASTER_HASH);
        const saltHex = localStorage.getItem(this.keys.MASTER_SALT);
        const users = JSON.parse(localStorage.getItem(this.keys.USERS) || '{}');

        if (!masterHash || !saltHex) {
            throw new Error('Sistem yapılandırılmamış');
        }

        // Check if user exists
        if (!users[username]) {
            this.recordAttempt(username, false);
            throw new Error('Geçersiz kimlik bilgileri'); // Don't reveal if user exists
        }

        // Hash provided password
        const salt = new Uint8Array(this.hexToBuffer(saltHex));
        const hash = await this.hashPassword(password, salt);

        // Compare (admin uses master password, others use their own)
        if (username === 'admin') {
            if (hash !== masterHash) {
                this.recordAttempt(username, false);
                throw new Error('Geçersiz kimlik bilgileri');
            }
        } else {
            // For non-admin users, check their stored hash
            if (!users[username].passwordHash || hash !== users[username].passwordHash) {
                this.recordAttempt(username, false);
                throw new Error('Geçersiz kimlik bilgileri');
            }
        }

        // Success - create session
        this.recordAttempt(username, true);
        return this.createSession(username, users[username]);
    },

    /**
     * Create session
     */
    createSession(username, user) {
        const sessionToken = this.bufferToHex(this.generateRandomBytes(32));
        const now = Date.now();
        
        const session = {
            token: sessionToken,
            username: username,
            role: user.role,
            displayName: user.displayName,
            createdAt: now,
            expiresAt: now + this.config.SESSION_MAX_AGE
        };

        sessionStorage.setItem(this.keys.SESSION, JSON.stringify(session));
        sessionStorage.setItem(this.keys.LAST_ACTIVITY, now.toString());

        return session;
    },

    /**
     * Validate current session
     */
    validateSession() {
        const sessionData = sessionStorage.getItem(this.keys.SESSION);
        const lastActivity = parseInt(sessionStorage.getItem(this.keys.LAST_ACTIVITY) || '0');

        if (!sessionData) {
            return null;
        }

        const session = JSON.parse(sessionData);
        const now = Date.now();

        // Check absolute expiry
        if (now > session.expiresAt) {
            this.logout();
            return null;
        }

        // Check inactivity timeout
        if (now - lastActivity > this.config.SESSION_TIMEOUT) {
            this.logout();
            return null;
        }

        // Update last activity
        sessionStorage.setItem(this.keys.LAST_ACTIVITY, now.toString());

        return session;
    },

    /**
     * Get current session
     */
    getSession() {
        return this.validateSession();
    },

    /**
     * Logout
     */
    logout() {
        sessionStorage.removeItem(this.keys.SESSION);
        sessionStorage.removeItem(this.keys.LAST_ACTIVITY);
    },

    /**
     * Check if user has required role
     */
    hasRole(requiredRole) {
        const session = this.getSession();
        if (!session) return false;

        const roleHierarchy = { 'admin': 3, 'analyst': 2, 'viewer': 1 };
        return roleHierarchy[session.role] >= roleHierarchy[requiredRole];
    },

    /**
     * Get all users (admin only)
     */
    getUsers() {
        if (!this.hasRole('admin')) return null;
        return JSON.parse(localStorage.getItem(this.keys.USERS) || '{}');
    },

    /**
     * Create user (admin only)
     */
    async createUser(username, password, role, displayName) {
        if (!this.hasRole('admin')) {
            throw new Error('Yetkisiz işlem');
        }

        const users = JSON.parse(localStorage.getItem(this.keys.USERS) || '{}');
        
        if (users[username]) {
            throw new Error('Kullanıcı zaten mevcut');
        }

        // Hash password with same salt
        const saltHex = localStorage.getItem(this.keys.MASTER_SALT);
        const salt = new Uint8Array(this.hexToBuffer(saltHex));
        const hash = await this.hashPassword(password, salt);

        users[username] = {
            username,
            role,
            displayName,
            passwordHash: hash,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem(this.keys.USERS, JSON.stringify(users));
        return true;
    },

    /**
     * Delete user (admin only)
     */
    deleteUser(username) {
        if (!this.hasRole('admin')) {
            throw new Error('Yetkisiz işlem');
        }

        if (username === 'admin') {
            throw new Error('Admin hesabı silinemez');
        }

        const users = JSON.parse(localStorage.getItem(this.keys.USERS) || '{}');
        delete users[username];
        localStorage.setItem(this.keys.USERS, JSON.stringify(users));
        return true;
    },

    /**
     * Change password
     */
    async changePassword(oldPassword, newPassword) {
        const session = this.getSession();
        if (!session) {
            throw new Error('Oturum açılmamış');
        }

        // Verify old password first
        const saltHex = localStorage.getItem(this.keys.MASTER_SALT);
        const salt = new Uint8Array(this.hexToBuffer(saltHex));
        const oldHash = await this.hashPassword(oldPassword, salt);

        if (session.username === 'admin') {
            const masterHash = localStorage.getItem(this.keys.MASTER_HASH);
            if (oldHash !== masterHash) {
                throw new Error('Mevcut parola yanlış');
            }
            // Update master password
            const newHash = await this.hashPassword(newPassword, salt);
            localStorage.setItem(this.keys.MASTER_HASH, newHash);
        } else {
            const users = JSON.parse(localStorage.getItem(this.keys.USERS) || '{}');
            if (oldHash !== users[session.username].passwordHash) {
                throw new Error('Mevcut parola yanlış');
            }
            // Update user password
            const newHash = await this.hashPassword(newPassword, salt);
            users[session.username].passwordHash = newHash;
            localStorage.setItem(this.keys.USERS, JSON.stringify(users));
        }

        return true;
    },

    /**
     * Reset all data (for demo purposes)
     */
    resetAll() {
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        return true;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
