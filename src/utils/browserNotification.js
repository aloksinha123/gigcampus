/**
 * Utility for Native Browser Push Notifications in GigCampus
 */

const THROTTLE_MS = 3000;
const notificationHistory = new Map();

/**
 * Request Browser Notification Permission on User Login
 */
export const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('Browser does not support desktop notifications.');
        return 'unsupported';
    }

    if (Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            localStorage.setItem('browserNotificationPermission', permission);
            return permission;
        } catch (err) {
            console.error('Error requesting notification permission:', err);
            return 'default';
        }
    }

    return Notification.permission;
};

/**
 * Trigger a Native Desktop Browser Notification
 * 
 * @param {Object} options
 * @param {string} options.title Notification Title (default: "GigCampus")
 * @param {string} options.body Main text message
 * @param {string} [options.url] Target URL path to navigate on click (e.g., "/messages", "/projects/123")
 * @param {string} [options.tag] Unique identifier for throttling duplicates
 * @param {string} [options.icon] Custom icon URL
 */
export const triggerBrowserNotification = ({
    title = 'GigCampus',
    body = '',
    url = '/',
    tag = 'gigcampus-notification',
    icon = '/favicon.ico'
}) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (Notification.permission !== 'granted') {
        return;
    }

    // Duplicate Throttling check
    const now = Date.now();
    const lastTriggered = notificationHistory.get(tag) || 0;
    if (now - lastTriggered < THROTTLE_MS) {
        return;
    }
    notificationHistory.set(tag, now);

    // Skip if user is actively focused on the target page
    if (!document.hidden && window.location.pathname === url) {
        return;
    }

    try {
        const notification = new Notification(title, {
            body,
            icon,
            tag,
            timestamp: now,
            silent: false
        });

        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            if (url) {
                window.location.href = url;
            }
            notification.close();
        };
    } catch (err) {
        console.error('Failed to trigger native browser notification:', err);
    }
};
