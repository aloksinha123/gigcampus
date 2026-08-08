import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdminReportedReviews = () => {
    const { user } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchReportedReviews();
    }, [user, navigate]);

    const fetchReportedReviews = async () => {
        try {
            setLoading(true);
            const response = await api.reviews.getReported();
            setReviews(response.data || []);
        } catch (err) {
            error('Failed to load reported reviews queue.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDismissReports = async (id) => {
        if (!confirm('Are you sure you want to dismiss all reports for this review?')) return;
        try {
            await api.reviews.dismissReports(id);
            success('Reports dismissed successfully');
            fetchReportedReviews();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to dismiss reports');
        }
    };

    const handleToggleHide = async (id) => {
        try {
            const res = await api.reviews.toggleHide(id);
            success(res.data.message || 'Visibility updated');
            fetchReportedReviews();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update visibility');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to permanently delete this review? This action is irreversible.')) return;
        try {
            await api.reviews.delete(id);
            success('Review deleted permanently');
            fetchReportedReviews();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to delete review');
        }
    };

    const renderStars = (score) => {
        return (
            <div className="flex space-x-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-xs">
                        {star <= score ? '★' : '☆'}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 italic">
                            Reported <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-400 font-black">Reviews</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Evaluate complaints, spam, and harassment reports from platform users</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/admin" className="px-5 py-3 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-700 transition">
                            Analytics
                        </Link>
                        <Link to="/admin/reviews" className="px-5 py-3 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-700 transition">
                            All Reviews
                        </Link>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rose-500 mx-auto"></div>
                        <p className="text-slate-500 mt-4 font-bold text-sm">Loading complaints queue...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-20 bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-800">
                        <span className="text-5xl mb-4 inline-block">🛡️</span>
                        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider mt-3">All Clear</h3>
                        <p className="text-slate-500 font-medium text-xs">There are no reported reviews pending moderation.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {reviews.map((rev) => (
                            <div key={rev._id} className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                                {/* Details Grid */}
                                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-slate-800/60">
                                    {/* Review info */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider block">Review Content</span>
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 block mb-1">Project: {rev.project?.title || 'Unknown'}</span>
                                            {renderStars(rev.rating)}
                                        </div>
                                        <p className="text-slate-300 text-xs italic leading-relaxed">"{rev.review}"</p>
                                        <div className="text-slate-500 text-[10px] font-semibold">
                                            By: @{rev.reviewer?.username} | Recipient: @{rev.reviewee?.username}
                                        </div>
                                    </div>

                                    {/* Reports logs */}
                                    <div className="lg:col-span-2 space-y-3">
                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider block">Reports Received ({rev.reports?.length || 0})</span>
                                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                            {rev.reports?.map((rep, idx) => (
                                                <div key={idx} className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/40 text-xs flex justify-between items-start gap-4">
                                                    <div>
                                                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/25 rounded-md font-bold text-[9px] uppercase tracking-wider inline-block mb-1.5">
                                                            {rep.reason}
                                                        </span>
                                                        <p className="text-slate-400 italic">
                                                            {rep.description ? `"${rep.description}"` : 'No description provided.'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right text-[10px] text-slate-500 whitespace-nowrap">
                                                        <span>@{rep.reporter?.username || 'user'}</span>
                                                        <span className="block text-[9px] mt-0.5">{new Date(rep.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Bar */}
                                <div className="px-6 py-4 bg-slate-950/20 flex justify-between items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status:</span>
                                        {rev.isHidden ? (
                                            <span className="px-2.5 py-0.5 bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[10px] font-black rounded-lg">HIDDEN</span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg">VISIBLE</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDismissReports(rev._id)}
                                            className="px-4 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-600/20 rounded-xl font-bold text-xs transition active:scale-95"
                                        >
                                            Dismiss Reports
                                        </button>
                                        <button
                                            onClick={() => handleToggleHide(rev._id)}
                                            className={`px-4 py-2 rounded-xl font-bold text-xs transition active:scale-95 border ${
                                                rev.isHidden 
                                                    ? 'bg-amber-600/15 hover:bg-amber-600/25 text-amber-400 border-amber-600/20' 
                                                    : 'bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border-rose-600/20'
                                            }`}
                                        >
                                            {rev.isHidden ? 'Unhide Review' : 'Hide Review'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rev._id)}
                                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition active:scale-95 shadow-md"
                                        >
                                            Delete Review
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReportedReviews;
