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
                return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded-full">BLOCKED</span>;
            default:
                return <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 text-[10px] font-extrabold rounded-full">{status}</span>;
        }
    };

    const formatActionName = (action) => {
        return action.replace(/_/g, ' ');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            🛡️ Enterprise Security Audit Dashboard
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Monitor authentication events, security alerts, failed login attempts, and account locks in real time.
                        </p>
                    </div>
                </div>

                {/* Metrics Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Locked Accounts</p>
                            <h3 className="text-3xl font-black text-rose-600 mt-1">{stats.lockedAccountsCount}</h3>
                        </div>
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl">
                            🔒
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Failed Logins</p>
                            <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.failedLoginsCount}</h3>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl">
                            ⚠️
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Devices Logins</p>
                            <h3 className="text-3xl font-black text-blue-600 mt-1">{stats.newDeviceLoginsCount}</h3>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">
                            📱
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Audit Events</p>
                            <h3 className="text-3xl font-black text-indigo-600 mt-1">{stats.totalAuditLogs}</h3>
                        </div>
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl">
                            📜
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-8">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by email, action, IP, or device..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                            <span className="absolute left-3.5 top-3.5 text-gray-400">🔍</span>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select
                                value={actionFilter}
                                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="SUCCESS">Success</option>
                                <option value="FAILURE">Failure</option>
                                <option value="WARNING">Warning</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>

                            <button
                                type="submit"
                                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition shadow-sm cursor-pointer whitespace-nowrap"
                            >
                                Search Logs
                            </button>
                        </div>
                    </form>
                </div>

                {/* Audit Logs Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Security Event Log Trail</h3>
                        <span className="text-xs font-medium text-gray-500">Showing Page {page} of {totalPages}</span>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-xs text-gray-500 font-medium">Fetching audit logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-16 text-center text-gray-500">
                            <p className="text-sm font-semibold">No security audit events match your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-[11px] font-extrabold uppercase text-gray-400 border-b border-gray-100 tracking-wider">
                                        <th className="py-4 px-6">Timestamp</th>
                                        <th className="py-4 px-6">User / Target Email</th>
                                        <th className="py-4 px-6">Event Action</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">Device & OS</th>
                                        <th className="py-4 px-6">IP Address</th>
                                        <th className="py-4 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {logs.map((log) => {
                                        const isLockedUser = log.user?.lockUntil && new Date(log.user.lockUntil).getTime() > Date.now();
                                        return (
                                            <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="py-4 px-6 whitespace-nowrap text-gray-500 font-medium">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-gray-900">
                                                    <div>{log.userEmail || 'Unauthenticated'}</div>
                                                    {log.user?.role && (
                                                        <span className="text-[10px] font-normal text-gray-400 uppercase">
                                                            Role: {log.user.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-blue-900">
                                                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                                                        {formatActionName(log.action)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {getStatusBadge(log.status)}
                                                </td>
                                                <td className="py-4 px-6 text-gray-600">
                                                    <div className="font-semibold text-gray-800">{log.browser}</div>
                                                    <div className="text-[11px] text-gray-400">{log.operatingSystem}</div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <code className="bg-gray-100 px-2 py-1 rounded text-[11px] text-gray-800 font-mono">
                                                        {log.ipAddress}
                                                    </code>
                                                </td>
                                                <td className="py-4 px-6 text-right whitespace-nowrap">
                                                    {isLockedUser && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnlockUser(log.user._id, log.userEmail)}
                                                            disabled={unlockingUserId === log.user._id}
                                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                                                        >
                                                            {unlockingUserId === log.user._id ? 'Unlocking...' : '🔓 Unlock Account'}
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
                    <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                            ← Previous
                        </button>
                        <span className="text-xs font-bold text-gray-600">Page {page} of {totalPages}</span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                            Next →
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminSecurity;
