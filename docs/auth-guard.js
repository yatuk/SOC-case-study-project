/**
 * Auth Guard - Redirect to login if not authenticated
 * This script should be loaded early to prevent unauthorized access
 */

(function() {
    // Check if Auth module is loaded
    if (typeof Auth === 'undefined') {
        console.error('Auth module not loaded');
        return;
    }
    
    // Check session
    if (!Auth.getSession()) {
        window.location.href = './login.html?next=' + encodeURIComponent(window.location.pathname);
    }
})();
