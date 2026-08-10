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
        <div className="min-h-screen bg-gc-near">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gc-navy mb-2 italic">
                            Reported Reviews
                        </h1>
                        <p className="text-gc-slate font-medium">Evaluate complaints, spam, and harassment reports from platform users</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/admin" className="px-5 py-3 bg-white border border-gc-border text-gc-navy font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-gc-surface transition">
                            Analytics
                        </Link>
                        <Link to="/admin/reviews" className="px-5 py-3 bg-white border border-gc-border text-gc-navy font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-gc-surface transition">
                            All Reviews
                        </Link>
                    </div>
                </header>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gc-blue mx-auto"></div>
                        <p className="text-gc-muted mt-4 font-bold text-sm">Loading complaints queue...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-gc-xl border-2 border-dashed border-gc-border">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gc-surface rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gc-navy mb-1 uppercase tracking-wider mt-3">All Clear</h3>
                        <p className="text-gc-muted font-medium text-xs">There are no reported reviews pending moderation.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {reviews.map((rev) => (
                            <div key={rev._id} className="bg-white border border-gc-border rounded-3xl overflow-hidden shadow-gc">
                                {/* Details Grid */}
                                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-gc-border">
                                    {/* Review info */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-gc-blue uppercase tracking-wider block">Review Content</span>
                                        <div>
                                            <span className="text-xs font-bold text-gc-muted block mb-1">Project: {rev.project?.title || 'Unknown'}</span>
                                            {renderStars(rev.rating)}
                                        </div>
                                        <p className="text-gc-slate text-xs italic leading-relaxed">"{rev.review}"</p>
                                        <div className="text-gc-muted text-[10px] font-semibold">
                                            By: @{rev.reviewer?.username} | Recipient: @{rev.reviewee?.username}
                                        </div>
                                    </div>

                                    {/* Reports logs */}
                                    <div className="lg:col-span-2 space-y-3">
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-wider block">Reports Received ({rev.reports?.length || 0})</span>
                                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                            {rev.reports?.map((rep, idx) => (
                                                <div key={idx} className="p-3 bg-gc-surface rounded-2xl border border-gc-border text-xs flex justify-between items-start gap-4">
                                                    <div>
                                                        <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md font-bold text-[9px] uppercase tracking-wider inline-block mb-1.5">
                                                            {rep.reason}
                                                        </span>
                                                        <p className="text-gc-muted italic">
                                                            {rep.description ? `"${rep.description}"` : 'No description provided.'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right text-[10px] text-gc-muted whitespace-nowrap">
                                                        <span>@{rep.reporter?.username || 'user'}</span>
                                                        <span className="block text-[9px] mt-0.5">{new Date(rep.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Bar */}
                                <div className="px-6 py-4 bg-gc-surface/50 flex justify-between items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gc-muted font-bold uppercase tracking-wider">Status:</span>
                                        {rev.isHidden ? (
                                            <span className="px-2.5 py-0.5 bg-red-50 border border-red-200 text-red-700 text-[10px] font-black rounded-lg">HIDDEN</span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black rounded-lg">VISIBLE</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDismissReports(rev._id)}
                                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition active:scale-95"
                                        >
                                            Dismiss Reports
                                        </button>
                                        <button
                                            onClick={() => handleToggleHide(rev._id)}
                                            className={`px-4 py-2 rounded-xl font-bold text-xs transition active:scale-95 border ${
                                                rev.isHidden 
                                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                                                    : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                            }`}
                                        >
                                            {rev.isHidden ? 'Unhide Review' : 'Hide Review'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rev._id)}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs transition active:scale-95 shadow-md"
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
