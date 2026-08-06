import React from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Format relative last seen timestamp
 */
export const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'Offline';
    const date = new Date(lastSeenDate);
    if (isNaN(date.getTime())) return 'Offline';

    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now - date) / 1000));

    if (diffInSeconds < 60) {
        return 'Last seen just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `Last seen ${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `Last seen ${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `Last seen ${diffInDays}d ago`;
    }

    return `Last seen ${date.toLocaleDateString()}`;
};

/**
 * Real-time User Presence Indicator Component
 */
const UserPresence = ({ userId, initialIsOnline = false, initialLastSeen = null, showText = true, size = 'sm' }) => {
    const { getUserPresence } = useSocket();
    const presence = getUserPresence(userId, initialIsOnline, initialLastSeen);

    const isOnline = presence.isOnline;
    const lastSeenText = formatLastSeen(presence.lastSeen);

    const dotSizeClass = size === 'lg' ? 'w-4 h-4' : size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5';

    return (
        <div className="inline-flex items-center gap-1.5">
            <span className="relative flex items-center justify-center">
                {isOnline && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}></span>
                )}
                <span className={`relative inline-flex rounded-full ${dotSizeClass} ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-gray-400'}`}></span>
            </span>

            {showText && (
                <span className={`text-xs font-bold ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {isOnline ? 'Online' : lastSeenText}
                </span>
            )}
        </div>
    );
};

export default UserPresence;
