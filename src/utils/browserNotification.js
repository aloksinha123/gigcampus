/**
 * Utility for Native Browser Push Notifications in GigCampus
 */

const THROTTLE_MS = 1000;
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
 * Trigger a Native Desktop Browser Notification & On-screen Toast
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
    if (typeof window === 'undefined') {
        return;
    }

    // Throttling check
    const now = Date.now();
    const lastTriggered = notificationHistory.get(tag) || 0;
    if (now - lastTriggered < THROTTLE_MS) {
        return;
    }
    notificationHistory.set(tag, now);

    // 1. Native Desktop Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body,
                icon,
                tag,
                timestamp: now,
                silent: false,
                requireInteraction: false
            });

            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                if (url && url !== '#') {
                    window.location.href = url;
                }
                notification.close();
            };
        } catch (err) {
            console.warn('Native desktop notification unavailable, falling back to UI popup:', err);
        }
    }

    // 2. Play subtle notification sound if Web Audio API is available
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        // Audio playback optional
    }
};
