import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdminReviews = () => {
    const { user } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchReviews();
    }, [user, navigate, page]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const response = await api.reviews.getAll({ page, limit: 10, search });
            setReviews(response.data.reviews || []);
            setTotalPages(response.data.totalPages || 1);
        } catch (err) {
            error('Failed to load reviews');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchReviews();
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this review permanently? This will update the user\'s average score.')) return;
        try {
            await api.reviews.delete(id);
            success('Review deleted successfully');
            fetchReviews();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to delete review');
        }
    };

    const handleToggleHide = async (id) => {
        try {
            const res = await api.reviews.toggleHide(id);
            success(res.data.message || 'Visibility toggled');
            fetchReviews();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to toggle visibility');
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
                            Review <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Moderation</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Monitor, hide, or remove abusive reviews</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/admin" className="px-5 py-3 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-700 transition">
                            Analytics
                        </Link>
                        <Link to="/admin/users" className="px-5 py-3 bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-700 transition">
                            Users
                        </Link>
                    </div>
                </header>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 mb-8 flex gap-4">
                    <input
                        type="text"
                        placeholder="Search review content..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-all text-sm"
                    />
                    <button type="submit" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition text-sm">
                        Search
                    </button>
                </form>

                {/* Reviews List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="text-slate-500 mt-4 font-bold text-sm">Loading reviews...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                        <p className="text-slate-500 font-medium">No reviews found</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="overflow-x-auto bg-slate-900/30 rounded-3xl border border-slate-800">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-xs">
                                        <th className="p-6">Project / Details</th>
                                        <th className="p-6">Reviewer</th>
                                        <th className="p-6">Reviewee</th>
                                        <th className="p-6">Rating</th>
                                        <th className="p-6">Status</th>
                                        <th className="p-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {reviews.map((rev) => (
                                        <tr key={rev._id} className="hover:bg-slate-900/10 transition-colors">
                                            <td className="p-6 max-w-sm">
                                                <span className="font-bold text-white block text-sm mb-1">{rev.project?.title || 'Unknown Project'}</span>
                                                <p className="text-xs text-slate-400 line-clamp-3 italic">"{rev.review}"</p>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-semibold text-slate-200 block text-xs">@{rev.reviewer?.username || 'Anonymous'}</span>
                                                <span className="text-[10px] uppercase font-bold text-purple-400">{rev.reviewer?.role}</span>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-semibold text-slate-200 block text-xs">@{rev.reviewee?.username || 'Anonymous'}</span>
                                                <span className="text-[10px] uppercase font-bold text-blue-400">{rev.reviewee?.role}</span>
                                            </td>
                                            <td className="p-6">
                                                {renderStars(rev.rating)}
                                                <span className="text-[10px] text-slate-500 block mt-1">
                                                    C:{rev.communicationRating} Q:{rev.qualityRating} T:{rev.deadlineRating} P:{rev.professionalismRating}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                {rev.isHidden ? (
                                                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md text-[10px] font-bold">HIDDEN</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-bold">VISIBLE</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right space-x-2">
                                                <button
                                                    onClick={() => handleToggleHide(rev._id)}
                                                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                                                        rev.isHidden 
                                                            ? 'bg-emerald-600/25 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-600/20' 
                                                            : 'bg-amber-600/25 text-amber-400 hover:bg-amber-600/40 border border-amber-600/20'
                                                    }`}
                                                >
                                                    {rev.isHidden ? 'Unhide' : 'Hide'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rev._id)}
                                                    className="px-3 py-1.5 bg-rose-600/25 text-rose-400 hover:bg-rose-600/40 border border-rose-600/20 rounded-xl font-bold text-xs transition active:scale-95"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-8">
                                <button
                                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-slate-700 transition text-xs"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-slate-400 font-bold">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-slate-700 transition text-xs"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReviews;
