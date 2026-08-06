/**
 * Utility function to parse user-agent string into OS, Browser, and Device Name
 */
export const parseUserAgent = (uaString = '') => {
    let browser = 'Unknown Browser';
    let operatingSystem = 'Unknown OS';
    let deviceName = 'Desktop PC';

    if (!uaString) {
        return { browser, operatingSystem, deviceName };
    }

    const ua = uaString.toLowerCase();

    // 1. Detect Operating System
    if (ua.includes('windows phone')) {
        operatingSystem = 'Windows Phone';
        deviceName = 'Windows Phone';
    } else if (ua.includes('win64') || ua.includes('wow64') || ua.includes('windows nt')) {
        operatingSystem = 'Windows';
        deviceName = 'Windows PC';
    } else if (ua.includes('android')) {
        operatingSystem = 'Android';
        deviceName = 'Android Phone';
    } else if (ua.includes('iphone')) {
        operatingSystem = 'iOS';
        deviceName = 'iPhone';
    } else if (ua.includes('ipad')) {
        operatingSystem = 'iOS';
        deviceName = 'iPad';
    } else if (ua.includes('macintosh') || ua.includes('mac os x')) {
        operatingSystem = 'macOS';
        deviceName = 'Mac';
    } else if (ua.includes('linux')) {
        operatingSystem = 'Linux';
        deviceName = 'Linux Workstation';
    }

    // 2. Detect Browser
    if (ua.includes('edg/') || ua.includes('edge/')) {
        browser = 'Microsoft Edge';
    } else if (ua.includes('chrome/') && !ua.includes('chromium/')) {
        browser = 'Google Chrome';
    } else if (ua.includes('firefox/') || ua.includes('fxios/')) {
        browser = 'Mozilla Firefox';
    } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
        browser = 'Apple Safari';
    } else if (ua.includes('opera') || ua.includes('opr/')) {
        browser = 'Opera';
    } else if (ua.includes('trident/')) {
        browser = 'Internet Explorer';
    }

    return { browser, operatingSystem, deviceName };
};
