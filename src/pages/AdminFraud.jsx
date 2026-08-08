import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const AdminFraud = () => {
    const { user } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    // Data States
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        OPEN: 0,
        REVIEWING: 0,
        RESOLVED: 0,
        FALSE_POSITIVE: 0,
        BLOCKED: 0,
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
    });

    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);

    // Filter States
    const [levelFilter, setLevelFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal / Management States
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [eventDetails, setEventDetails] = useState(null);
    const [riskProfile, setRiskProfile] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [actionReason, setActionReason] = useState('');
    const [submittingAction, setSubmittingAction] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchEvents();
        fetchStats();
    }, [user, navigate, page, levelFilter, statusFilter]);

    const fetchEvents = async (query = searchQuery) => {
        try {
            setLoading(true);
            const res = await api.admin.getFraudEvents({
                riskLevel: levelFilter,
                status: statusFilter,
                search: query,
                page,
                limit: 15
            });
            if (res.data?.success) {
                setEvents(res.data.events || []);
                setTotalPages(res.data.pages || 1);
            }
        } catch (err) {
            error(err.response?.data?.message || 'Failed to fetch fraud events.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const res = await api.admin.getFraudStats();
            if (res.data?.success) {
                setStats(res.data.statistics.summary || {});
            }
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchEvents(searchQuery);
    };

    const openManagementModal = async (eventId) => {
        try {
            setSelectedEventId(eventId);
            setDetailsLoading(true);
            setActionReason('');
            const res = await api.admin.getFraudEventDetails(eventId);
            if (res.data?.success) {
                setEventDetails(res.data.event);
                setRiskProfile(res.data.riskProfile);
            }
        } catch (err) {
            error('Failed to load alert details.');
            setSelectedEventId(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleUpdateStatus = async (statusVal) => {
        if (!selectedEventId) return;
        try {
            setSubmittingAction(true);
            const res = await api.admin.updateFraudStatus(selectedEventId, statusVal);
            success(res.data.message || `Alert status updated to ${statusVal}.`);
            // Refresh details
            openManagementModal(selectedEventId);
            fetchEvents();
            fetchStats();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update alert status.');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleResolve = async (resolutionVal) => {
        if (!selectedEventId) return;
        if (!actionReason.trim()) {
            error('Please input a resolution reason.');
            return;
        }

        try {
            setSubmittingAction(true);
            const res = await api.admin.resolveFraudEvent(selectedEventId, resolutionVal, actionReason);
            success(res.data.message || `Alert successfully resolved.`);
            setSelectedEventId(null);
            fetchEvents();
            fetchStats();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to resolve fraud event.');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleBlockUser = async () => {
        if (!selectedEventId) return;
        if (!actionReason.trim()) {
            error('Please provide a reason for suspending this account.');
            return;
        }

        try {
            setSubmittingAction(true);
            const res = await api.admin.blockUser(selectedEventId, actionReason);
            success(res.data.message || 'User account successfully suspended.');
            setSelectedEventId(null);
            fetchEvents();
            fetchStats();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to suspend account.');
        } finally {
            setSubmittingAction(false);
        }
    };

    // Style Helpers
    const getRiskLevelBadge = (level) => {
        switch (level) {
            case 'CRITICAL':
                return <span className="px-2.5 py-1 bg-red-950/80 text-red-300 text-[10px] font-black rounded-lg border border-red-500/30">CRITICAL</span>;
            case 'HIGH':
                return <span className="px-2.5 py-1 bg-rose-950/40 text-rose-300 text-[10px] font-black rounded-lg border border-rose-500/20">HIGH</span>;
            case 'MEDIUM':
                return <span className="px-2.5 py-1 bg-amber-950/40 text-amber-300 text-[10px] font-black rounded-lg border border-amber-500/20">MEDIUM</span>;
            default:
                return <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[10px] font-black rounded-lg border border-slate-700">LOW</span>;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN':
                return <span className="px-2.5 py-1 bg-blue-950/40 text-blue-300 text-[10px] font-black rounded-lg border border-blue-500/20">OPEN</span>;
            case 'REVIEWING':
                return <span className="px-2.5 py-1 bg-indigo-950/60 text-indigo-300 text-[10px] font-black rounded-lg border border-indigo-500/20">REVIEWING</span>;
            case 'RESOLVED':
                return <span className="px-2.5 py-1 bg-emerald-950/40 text-emerald-300 text-[10px] font-black rounded-lg border border-emerald-500/20">RESOLVED</span>;
            case 'FALSE_POSITIVE':
                return <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[10px] font-black rounded-lg border border-slate-700">FALSE POSITIVE</span>;
            case 'BLOCKED':
                return <span className="px-2.5 py-1 bg-rose-950/40 text-rose-300 text-[10px] font-black rounded-lg border border-rose-500/20">BLOCKED</span>;
            default:
                return <span className="px-2.5 py-1 bg-slate-700 text-slate-300 text-[10px] font-black rounded-lg">{status}</span>;
        }
    };

    const getScoreColorClass = (score) => {
        if (score >= 80) return 'text-red-400 font-extrabold';
        if (score >= 60) return 'text-rose-400 font-bold';
        if (score >= 30) return 'text-amber-400 font-bold';
        return 'text-slate-300';
    };

    return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans pb-20">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-800/80">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-xs font-bold mb-3 border border-rose-500/20">
                            <span>🚨 Trust & Safety Operations</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-white italic">
                            Fraud <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-amber-400">Detection Center</span>
                        </h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">
                            Deterministic risk scores, threat signals logging, and accounts suspension audit trails.
                        </p>
                    </div>

                    <div>
                        <Link
                            to="/admin"
                            className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-700 transition"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Stats Cards Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-10">
                    {[
                        { title: 'Total Fraud Alerts', value: stats.total, color: 'text-white', border: 'border-slate-800' },
                        { title: 'Open Alerts', value: stats.OPEN + stats.REVIEWING, color: 'text-blue-400', border: 'border-blue-500/20' },
                        { title: 'High/Critical risk', value: (stats.HIGH || 0) + (stats.CRITICAL || 0), color: 'text-rose-400', border: 'border-rose-500/20' },
                        { title: 'False Positives', value: stats.FALSE_POSITIVE, color: 'text-slate-400', border: 'border-slate-800' },
                        { title: 'Blocked Users', value: stats.BLOCKED, color: 'text-red-500', border: 'border-red-500/20' }
                    ].map((card, idx) => (
                        <div key={idx} className={`bg-slate-900/60 rounded-2xl p-5 sm:p-6 border ${card.border} shadow-xl flex flex-col justify-between h-28`}>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.title}</span>
                            <span className={`text-2xl sm:text-3xl font-black ${card.color}`}>
                                {statsLoading ? '...' : card.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Filters Section */}
                <div className="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-800/85 mb-8 shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by Username, Email, IP Address or Browser..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 text-slate-100 text-xs px-4 py-3 pl-10 rounded-xl border border-slate-850 focus:outline-none focus:border-rose-500 placeholder-slate-500 min-h-[44px]"
                            />
                            <span className="absolute left-3.5 top-3.5 text-slate-500 text-xs">🔍</span>
                        </div>
                    </form>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-450">Risk Level:</span>
                            <select
                                value={levelFilter}
                                onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
                                className="bg-slate-950 text-slate-200 text-xs px-3 py-2.5 rounded-xl border border-slate-850 focus:outline-none focus:border-rose-500 cursor-pointer min-h-[44px]"
                            >
                                <option value="ALL">All Levels</option>
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-450">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                className="bg-slate-950 text-slate-200 text-xs px-3 py-2.5 rounded-xl border border-slate-850 focus:outline-none focus:border-rose-500 cursor-pointer min-h-[44px]"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="OPEN">Open</option>
                                <option value="REVIEWING">Reviewing</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="FALSE_POSITIVE">False Positive</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Events Table Container */}
                <div className="bg-slate-900/40 rounded-3xl border border-slate-850 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto custom-scrollbar-x">
                        <table className="w-full text-left border-collapse min-w-[680px]">
                            <thead>
                                <tr className="border-b border-slate-850/80 bg-slate-950/60">
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User profile</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal Type</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Risk Score</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Level</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged Time</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center text-slate-500 font-medium">
                                            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            Loading alerts data telemetry...
                                        </td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center text-slate-500 font-bold uppercase tracking-wider">
                                            No fraud events matching selected filters.
                                        </td>
                                    </tr>
                                ) : (
                                    events.map(event => (
                                        <tr key={event._id} className="border-b border-slate-850/50 hover:bg-slate-950/20 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={event.userId?.profile?.avatar || 'https://ui-avatars.com/api/?name=User'}
                                                        alt=""
                                                        className="w-9 h-9 rounded-xl border border-slate-800 object-cover"
                                                    />
                                                    <div>
                                                        <span className="block text-sm font-black text-slate-200">
                                                            {event.userId?.username || 'Unknown User'}
                                                        </span>
                                                        <span className="block text-xs text-slate-500 font-medium">
                                                            {event.userId?.email || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-xs font-mono font-bold text-slate-300">
                                                    {event.eventType}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`text-sm ${getScoreColorClass(event.riskScore)}`}>
                                                    {event.riskScore}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {getRiskLevelBadge(event.riskLevel)}
                                            </td>
                                            <td className="py-4 px-6 text-xs text-slate-400 font-medium">
                                                {new Date(event.createdAt).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                {getStatusBadge(event.status)}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => openManagementModal(event._id)}
                                                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-black uppercase rounded-lg border border-slate-700 cursor-pointer transition active:scale-95"
                                                >
                                                    Manage Alert
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="bg-slate-950/60 p-4 border-t border-slate-850 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-black rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-black rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Alert Management Modal */}
            {selectedEventId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 relative">
                        <button
                            onClick={() => setSelectedEventId(null)}
                            className="absolute right-4 top-4 text-slate-500 hover:text-slate-200 text-xl font-bold cursor-pointer"
                        >
                            ✕
                        </button>

                        {detailsLoading ? (
                            <div className="py-20 text-center text-slate-500 font-medium">
                                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                Loading event audit metrics...
                            </div>
                        ) : eventDetails && (
                            <div>
                                <h3 className="text-xl font-black text-white italic mb-4">🚨 Alert Control Center</h3>

                                {/* User Risk Header */}
                                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850 flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={eventDetails.userId?.profile?.avatar || 'https://ui-avatars.com/api/?name=User'}
                                            alt=""
                                            className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                                        />
                                        <div>
                                            <span className="block text-sm font-black text-white">{eventDetails.userId?.username}</span>
                                            <span className="block text-xs text-slate-500">{eventDetails.userId?.email}</span>
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-md border border-slate-700">
                                                Role: {eventDetails.userId?.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregated Risk</span>
                                        <span className={`text-2xl font-black block ${getScoreColorClass(riskProfile?.riskScore)}`}>
                                            {riskProfile?.riskScore} / 100
                                        </span>
                                        <span className="block text-[10px] text-slate-500 font-bold">{riskProfile?.riskLevel}</span>
                                    </div>
                                </div>

                                {/* Event specifics */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Triggered Signal</span>
                                        <span className="text-xs font-mono font-bold text-slate-200">{eventDetails.eventType}</span>
                                    </div>
                                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60">
                                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Telemetry Status</span>
                                        {getStatusBadge(eventDetails.status)}
                                    </div>
                                </div>

                                {/* Device details */}
                                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 mb-6">
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Network & Device Telemetry</span>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-400">
                                        <div><span className="text-slate-500 font-black">IP Address:</span> {eventDetails.metadata?.ipAddress || 'Unknown'}</div>
                                        <div><span className="text-slate-500 font-black">Browser Agent:</span> {eventDetails.metadata?.userAgent || 'Unknown'}</div>
                                        {eventDetails.metadata?.reason && (
                                            <div className="col-span-2 mt-2 pt-2 border-t border-slate-850/50">
                                                <span className="text-slate-500 font-black">Details:</span> {eventDetails.metadata.reason}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Interface */}
                                <div>
                                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Administrative Action</span>
                                    
                                    {eventDetails.status === 'OPEN' && (
                                        <button
                                            onClick={() => handleUpdateStatus('REVIEWING')}
                                            disabled={submittingAction}
                                            className="w-full mb-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer"
                                        >
                                            {submittingAction ? 'Processing...' : '👁️ Start Review (Mark REVIEWING)'}
                                        </button>
                                    )}

                                    {['OPEN', 'REVIEWING'].includes(eventDetails.status) && (
                                        <div>
                                            <textarea
                                                placeholder="Write reason description to support this resolution / blocking action..."
                                                value={actionReason}
                                                onChange={e => setActionReason(e.target.value)}
                                                className="w-full bg-slate-950 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-850 focus:outline-none focus:border-rose-500 placeholder-slate-550 mb-4 h-20"
                                            />

                                            <div className="grid grid-cols-3 gap-3">
                                                <button
                                                    onClick={() => handleResolve('FALSE_POSITIVE')}
                                                    disabled={submittingAction}
                                                    className="py-2.5 bg-slate-850 hover:bg-slate-800 disabled:opacity-50 text-slate-300 text-xs font-black uppercase rounded-xl transition cursor-pointer"
                                                >
                                                    False Positive
                                                </button>
                                                <button
                                                    onClick={() => handleResolve('RESOLVED')}
                                                    disabled={submittingAction}
                                                    className="py-2.5 bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer"
                                                >
                                                    Resolve Alert
                                                </button>
                                                <button
                                                    onClick={handleBlockUser}
                                                    disabled={submittingAction}
                                                    className="py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer"
                                                >
                                                    Block User 🚫
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {['RESOLVED', 'FALSE_POSITIVE', 'BLOCKED'].includes(eventDetails.status) && (
                                        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 text-xs font-medium text-slate-400">
                                            <div className="mb-1"><span className="text-slate-500 font-black">Reviewed By:</span> {eventDetails.reviewedBy?.username || 'Admin'}</div>
                                            <div className="mb-1"><span className="text-slate-500 font-black">Reviewed At:</span> {new Date(eventDetails.reviewedAt).toLocaleString()}</div>
                                            <div><span className="text-slate-500 font-black">Resolution Reason:</span> {eventDetails.resolutionReason || 'No reason provided'}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminFraud;
