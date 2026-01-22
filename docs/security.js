/**
 * SOC Console - Security Utilities
 * HTML escaping, safe DOM manipulation, sanitization
 */

const Security = {
    /**
     * Escape HTML entities to prevent XSS
     */
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    },

    /**
     * Escape string for use in HTML attribute
     */
    escapeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Create text node (safest way to add user content)
     */
    createTextNode(text) {
        return document.createTextNode(text || '');
    },

    /**
     * Safely set text content of element
     */
    setText(element, text) {
        if (element) {
            element.textContent = text || '';
        }
        return element;
    },

    /**
     * Safely create an element with text
     */
    createElement(tag, text = '', attributes = {}) {
        const allowedTags = [
            'div', 'span', 'p', 'a', 'button', 'input', 'label', 'select', 'option',
            'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li', 'pre', 'code', 'strong', 'em', 'svg', 'path', 'line', 'circle',
            'rect', 'polyline', 'polygon', 'nav', 'header', 'footer', 'aside', 'main', 'section',
            'article', 'form', 'textarea', 'img'
        ];
        
        if (!allowedTags.includes(tag.toLowerCase())) {
            console.warn(`Blocked element creation: ${tag}`);
            return document.createElement('div');
        }
        
        const el = document.createElement(tag);
        if (text) {
            el.textContent = text;
        }
        
        for (const [key, value] of Object.entries(attributes)) {
            this.setAttr(el, key, value);
        }
        
        return el;
    },

    /**
     * Safely set attribute on element
     */
    setAttr(element, name, value) {
        const blocked = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'];
        const nameLower = name.toLowerCase();
        
        if (blocked.includes(nameLower)) {
            console.warn(`Blocked attribute: ${name}`);
            return element;
        }
        
        if (nameLower === 'href' || nameLower === 'src') {
            value = this.sanitizeUrl(value);
        }
        
        if (nameLower === 'style') {
            value = this.sanitizeCss(value);
        }
        
        element.setAttribute(name, value);
        return element;
    },

    /**
     * Sanitize URL to prevent javascript: protocol
     */
    sanitizeUrl(url) {
        if (!url) return '';
        const trimmed = url.trim().toLowerCase();
        if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
            return '';
        }
        return url;
    },

    /**
     * Basic CSS sanitization
     */
    sanitizeCss(css) {
        if (!css) return '';
        // Remove potential script injections
        return css
            .replace(/expression\s*\(/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/url\s*\(/gi, 'url(')
            .replace(/@import/gi, '');
    },

    /**
     * Minimal safe Markdown renderer
     */
    renderMarkdown(md) {
        if (!md) return '';
        
        let html = this.escapeHtml(md);
        
        // Headings
        html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
        
        // Bold and italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Code blocks
        html = html.replace(/```[\s\S]*?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Lists
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        
        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        html = html.replace(/<p>(<h[234]>)/g, '$1');
        html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)<\/p>/g, '$1');
        
        return html;
    },

    /**
     * Safe JSON parse with prototype pollution prevention
     */
    parseJsonSafe(str) {
        try {
            const obj = JSON.parse(str);
            if (obj && typeof obj === 'object') {
                delete obj.__proto__;
                delete obj.constructor;
                delete obj.prototype;
            }
            return obj;
        } catch (e) {
            console.error('JSON parse error:', e);
            return null;
        }
    },

    /**
     * Copy to clipboard with rate limiting
     */
    _lastCopy: 0,
    async copyToClipboard(text) {
        const now = Date.now();
        if (now - this._lastCopy < 500) {
            return false;
        }
        this._lastCopy = now;
        
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            console.error('Copy failed:', e);
            return false;
        }
    },

    /**
     * Create safe download
     */
    createDownload(content, filename, type = 'application/json') {
        const safeName = filename.replace(/[^a-z0-9_\-\.]/gi, '_').substring(0, 100);
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Freeze to prevent modification
Object.freeze(Security);
