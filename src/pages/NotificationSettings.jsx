import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { requestNotificationPermission } from '../utils/browserNotification';

const NotificationSettings = () => {
    const { success, error } = useNotification();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [browserPermission, setBrowserPermission] = useState('default');

    const [prefs, setPrefs] = useState({
        browserNotifications: true,
        messageNotifications: true,
        paymentNotifications: true,
        bidNotifications: true,
        projectNotifications: true,
        aiNotifications: true,
        marketingNotifications: false
    });

    useEffect(() => {
        fetchPreferences();
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setBrowserPermission(Notification.permission);
        }
    }, []);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const response = await api.notifications.getPreferences();
            if (response.data?.preferences) {
                setPrefs(response.data.preferences);
            }
        } catch (err) {
            console.error('Failed to load notification preferences:', err);
            error('Failed to load notification preferences.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (key) => {
        setPrefs(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleEnableBrowserPush = async () => {
        const status = await requestNotificationPermission();
        setBrowserPermission(status);
        if (status === 'granted') {
            success('🔔 Browser Push Notifications enabled!');
            setPrefs(prev => ({ ...prev, browserNotifications: true }));
        } else if (status === 'denied') {
            error('Notification permission was blocked in your browser settings.');
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await api.notifications.updatePreferences(prefs);
            if (response.data?.success) {
                success('✨ Notification settings saved successfully!');
            } else {
                error('Unable to save notification preferences.');
            }
        } catch (err) {
            console.error('Save notification preferences error:', err);
            error(err.response?.data?.message || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const settingItems = [
        {
            key: 'messageNotifications',
            title: 'Messages & Chat',
            description: 'Receive real-time notifications for direct messages and project inquiries.',
            icon: '💬'
        },
        {
            key: 'paymentNotifications',
            title: 'Payments & Escrow',
            description: 'Notifications for escrow deposits, milestone releases, and wallet credits.',
            icon: '💰'
        },
        {
            key: 'bidNotifications',
            title: 'Bids & Proposals',
            description: 'Alerts when freelancers place bids or when your proposals are accepted.',
            icon: '📋'
        },
        {
            key: 'projectNotifications',
            title: 'Project Updates',
            description: 'Notifications for project milestones, contract status changes, and disputes.',
            icon: '📁'
        },
        {
            key: 'aiNotifications',
            title: 'AI Feature Alerts',
            description: 'Updates from AI Bid Quality Analyzer, Description Enhancer, and AI Matchmaker.',
            icon: '✨'
        },
        {
            key: 'marketingNotifications',
            title: 'Marketing & Updates',
            description: 'Platform feature updates, campus newsletter, and special promotional offers.',
            icon: '📢',
            isDefaultDisabled: true
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold mb-3 border border-blue-100">
                        <span>🔔 Preference Center</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Notification <span className="text-blue-600">Settings</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-base mt-2">
                        Customize how and when you receive real-time alerts across web and desktop.
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-gray-100">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-3"></div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Preferences...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Browser Permission Banner */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl border border-indigo-800/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">🌐</span>
                                    <h3 className="text-xl font-black tracking-tight">Desktop Browser Push</h3>
                                </div>
                                <p className="text-xs text-indigo-200 font-medium max-w-xl leading-relaxed">
                                    Receive instant native desktop popups even when GigCampus is running in a background tab.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Browser Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        browserPermission === 'granted' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                        browserPermission === 'denied' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    }`}>
                                        {browserPermission}
                                    </span>
                                </div>
                            </div>

                            {browserPermission !== 'granted' && (
                                <button
                                    onClick={handleEnableBrowserPush}
                                    className="px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-all hover:scale-105 cursor-pointer whitespace-nowrap"
                                >
                                    Enable Push Alerts 🔔
                                </button>
                            )}
                        </div>

                        {/* Category Toggles List */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pb-4 border-b border-gray-100">
                                Notification Categories
                            </h3>

                            <div className="divide-y divide-gray-100">
                                {settingItems.map(item => (
                                    <div key={item.key} className="py-5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl flex-shrink-0">
                                                {item.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-lg font-black text-gray-900">{item.title}</h4>
                                                    {item.isDefaultDisabled && (
                                                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[9px] font-bold uppercase">
                                                            Disabled by default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed max-w-xl">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Toggle Switch */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(item.key)}
                                            className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                prefs[item.key] ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    prefs[item.key] ? 'translate-x-7' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save Action */}
                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-blue-100 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {saving ? 'Saving Preferences...' : 'Save Settings ✨'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationSettings;
