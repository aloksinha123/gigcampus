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
        <div className="min-h-screen bg-gc-near">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gc-navy mb-2 italic">
                            Review Moderation
                        </h1>
                        <p className="text-gc-slate font-medium">Monitor, hide, or remove abusive reviews</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/admin" className="px-5 py-3 bg-white border border-gc-border text-gc-navy font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-gc-surface transition">
                            Analytics
                        </Link>
                        <Link to="/admin/users" className="px-5 py-3 bg-white border border-gc-border text-gc-navy font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-gc-surface transition">
                            Users
                        </Link>
                    </div>
                </header>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="bg-white rounded-gc-xl p-6 border border-gc-border shadow-gc mb-8 flex gap-4">
                    <input
                        type="text"
                        placeholder="Search review content..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 gc-input text-sm"
                    />
                    <button type="submit" className="px-6 py-3 bg-gc-blue hover:bg-gc-navy text-white font-bold rounded-2xl transition text-sm">
                        Search
                    </button>
                </form>

                {/* Reviews List */}
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gc-blue mx-auto"></div>
                        <p className="text-gc-muted mt-4 font-bold text-sm">Loading reviews...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-gc-xl border border-dashed border-gc-border">
                        <p className="text-gc-muted font-medium">No reviews found</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="overflow-x-auto bg-white rounded-gc-xl border border-gc-border shadow-gc">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b border-gc-border text-gc-muted font-bold uppercase text-xs">
                                        <th className="p-6">Project / Details</th>
                                        <th className="p-6">Reviewer</th>
                                        <th className="p-6">Reviewee</th>
                                        <th className="p-6">Rating</th>
                                        <th className="p-6">Status</th>
                                        <th className="p-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gc-border/50">
                                    {reviews.map((rev) => (
                                        <tr key={rev._id} className="hover:bg-gc-surface/50 transition-colors">
                                            <td className="p-6 max-w-sm">
                                                <span className="font-bold text-gc-navy block text-sm mb-1">{rev.project?.title || 'Unknown Project'}</span>
                                                <p className="text-xs text-gc-muted line-clamp-3 italic">"{rev.review}"</p>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-semibold text-gc-slate block text-xs">@{rev.reviewer?.username || 'Anonymous'}</span>
                                                <span className="text-[10px] uppercase font-bold text-gc-blue">{rev.reviewer?.role}</span>
                                            </td>
                                            <td className="p-6">
                                                <span className="font-semibold text-gc-slate block text-xs">@{rev.reviewee?.username || 'Anonymous'}</span>
                                                <span className="text-[10px] uppercase font-bold text-gc-blue">{rev.reviewee?.role}</span>
                                            </td>
                                            <td className="p-6">
                                                {renderStars(rev.rating)}
                                                <span className="text-[10px] text-gc-muted block mt-1">
                                                    C:{rev.communicationRating} Q:{rev.qualityRating} T:{rev.deadlineRating} P:{rev.professionalismRating}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                {rev.isHidden ? (
                                                    <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-bold">HIDDEN</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">VISIBLE</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right space-x-2">
                                                <button
                                                    onClick={() => handleToggleHide(rev._id)}
                                                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                                                        rev.isHidden 
                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' 
                                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                                    }`}
                                                >
                                                    {rev.isHidden ? 'Unhide' : 'Hide'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rev._id)}
                                                    className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl font-bold text-xs transition active:scale-95"
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
                                    className="px-4 py-2 bg-white border border-gc-border text-gc-navy font-bold rounded-xl disabled:opacity-50 hover:bg-gc-surface transition text-xs"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-gc-muted font-bold">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 bg-white border border-gc-border text-gc-navy font-bold rounded-xl disabled:opacity-50 hover:bg-gc-surface transition text-xs"
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
