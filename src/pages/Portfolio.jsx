import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const Portfolio = () => {
    const { userId } = useParams();
    const { user, logout } = useAuth();
    const { success, error } = useNotification();

    const [portfolios, setPortfolios] = useState([]);
    const [myPortfolio, setMyPortfolio] = useState([]);
    const [targetUser, setTargetUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState(userId ? 'user' : 'browse'); // 'browse', 'my', 'user'
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        tags: '',
        projectUrl: '',
        images: []
    });

    const categories = [
        'Web Development',
        'Mobile Development',
        'UI/UX Design',
        'Data Science',
        'Machine Learning',
        'Content Writing',
        'Digital Marketing',
        'Video Editing',
        'Graphic Design',
        'Other'
    ];

    useEffect(() => {
        if (userId) {
            fetchUserPortfolio();
            if (localStorage.getItem('token') && userId !== user?._id) {
                api.recommendations.trackView({ entityType: 'freelancer', entityId: userId })
                    .catch(err => console.error('Failed to log freelancer view:', err));
            }
        } else {
            fetchPortfolios();
            if (user) {
                fetchMyPortfolio();
            }
        }
    }, [user, userId]);

    const fetchUserPortfolio = async () => {
        try {
            setLoading(true);
            const userRes = await api.users.getOne(userId);
            setTargetUser(userRes.data);
            const response = await api.portfolio.getUserPortfolio(userId);
            const data = Array.isArray(response.data) ? response.data : (response.data?.portfolios || response.data?.data || []);
            setPortfolios(data);
        } catch (err) {
            error('Failed to load portfolio details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPortfolios = async () => {
        try {
            setLoading(true);
            const response = await api.portfolio.getAll();
            const data = Array.isArray(response.data) ? response.data : (response.data?.portfolios || response.data?.data || []);
            setPortfolios(data);
        } catch (err) {
            error('Failed to load portfolios');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyPortfolio = async () => {
        try {
            const response = await api.portfolio.getMy();
            const data = Array.isArray(response.data) ? response.data : (response.data?.portfolios || response.data?.data || []);
            setMyPortfolio(data);
        } catch (err) {
            console.error('Failed to load my portfolio:', err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const portfolioData = {
                ...formData,
                tags: formData.tags.split(',').map(tag => tag.trim())
            };
            await api.portfolio.create(portfolioData);
            success('Portfolio item added successfully!');
            setShowAddModal(false);
            setFormData({
                title: '',
                description: '',
                category: '',
                tags: '',
                projectUrl: '',
                images: []
            });
            fetchMyPortfolio();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to add portfolio item');
        }
    };

    const handleLike = async (id) => {
        if (!user) {
            error('Please login to like portfolios');
            return;
        }
        try {
            await api.portfolio.like(id);
            fetchPortfolios();
        } catch (err) {
            error('Failed to like portfolio');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this portfolio item?')) {
            try {
                await api.portfolio.delete(id);
                success('Portfolio item deleted');
                fetchMyPortfolio();
            } catch (err) {
                error('Failed to delete portfolio item');
            }
        }
    };

    const rawPortfolios = viewMode === 'my' ? myPortfolio : portfolios;
    const displayPortfolios = Array.isArray(rawPortfolios) ? rawPortfolios : [];

    return (
        <div className="min-h-screen bg-gc-near">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-gc-navy mb-2">
                            {userId && targetUser ? `@${targetUser.username}'s Showcase` : 'Portfolio Showcase'}
                        </h1>
                        <p className="text-gc-muted">
                            {userId && targetUser ? `Discover amazing work from @${targetUser.username}` : 'Discover amazing work from talented freelancers'}
                        </p>
                    </div>
                    {user && !userId && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-gc-blue text-white px-6 py-3 rounded-lg hover:bg-gc-navy transition shadow-lg"
                        >
                            + Add Portfolio Item
                        </button>
                    )}
                </div>

                {/* View Toggle */}
                {user && !userId && (
                    <div className="mb-6 flex gap-2">
                        <button
                            onClick={() => setViewMode('browse')}
                            className={`px-6 py-2 rounded-lg transition ${viewMode === 'browse'
                                ? 'bg-gc-blue text-white'
                                : 'bg-white text-gc-muted hover:bg-gc-surface'
                                }`}
                        >
                            Browse All
                        </button>
                        <button
                            onClick={() => setViewMode('my')}
                            className={`px-6 py-2 rounded-lg transition ${viewMode === 'my'
                                ? 'bg-gc-blue text-white'
                                : 'bg-white text-gc-muted hover:bg-gc-surface'
                                }`}
                        >
                            My Portfolio ({myPortfolio.length})
                        </button>
                    </div>
                )}

                {/* Portfolio Grid */}
                {loading ? (
                    <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gc-blue"></div>
                        <p className="mt-4 text-gc-muted">Loading portfolios...</p>
                    </div>
                ) : displayPortfolios.length === 0 ? (
                        <div className="bg-white p-12 rounded-xl shadow-sm text-center">
                        <div className="text-6xl mb-4">🎨</div>
                        <h3 className="text-xl font-bold text-gc-navy mb-2">
                            {viewMode === 'my' ? 'No portfolio items yet' : 'No portfolios found'}
                        </h3>
                        <p className="text-gc-muted mb-4">
                            {viewMode === 'my'
                                ? 'Start showcasing your work by adding your first portfolio item'
                                : 'Check back later for amazing work from freelancers'}
                        </p>
                        {user && viewMode === 'my' && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="bg-gc-blue text-white px-6 py-3 rounded-lg hover:bg-gc-navy"
                            >
                                Add Your First Item
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayPortfolios.map(item => (
                                <div key={item._id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition overflow-hidden border border-gc-border">
                                {/* Image Placeholder */}
                                <div className="h-48 bg-gc-soft flex items-center justify-center">
                                    <span className="text-6xl">🎨</span>
                                </div>

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="inline-block bg-gc-soft text-gc-blue text-xs px-2 py-1 rounded">
                                            {item.category}
                                        </span>
                                        {item.featured && (
                                            <span className="text-yellow-500 text-xl">⭐</span>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{item.title}</h3>
                                    <p className="text-gc-muted text-sm mb-4 line-clamp-3">{item.description}</p>

                                    {/* Tags */}
                                    {item.tags && item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {item.tags.slice(0, 3).map((tag, index) => (
                                                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleLike(item._id)}
                                                className="flex items-center gap-1 hover:text-gc-blue transition"
                                            >
                                                ❤️ {item.likes?.length || 0}
                                            </button>
                                            <span className="flex items-center gap-1">
                                                👁️ {item.views || 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {item.projectUrl && (
                                            <a
                                                href={item.projectUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-gc-blue text-white text-center py-2 rounded-lg hover:bg-gc-navy transition text-sm"
                                            >
                                                View Project
                                            </a>
                                        )}
                                        {viewMode === 'my' && (
                                            <button
                                                onClick={() => handleDelete(item._id)}
                                                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Portfolio Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                        <h2 className="text-2xl font-bold mb-6">Add Portfolio Item</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gc-blue"
                                    placeholder="My Awesome Project"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows="4"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gc-blue"
                                    placeholder="Describe your project..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Category *</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gc-blue"
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={formData.tags}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gc-blue"
                                    placeholder="react, nodejs, mongodb"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Project URL</label>
                                <input
                                    type="url"
                                    name="projectUrl"
                                    value={formData.projectUrl}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gc-blue"
                                    placeholder="https://example.com"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gc-blue text-white py-3 rounded-lg hover:bg-gc-navy transition"
                                >
                                    Add Portfolio Item
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
