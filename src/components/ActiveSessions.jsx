import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const ActiveSessions = () => {
    const { success, error } = useNotification();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state for confirmation
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: '', // 'single' or 'all'
        sessionId: null,
        deviceName: ''
    });

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await api.auth.getSessions();
            setSessions(response.data || []);
        } catch (err) {
            error(err.response?.data?.message || 'Failed to load active sessions.');
        } finally {
            setLoading(false);
        }
    };

    const handleTerminateSingle = (sessionId, deviceName) => {
        setConfirmModal({
            isOpen: true,
            type: 'single',
            sessionId,
            deviceName
        });
    };

    const handleTerminateAllOthers = () => {
        setConfirmModal({
            isOpen: true,
            type: 'all',
            sessionId: null,
            deviceName: ''
        });
    };

    const confirmAction = async () => {
        try {
            setActionLoading(true);
            if (confirmModal.type === 'single') {
                await api.auth.terminateSession(confirmModal.sessionId);
                success('Session terminated successfully.');
            } else if (confirmModal.type === 'all') {
                await api.auth.terminateOtherSessions();
                success('All other active sessions logged out successfully.');
            }
            setConfirmModal({ isOpen: false, type: '', sessionId: null, deviceName: '' });
            fetchSessions();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to terminate session.');
        } finally {
            setActionLoading(false);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDeviceIcon = (os = '') => {
        const lower = os.toLowerCase();
        if (lower.includes('android') || lower.includes('ios') || lower.includes('phone')) {
            return '📱';
        }
        return '💻';
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        🛡️ Active Device Sessions
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Manage all logged-in browsers and devices associated with your GigCampus account.
                    </p>
                </div>

                {sessions.filter(s => !s.isCurrentSession).length > 0 && (
                    <button
                        type="button"
                        onClick={handleTerminateAllOthers}
                        disabled={actionLoading}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                        <span>🚪</span> Logout All Other Devices
                    </button>
                )}
            </div>

            {loading ? (
                <div className="py-12 text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-gray-500 font-medium">Loading active sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                    <p className="text-sm font-semibold">No active sessions found.</p>
                </div>
            ) : (
                <div className="mt-6 space-y-4">
                    {sessions.map((session) => (
                        <div
                            key={session._id}
                            className={`p-5 rounded-2xl border transition-all ${
                                session.isCurrentSession
                                    ? 'bg-blue-50/40 border-blue-200 shadow-xs'
                                    : 'bg-white border-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                                        {getDeviceIcon(session.operatingSystem)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-sm text-gray-900">
                                                {session.browser} on {session.operatingSystem}
                                            </h4>
                                            {session.isCurrentSession && (
                                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200 uppercase tracking-wider">
                                                    Current Device
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs text-gray-500">
                                            <div>
                                                <span className="font-semibold text-gray-700">IP Address: </span>
                                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] text-gray-800">{session.ipAddress}</code>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-700">Device: </span>
                                                {session.deviceName}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-700">Last Active: </span>
                                                {formatTime(session.lastActivity)}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-700">Logged In: </span>
                                                {formatTime(session.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {!session.isCurrentSession && (
                                    <button
                                        type="button"
                                        onClick={() => handleTerminateSingle(session._id, `${session.browser} (${session.operatingSystem})`)}
                                        disabled={actionLoading}
                                        className="self-end sm:self-center px-3.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 hover:border-rose-200 text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                    >
                                        <span>Logout</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                            ⚠️
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">
                            {confirmModal.type === 'all' ? 'Logout All Other Devices?' : 'Terminate Session?'}
                        </h4>
                        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                            {confirmModal.type === 'all'
                                ? 'Are you sure you want to log out from all other devices? Any unsaved work on those devices may be lost.'
                                : `Are you sure you want to log out from "${confirmModal.deviceName}"?`}
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmModal({ isOpen: false, type: '', sessionId: null, deviceName: '' })}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmAction}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading ? 'Logging out...' : 'Yes, Terminate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveSessions;
