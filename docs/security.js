/**
 * SOC Console - Security Helpers Module
 * 
 * Provides sanitization, safe rendering, and security utilities.
 * Designed to prevent XSS, HTML injection, and other client-side attacks.
 */

const Security = {
    /**
     * Escape HTML entities to prevent XSS
     * This is the primary defense against injection attacks
     */
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        if (typeof str !== 'string') str = String(str);
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        return str.replace(/[&<>"'`=/]/g, char => map[char]);
    },

    /**
     * Escape string for use in HTML attributes
     */
    escapeAttr(str) {
        if (str === null || str === undefined) return '';
        if (typeof str !== 'string') str = String(str);
        
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Escape string for use in JavaScript string context
     */
    escapeJs(str) {
        if (str === null || str === undefined) return '';
        if (typeof str !== 'string') str = String(str);
        
        return str
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/\f/g, '\\f')
            .replace(/</g, '\\x3c')
            .replace(/>/g, '\\x3e')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
    },

    /**
     * Sanitize URL - only allow safe protocols
     */
    sanitizeUrl(url) {
        if (!url) return '';
        
        const trimmed = url.trim().toLowerCase();
        
        // Only allow safe protocols
        const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
        
        try {
            const parsed = new URL(url, window.location.origin);
            if (!allowedProtocols.includes(parsed.protocol)) {
                return '#blocked';
            }
            return url;
        } catch {
            // Relative URLs are okay
            if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
                return url;
            }
            return '#invalid';
        }
    },

    /**
     * Create text node (safest way to add user content)
     */
    createTextNode(text) {
        return document.createTextNode(text || '');
    },

    /**
     * Safely set text content of an element
     */
    setText(element, text) {
        if (element && element.textContent !== undefined) {
            element.textContent = text || '';
        }
    },

    /**
     * Safely create an element with text content
     */
    createElement(tag, text, attributes = {}) {
        const allowedTags = ['div', 'span', 'p', 'a', 'button', 'input', 'label', 
                           'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
                           'table', 'thead', 'tbody', 'tr', 'th', 'td',
                           'form', 'select', 'option', 'textarea', 'code', 'pre',
                           'strong', 'em', 'small', 'br', 'hr', 'img', 'svg', 'path'];
        
        if (!allowedTags.includes(tag.toLowerCase())) {
            console.warn(`Blocked element creation: ${tag}`);
            return document.createElement('span');
        }
        
        const element = document.createElement(tag);
        
        if (text) {
            element.textContent = text;
        }
        
        // Safely set attributes
        for (const [key, value] of Object.entries(attributes)) {
            this.setAttr(element, key, value);
        }
        
        return element;
    },

    /**
     * Safely set attribute on element
     */
    setAttr(element, name, value) {
        // Block dangerous attributes
        const blockedAttrs = ['onclick', 'onerror', 'onload', 'onmouseover', 
                            'onfocus', 'onblur', 'onsubmit', 'onchange',
                            'onkeydown', 'onkeyup', 'onkeypress', 'onmousedown',
                            'onmouseup', 'onmousemove', 'onmouseout', 'onmouseenter',
                            'onmouseleave', 'ondblclick', 'oncontextmenu', 'ondrag',
                            'ondragend', 'ondragenter', 'ondragleave', 'ondragover',
                            'ondragstart', 'ondrop', 'oninput', 'oninvalid',
                            'onreset', 'onscroll', 'onsearch', 'onselect',
                            'ontouchcancel', 'ontouchend', 'ontouchmove', 'ontouchstart',
                            'onwheel', 'formaction', 'xlink:href'];
        
        const lowerName = name.toLowerCase();
        
        if (blockedAttrs.includes(lowerName)) {
            console.warn(`Blocked attribute: ${name}`);
            return;
        }
        
        // Special handling for href
        if (lowerName === 'href' || lowerName === 'src') {
            value = this.sanitizeUrl(value);
        }
        
        // Special handling for style (limited)
        if (lowerName === 'style') {
            // Only allow safe CSS properties
            value = this.sanitizeCss(value);
        }
        
        element.setAttribute(name, this.escapeAttr(value));
    },

    /**
     * Sanitize inline CSS (very restrictive)
     */
    sanitizeCss(css) {
        if (!css) return '';
        
        // Remove any url() calls, expressions, and behavior
        const dangerous = /url\s*\(|expression\s*\(|behavior\s*:|javascript:|vbscript:|data:/gi;
        css = css.replace(dangerous, '');
        
        // Only allow safe properties
        const safeProps = ['color', 'background-color', 'font-size', 'font-weight',
                          'text-align', 'padding', 'margin', 'border', 'display',
                          'width', 'height', 'max-width', 'max-height', 'opacity',
                          'visibility', 'overflow', 'position', 'top', 'left', 
                          'right', 'bottom', 'z-index', 'flex', 'grid'];
        
        const parts = css.split(';').filter(Boolean);
        const safeParts = parts.filter(part => {
            const prop = part.split(':')[0]?.trim().toLowerCase();
            return safeProps.some(safe => prop.startsWith(safe));
        });
        
        return safeParts.join(';');
    },

    /**
     * Render minimal markdown safely (headings, lists, code blocks only)
     */
    renderMarkdown(md) {
        if (!md) return '';
        
        // First escape all HTML
        let html = this.escapeHtml(md);
        
        // Then apply safe transformations
        
        // Headers (## and ###)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Code blocks (```)
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Lists
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        
        // Numbered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        
        // Paragraphs (double newlines)
        html = html.replace(/\n\n/g, '</p><p>');
        
        // Single newlines to <br> within paragraphs
        html = html.replace(/\n/g, '<br>');
        
        // Wrap in paragraph
        html = '<p>' + html + '</p>';
        
        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');
        
        return html;
    },

    /**
     * Rate limiter for actions (prevent abuse)
     */
    rateLimiter: {
        actions: {},
        
        /**
         * Check if action is allowed
         * @param {string} action - Action identifier
         * @param {number} maxPerMinute - Maximum allowed per minute
         * @returns {boolean} - Whether action is allowed
         */
        check(action, maxPerMinute = 10) {
            const now = Date.now();
            const windowMs = 60 * 1000; // 1 minute
            
            if (!this.actions[action]) {
                this.actions[action] = [];
            }
            
            // Remove old entries
            this.actions[action] = this.actions[action].filter(
                time => now - time < windowMs
            );
            
            if (this.actions[action].length >= maxPerMinute) {
                return false;
            }
            
            this.actions[action].push(now);
            return true;
        },
        
        /**
         * Get remaining allowed actions
         */
        remaining(action, maxPerMinute = 10) {
            this.check(action, maxPerMinute); // Clean up old entries
            return Math.max(0, maxPerMinute - (this.actions[action]?.length || 0));
        }
    },

    /**
     * Safe clipboard copy with rate limiting
     */
    async copyToClipboard(text) {
        if (!this.rateLimiter.check('clipboard', 30)) {
            throw new Error('Çok fazla kopyalama denemesi. Lütfen bekleyin.');
        }
        
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                return true;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    },

    /**
     * Validate and sanitize JSON input
     */
    parseJsonSafe(str) {
        try {
            const parsed = JSON.parse(str);
            // Prevent prototype pollution
            if (parsed && typeof parsed === 'object') {
                if ('__proto__' in parsed || 'constructor' in parsed || 'prototype' in parsed) {
                    throw new Error('Invalid JSON: potential prototype pollution');
                }
            }
            return parsed;
        } catch (e) {
            return null;
        }
    },

    /**
     * Generate a nonce for inline scripts (if needed)
     */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array));
    },

    /**
     * Check for Caps Lock
     */
    isCapsLockOn(event) {
        if (event.getModifierState) {
            return event.getModifierState('CapsLock');
        }
        return false;
    },

    /**
     * Sanitize filename for downloads
     */
    sanitizeFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_{2,}/g, '_')
            .substring(0, 200);
    },

    /**
     * Create safe download (prevent path traversal)
     */
    createDownload(content, filename, type = 'application/json') {
        const safeName = this.sanitizeFilename(filename);
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        a.click();
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
};

// Freeze the object to prevent modifications
Object.freeze(Security);
Object.freeze(Security.rateLimiter);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Security;
}
