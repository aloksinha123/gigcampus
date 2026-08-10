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
                return <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-lg border border-red-200">CRITICAL</span>;
            case 'HIGH':
                return <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-[10px] font-black rounded-lg border border-rose-200">HIGH</span>;
            case 'MEDIUM':
                return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black rounded-lg border border-amber-200">MEDIUM</span>;
            default:
                return <span className="px-2.5 py-1 bg-gc-surface text-gc-muted text-[10px] font-black rounded-lg border border-gc-border">LOW</span>;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN':
                return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-200">OPEN</span>;
            case 'REVIEWING':
                return <span className="px-2.5 py-1 bg-gc-soft text-gc-navy text-[10px] font-black rounded-lg border border-gc-border">REVIEWING</span>;
            case 'RESOLVED':
                return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-200">RESOLVED</span>;
            case 'FALSE_POSITIVE':
                return <span className="px-2.5 py-1 bg-gc-surface text-gc-muted text-[10px] font-black rounded-lg border border-gc-border">FALSE POSITIVE</span>;
            case 'BLOCKED':
                return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-black rounded-lg border border-red-200">BLOCKED</span>;
            default:
                return <span className="px-2.5 py-1 bg-gc-surface text-gc-slate text-[10px] font-black rounded-lg border border-gc-border">{status}</span>;
        }
    };

    const getScoreColorClass = (score) => {
        if (score >= 80) return 'text-red-600 font-extrabold';
        if (score >= 60) return 'text-rose-600 font-bold';
        if (score >= 30) return 'text-amber-600 font-bold';
        return 'text-gc-slate';
    };

    return (
        <div className="min-h-screen bg-gc-near pb-20">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-gc-border">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold mb-3 border border-red-200">
                            <span>Trust & Safety Operations</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-gc-navy italic">
                            Fraud Detection Center
                        </h1>
                        <p className="text-gc-muted text-sm font-medium mt-1">
                            Deterministic risk scores, threat signals logging, and accounts suspension audit trails.
                        </p>
                    </div>

                    <div>
                        <Link
                            to="/admin"
                            className="px-5 py-3 bg-white hover:bg-gc-surface text-gc-navy text-xs font-black uppercase tracking-wider rounded-xl border border-gc-border transition"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Stats Cards Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-10">
                    {[
                        { title: 'Total Fraud Alerts', value: stats.total, color: 'text-gc-navy', border: 'border-gc-border' },
                        { title: 'Open Alerts', value: stats.OPEN + stats.REVIEWING, color: 'text-gc-blue', border: 'border-blue-200' },
                        { title: 'High/Critical risk', value: (stats.HIGH || 0) + (stats.CRITICAL || 0), color: 'text-red-600', border: 'border-red-200' },
                        { title: 'False Positives', value: stats.FALSE_POSITIVE, color: 'text-gc-muted', border: 'border-gc-border' },
                        { title: 'Blocked Users', value: stats.BLOCKED, color: 'text-red-500', border: 'border-red-200' }
                    ].map((card, idx) => (
                        <div key={idx} className={`bg-white rounded-2xl p-5 sm:p-6 border ${card.border} shadow-gc flex flex-col justify-between h-28`}>
                            <span className="text-[10px] font-black text-gc-muted uppercase tracking-widest">{card.title}</span>
                            <span className={`text-2xl sm:text-3xl font-black ${card.color}`}>
                                {statsLoading ? '...' : card.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gc-border mb-8 shadow-gc flex flex-wrap items-center justify-between gap-4">
                    <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by Username, Email, IP Address or Browser..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full gc-input pl-10 text-xs min-h-[44px]"
                            />
                            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </form>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-gc-muted">Risk Level:</span>
                            <select
                                value={levelFilter}
                                onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
                                className="gc-input text-xs min-h-[44px]"
                            >
                                <option value="ALL">All Levels</option>
                                <option value="CRITICAL">Critical</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-gc-muted">Status:</span>
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                className="gc-input text-xs min-h-[44px]"
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
                <div className="bg-white rounded-3xl border border-gc-border overflow-hidden shadow-gc">
                    <div className="overflow-x-auto custom-scrollbar-x">
                        <table className="w-full text-left border-collapse min-w-[680px]">
                            <thead>
                                <tr className="border-b border-gc-border bg-gc-surface">
                                    <th className="py-4 px-6 text-[10px] font-black text-gc-muted uppercase tracking-widest">User profile</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gc-muted uppercase tracking-widest">Signal Type</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gc-muted uppercase tracking-widest text-center">Risk Score</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gc-muted uppercase tracking-widest">Risk Level</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gc-muted uppercase tracking-widest">Logged Time</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gc-muted uppercase tracking-widest">Status</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gc-muted uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center text-gc-muted font-medium">
                                            <div className="w-8 h-8 border-2 border-gc-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            Loading alerts data telemetry...
                                        </td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center text-gc-muted font-bold uppercase tracking-wider">
                                            No fraud events matching selected filters.
                                        </td>
                                    </tr>
                                ) : (
                                    events.map(event => (
                                        <tr key={event._id} className="border-b border-gc-border/50 hover:bg-gc-surface/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={event.userId?.profile?.avatar || 'https://ui-avatars.com/api/?name=User'}
                                                        alt=""
                                                        className="w-9 h-9 rounded-xl border border-gc-border object-cover"
                                                    />
                                                    <div>
                                                        <span className="block text-sm font-black text-gc-navy">
                                                            {event.userId?.username || 'Unknown User'}
                                                        </span>
                                                        <span className="block text-xs text-gc-muted font-medium">
                                                            {event.userId?.email || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-xs font-mono font-bold text-gc-slate">
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
                                            <td className="py-4 px-6 text-xs text-gc-muted font-medium">
                                                {new Date(event.createdAt).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                {getStatusBadge(event.status)}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => openManagementModal(event._id)}
                                                    className="px-3.5 py-1.5 bg-gc-surface hover:bg-gc-border text-gc-navy hover:text-gc-navy text-xs font-black uppercase rounded-lg border border-gc-border cursor-pointer transition active:scale-95"
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
                        <div className="bg-gc-surface/50 p-4 border-t border-gc-border flex items-center justify-between">
                            <span className="text-xs font-medium text-gc-muted">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 bg-white border border-gc-border text-gc-navy text-xs font-black rounded-lg hover:bg-gc-surface disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="px-3 py-1.5 bg-white border border-gc-border text-gc-navy text-xs font-black rounded-lg hover:bg-gc-surface disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl bg-white border border-gc-border rounded-3xl overflow-hidden shadow-2xl p-6 relative">
                        <button
                            onClick={() => setSelectedEventId(null)}
                            className="absolute right-4 top-4 text-gc-muted hover:text-gc-navy text-xl font-bold cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        {detailsLoading ? (
                            <div className="py-20 text-center text-gc-muted font-medium">
                                <div className="w-8 h-8 border-2 border-gc-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                Loading event audit metrics...
                            </div>
                        ) : eventDetails && (
                            <div>
                                <h3 className="text-xl font-black text-gc-navy italic mb-4">Alert Control Center</h3>

                                {/* User Risk Header */}
                                <div className="bg-gc-surface p-4 rounded-2xl border border-gc-border flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={eventDetails.userId?.profile?.avatar || 'https://ui-avatars.com/api/?name=User'}
                                            alt=""
                                            className="w-12 h-12 rounded-xl object-cover border border-gc-border"
                                        />
                                        <div>
                                            <span className="block text-sm font-black text-gc-navy">{eventDetails.userId?.username}</span>
                                            <span className="block text-xs text-gc-muted">{eventDetails.userId?.email}</span>
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-gc-surface text-[10px] font-black text-gc-muted uppercase tracking-widest rounded-md border border-gc-border">
                                                Role: {eventDetails.userId?.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-[10px] font-black text-gc-muted uppercase tracking-widest">Aggregated Risk</span>
                                        <span className={`text-2xl font-black block ${getScoreColorClass(riskProfile?.riskScore)}`}>
                                            {riskProfile?.riskScore} / 100
                                        </span>
                                        <span className="block text-[10px] text-gc-muted font-bold">{riskProfile?.riskLevel}</span>
                                    </div>
                                </div>

                                {/* Event specifics */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gc-surface/50 p-4 rounded-xl border border-gc-border">
                                        <span className="block text-[10px] font-black text-gc-muted uppercase tracking-widest mb-1.5">Triggered Signal</span>
                                        <span className="text-xs font-mono font-bold text-gc-navy">{eventDetails.eventType}</span>
                                    </div>
                                    <div className="bg-gc-surface/50 p-4 rounded-xl border border-gc-border">
                                        <span className="block text-[10px] font-black text-gc-muted uppercase tracking-widest mb-1.5">Telemetry Status</span>
                                        {getStatusBadge(eventDetails.status)}
                                    </div>
                                </div>

                                {/* Device details */}
                                <div className="bg-gc-surface/50 p-4 rounded-xl border border-gc-border mb-6">
                                    <span className="block text-[10px] font-black text-gc-muted uppercase tracking-widest mb-2">Network & Device Telemetry</span>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-gc-muted">
                                        <div><span className="text-gc-muted font-black">IP Address:</span> {eventDetails.metadata?.ipAddress || 'Unknown'}</div>
                                        <div><span className="text-gc-muted font-black">Browser Agent:</span> {eventDetails.metadata?.userAgent || 'Unknown'}</div>
                                        {eventDetails.metadata?.reason && (
                                            <div className="col-span-2 mt-2 pt-2 border-t border-gc-border">
                                                <span className="text-gc-muted font-black">Details:</span> {eventDetails.metadata.reason}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Interface */}
                                <div>
                                    <span className="block text-[10px] font-black text-gc-muted uppercase tracking-widest mb-2">Administrative Action</span>
                                    
                                    {eventDetails.status === 'OPEN' && (
                                        <button
                                            onClick={() => handleUpdateStatus('REVIEWING')}
                                            disabled={submittingAction}
                                            className="w-full mb-4 py-2.5 bg-gc-blue hover:bg-gc-navy disabled:opacity-50 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer"
                                        >
                                            {submittingAction ? 'Processing...' : 'Start Review (Mark REVIEWING)'}
                                        </button>
                                    )}

                                    {['OPEN', 'REVIEWING'].includes(eventDetails.status) && (
                                        <div>
                                            <textarea
                                                placeholder="Write reason description to support this resolution / blocking action..."
                                                value={actionReason}
                                                onChange={e => setActionReason(e.target.value)}
                                                className="w-full gc-input text-xs h-20 mb-4"
                                            />

                                            <div className="grid grid-cols-3 gap-3">
                                                <button
                                                    onClick={() => handleResolve('FALSE_POSITIVE')}
                                                    disabled={submittingAction}
                                                    className="py-2.5 bg-gc-surface hover:bg-gc-border disabled:opacity-50 text-gc-navy text-xs font-black uppercase rounded-xl transition cursor-pointer border border-gc-border"
                                                >
                                                    False Positive
                                                </button>
                                                <button
                                                    onClick={() => handleResolve('RESOLVED')}
                                                    disabled={submittingAction}
                                                    className="py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer"
                                                >
                                                    Resolve Alert
                                                </button>
                                                <button
                                                    onClick={handleBlockUser}
                                                    disabled={submittingAction}
                                                    className="py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer"
                                                >
                                                    Block User
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {['RESOLVED', 'FALSE_POSITIVE', 'BLOCKED'].includes(eventDetails.status) && (
                                        <div className="bg-gc-surface p-4 rounded-xl border border-gc-border text-xs font-medium text-gc-muted">
                                            <div className="mb-1"><span className="text-gc-muted font-black">Reviewed By:</span> {eventDetails.reviewedBy?.username || 'Admin'}</div>
                                            <div className="mb-1"><span className="text-gc-muted font-black">Reviewed At:</span> {new Date(eventDetails.reviewedAt).toLocaleString()}</div>
                                            <div><span className="text-gc-muted font-black">Resolution Reason:</span> {eventDetails.resolutionReason || 'No reason provided'}</div>
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
