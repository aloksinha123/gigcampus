import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const AdminSecurity = () => {
    const { success, error } = useNotification();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        lockedAccountsCount: 0,
        failedLoginsCount: 0,
        newDeviceLoginsCount: 0,
        totalAuditLogs: 0
    });
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [unlockingUserId, setUnlockingUserId] = useState(null);

    useEffect(() => {
        fetchAuditLogs();
    }, [page, actionFilter, statusFilter]);

    const fetchAuditLogs = async (query = searchQuery) => {
        try {
            setLoading(true);
            const res = await api.security.getAdminLogs({
                search: query,
                action: actionFilter,
                status: statusFilter,
                page,
                limit: 25
            });

            setLogs(res.data.logs || []);
            setTotalPages(res.data.pages || 1);
            setStats(res.data.stats || {
                lockedAccountsCount: 0,
                failedLoginsCount: 0,
                newDeviceLoginsCount: 0,
                totalAuditLogs: 0
            });
        } catch (err) {
            error(err.response?.data?.message || 'Failed to fetch security audit logs.');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchAuditLogs(searchQuery);
    };

    const handleUnlockUser = async (userId, userEmail) => {
        try {
            setUnlockingUserId(userId);
            const res = await api.security.unlockUserAccount(userId);
            success(res.data.message || `Account for ${userEmail} unlocked.`);
            fetchAuditLogs();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to unlock account.');
        } finally {
            setUnlockingUserId(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'SUCCESS':
                return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">SUCCESS</span>;
            case 'FAILURE':
                return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-extrabold rounded-full">FAILURE</span>;
            case 'WARNING':
                return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full">WARNING</span>;
            case 'BLOCKED':
                return <span className="px-2.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-extrabold rounded-full border border-red-200">BLOCKED</span>;
            default:
                return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-extrabold rounded-full">{status}</span>;
        }
    };

    const formatActionName = (action) => {
        return action.replace(/_/g, ' ');
    };

    return (
        <div className="min-h-screen bg-gc-near flex flex-col">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gc-navy tracking-tight flex items-center gap-3">
                            Enterprise Security Audit Dashboard
                        </h1>
                        <p className="text-sm text-gc-muted mt-1">
                            Monitor authentication events, security alerts, failed login attempts, and account locks in real time.
                        </p>
                    </div>
                </div>

                {/* Metrics Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <div className="bg-white p-6 rounded-3xl border border-gc-border shadow-gc flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gc-muted uppercase tracking-wider">Locked Accounts</p>
                            <h3 className="text-3xl font-black text-rose-600 mt-1">{stats.lockedAccountsCount}</h3>
                        </div>
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gc-border shadow-gc flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gc-muted uppercase tracking-wider">Failed Logins</p>
                            <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.failedLoginsCount}</h3>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gc-border shadow-gc flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gc-muted uppercase tracking-wider">New Devices Logins</p>
                            <h3 className="text-3xl font-black text-gc-blue mt-1">{stats.newDeviceLoginsCount}</h3>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 text-gc-blue rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gc-border shadow-gc flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gc-muted uppercase tracking-wider">Total Audit Events</p>
                            <h3 className="text-3xl font-black text-gc-navy mt-1">{stats.totalAuditLogs}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gc-soft text-gc-navy rounded-2xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white rounded-3xl border border-gc-border shadow-gc p-6 mb-8">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by email, action, IP, or device..."
                                className="w-full gc-input pl-10"
                            />
                            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select
                                value={actionFilter}
                                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                                className="gc-input text-xs font-semibold"
                            >
                                <option value="ALL">All Actions</option>
                                <option value="LOGIN_SUCCESS">Login Success</option>
                                <option value="LOGIN_FAILURE">Login Failure</option>
                                <option value="ACCOUNT_LOCKED">Account Locked</option>
                                <option value="ACCOUNT_UNLOCKED">Account Unlocked</option>
                                <option value="NEW_DEVICE_LOGIN">New Device Login</option>
                                <option value="USER_REGISTRATION">User Registration</option>
                                <option value="EMAIL_VERIFICATION">Email Verification</option>
                                <option value="PASSWORD_RESET_REQUEST">Password Reset Request</option>
                                <option value="PASSWORD_RESET_SUCCESS">Password Reset Success</option>
                                <option value="SESSION_REVOKED">Session Revoked</option>
                                <option value="LOGOUT_ALL_DEVICES">Logout All Devices</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="gc-input text-xs font-semibold"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="SUCCESS">Success</option>
                                <option value="FAILURE">Failure</option>
                                <option value="WARNING">Warning</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>

                            <button
                                type="submit"
                                className="px-5 py-3 bg-gc-blue hover:bg-gc-navy text-white font-bold text-xs rounded-2xl transition shadow-sm cursor-pointer whitespace-nowrap"
                            >
                                Search Logs
                            </button>
                        </div>
                    </form>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white rounded-3xl border border-gc-border shadow-gc overflow-hidden">
                    <div className="p-6 border-b border-gc-border flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gc-navy">Security Event Log Trail</h3>
                        <span className="text-xs font-medium text-gc-muted">Showing Page {page} of {totalPages}</span>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center">
                            <div className="w-10 h-10 border-4 border-gc-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-xs text-gc-muted font-medium">Fetching audit logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-16 text-center text-gc-muted">
                            <p className="text-sm font-semibold">No security audit events match your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gc-surface text-[11px] font-extrabold uppercase text-gc-muted border-b border-gc-border tracking-wider">
                                        <th className="py-4 px-6">Timestamp</th>
                                        <th className="py-4 px-6">User / Target Email</th>
                                        <th className="py-4 px-6">Event Action</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">Device & OS</th>
                                        <th className="py-4 px-6">IP Address</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gc-border text-xs">
                                    {logs.map((log) => {
                                        const isLockedUser = log.user?.lockUntil && new Date(log.user.lockUntil).getTime() > Date.now();
                                        return (
                                            <tr key={log._id} className="hover:bg-gc-surface/50 transition-colors">
                                                <td className="py-4 px-6 whitespace-nowrap text-gc-muted font-medium">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-gc-navy">
                                                    <div>{log.userEmail || 'Unauthenticated'}</div>
                                                    {log.user?.role && (
                                                        <span className="text-[10px] font-normal text-gc-muted uppercase">
                                                            Role: {log.user.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-gc-navy">
                                                    <span className="bg-gc-soft text-gc-blue px-2.5 py-1 rounded-lg border border-gc-border">
                                                        {formatActionName(log.action)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {getStatusBadge(log.status)}
                                                </td>
                                                <td className="py-4 px-6 text-gc-slate">
                                                    <div className="font-semibold text-gc-navy">{log.browser}</div>
                                                    <div className="text-[11px] text-gc-muted">{log.operatingSystem}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <code className="bg-gc-surface px-2 py-1 rounded text-[11px] text-gc-navy font-mono border border-gc-border">
                                                        {log.ipAddress}
                                                    </code>
                                                </td>
                                                <td className="py-4 px-6 text-right whitespace-nowrap">
                                                    {isLockedUser && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnlockUser(log.user._id, log.userEmail)}
                                                            disabled={unlockingUserId === log.user._id}
                                                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                                                        >
                                                            {unlockingUserId === log.user._id ? 'Unlocking...' : 'Unlock Account'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="p-6 border-t border-gc-border flex items-center justify-between">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 bg-gc-surface hover:bg-gc-border disabled:opacity-40 text-gc-navy font-bold text-xs rounded-xl transition cursor-pointer border border-gc-border"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-bold text-gc-slate">Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 bg-gc-surface hover:bg-gc-border disabled:opacity-40 text-gc-navy font-bold text-xs rounded-xl transition cursor-pointer border border-gc-border"
                        >
                            Next
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminSecurity;
