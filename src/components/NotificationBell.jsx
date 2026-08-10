import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { triggerBrowserNotification, requestNotificationPermission } from '../utils/browserNotification';

const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const { socket } = useSocket();

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Listen for new notifications via socket
        if (socket) {
            socket.on('newNotification', (newNotif) => {
                setNotifications(prev => [newNotif, ...prev.slice(0, 9)]);
                setUnreadCount(prev => prev + 1);

                const targetUrl = getNotificationLink(newNotif);
                triggerBrowserNotification({
                    title: 'GigCampus',
                    body: newNotif.message || 'You received a new notification.',
                    url: targetUrl,
                    tag: `notif-${newNotif._id || Date.now()}`
                });
            });
        }

        // Poll for new notifications every 30 seconds as backup
        const interval = setInterval(fetchNotifications, 30000);

        return () => {
            clearInterval(interval);
            if (socket) {
                socket.off('newNotification');
            }
        };
    }, [socket]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.notifications.getMy();
            const notifs = response.data || [];
            setNotifications(notifs.slice(0, 10)); // Show last 10
            setUnreadCount(notifs.filter(n => !n.read).length);
        } catch (err) {
            if (err.response?.status !== 429) {
                console.error('Failed to fetch notifications:', err);
            }
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await api.notifications.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            setLoading(true);
            await api.notifications.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        } finally {
            setLoading(false);
        }
    };

    const getNotificationIcon = (type) => {
        const iconMap = {
            bid: { color: 'text-gc-blue', bg: 'bg-gc-soft' },
            message: { color: 'text-gc-cyan', bg: 'bg-gc-soft' },
            payment: { color: 'text-emerald-500', bg: 'bg-emerald-50' },
            review: { color: 'text-amber-500', bg: 'bg-amber-50' },
            project: { color: 'text-gc-blue', bg: 'bg-gc-soft' },
            system: { color: 'text-gc-navy', bg: 'bg-gc-soft' }
        };
        return iconMap[type] || iconMap.system;
    };

    const getNotificationSvg = (type) => {
        const svgs = {
            bid: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
            message: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
            payment: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            review: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
            project: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
            system: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        };
        return svgs[type] || svgs.system;
    };

    const getNotificationLink = (notification) => {
        if (notification.project) {
            const projectId = typeof notification.project === 'object' ? notification.project._id : notification.project;
            return `/projects/${projectId}`;
        }
        if (notification.type === 'message') {
            return '/messages';
        }
        return '#';
    };

    const formatTime = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffInMinutes = Math.floor((now - notifDate) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return notifDate.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gc-muted hover:text-gc-slate hover:bg-gc-surface rounded-gc transition-all"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-gc-cyan text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] min-h-[18px]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-gc-xl shadow-gc-xl border border-gc-border z-50 max-h-[80vh] sm:max-h-[600px] flex flex-col -right-12 sm:right-0">
                    {/* Header */}
                    <div className="p-4 border-b border-gc-border flex justify-between items-center">
                        <h3 className="font-semibold text-gc-navy text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={loading}
                                className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-12 h-12 bg-gc-surface rounded-full flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-medium text-gc-slate mb-1">No notifications</h3>
                                <p className="text-xs text-gc-muted text-center">
                                    You're all caught up!
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gc-border">
                                {notifications.map((notification) => {
                                    const iconStyle = getNotificationIcon(notification.type);
                                    return (
                                    <Link
                                        key={notification._id}
                                        to={getNotificationLink(notification)}
                                        onClick={() => {
                                            try {
                                                api.notifications.markAsClicked(notification._id);
                                            } catch (e) {}
                                            setShowDropdown(false);
                                        }}
                                        className={`block p-4 hover:bg-gc-surface/50 transition-all ${!notification.read ? 'bg-gc-soft/30' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className={`flex-shrink-0 w-9 h-9 rounded-gc flex items-center justify-center ${iconStyle.bg} ${iconStyle.color}`}>
                                                {getNotificationSvg(notification.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-snug ${!notification.read ? 'font-semibold text-gc-navy' : 'text-gc-slate'}`}>
                                                    {notification.message}
                                                </p>
                                                <p className="text-[11px] text-gc-muted mt-1">
                                                    {formatTime(notification.createdAt)}
                                                </p>
                                            </div>

                                            {/* Unread Indicator */}
                                            {!notification.read && (
                                                <div className="flex-shrink-0 mt-1">
                                                    <div className="w-2 h-2 bg-gc-cyan rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gc-border text-center">
                            <Link
                                to="/notifications"
                                onClick={() => setShowDropdown(false)}
                                className="text-xs text-gc-blue hover:text-gc-navy font-medium"
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
