
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { CardSkeleton } from '../components/SkeletonLoader';
import ErrorState from '../components/ErrorState';

const ProjectMarketplace = () => {
    const { user, logout } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        minBudget: '',
        maxBudget: ''
    });
    const [bookmarkedProjectIds, setBookmarkedProjectIds] = useState(new Set());

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
        fetchProjects();
        if (localStorage.getItem('token')) {
            fetchBookmarks();
        }
    }, []);

    const fetchBookmarks = async () => {
        try {
            const res = await api.favorites.getBookmarks({ limit: 100 });
            setBookmarkedProjectIds(new Set((res.data.projects || []).map(p => p._id)));
        } catch (err) {
            console.error('Failed to fetch bookmarks:', err);
        }
    };

    const toggleBookmark = async (projectId) => {
        if (!localStorage.getItem('token')) {
            error('Please login to bookmark projects.');
            return;
        }
        try {
            const isBookmarked = bookmarkedProjectIds.has(projectId);
            if (isBookmarked) {
                await api.favorites.unbookmarkProject(projectId);
                setBookmarkedProjectIds(prev => {
                    const next = new Set(prev);
                    next.delete(projectId);
                    return next;
                });
                success('Bookmark removed!');
            } else {
                await api.favorites.bookmarkProject(projectId);
                setBookmarkedProjectIds(prev => {
                    const next = new Set(prev);
                    next.add(projectId);
                    return next;
                });
                success('Project bookmarked!');
            }
        } catch (err) {
            error(err.response?.data?.message || 'Action failed.');
        }
    };

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setHasError(false);
            const response = await api.projects.getAll({ status: 'open' });
            // The API returns { projects: [], totalPages, currentPage, total } or directly []
            const projectsData = response.data.projects || (Array.isArray(response.data) ? response.data : []);
            setProjects(projectsData);
        } catch (err) {
            setHasError(true);
            console.error(err);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setCurrentPage(1);
    };

    const getNumericBudget = (budget) => {
        if (typeof budget === 'number') return budget;
        if (typeof budget === 'object' && budget !== null) {
            return typeof budget.max === 'number' ? budget.max : (typeof budget.min === 'number' ? budget.min : 0);
        }
        return 0;
    };

    const renderBudget = (budget) => {
        if (!budget) return '₹0';
        if (typeof budget === 'number') return `₹${budget}`;
        if (typeof budget === 'object' && budget !== null) {
            const min = typeof budget.min === 'number' ? budget.min : 0;
            const max = typeof budget.max === 'number' ? budget.max : min;
            if (min === max) return `₹${min}`;
            return `₹${min} - ₹${max}`;
        }
        return '₹0';
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch = (project.title || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            (project.description || '').toLowerCase().includes(filters.search.toLowerCase());
        const matchesCategory = !filters.category || project.category === filters.category;
        const projectMaxBudget = getNumericBudget(project.budget);
        const matchesMinBudget = !filters.minBudget || projectMaxBudget >= parseInt(filters.minBudget);
        const matchesMaxBudget = !filters.maxBudget || projectMaxBudget <= parseInt(filters.maxBudget);

        return matchesSearch && matchesCategory && matchesMinBudget && matchesMaxBudget;
    });

    const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
    const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getBudgetColor = (budget) => {
        const num = getNumericBudget(budget);
        if (num < 500) return 'text-green-600';
        if (num < 2000) return 'text-gc-blue';
        return 'text-gc-navy';
    };

    const getStatusBadge = (status) => {
        const colors = {
            open: 'gc-badge-success',
            in_progress: 'gc-badge-info',
            completed: 'gc-badge-info',
            cancelled: 'gc-badge-danger'
        };
        return colors[status] || 'bg-gc-surface text-gc-muted';
    };

    return (
        <div className="min-h-screen bg-gc-near">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gc-navy mb-2">Project Marketplace</h1>
                    <p className="text-gc-muted">Discover and bid on exciting projects</p>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 sm:p-6 rounded-gc-xl border border-gc-border shadow-gc mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search projects..."
                            className="gc-input min-h-[44px]"
                        />

                        <select
                            name="category"
                            value={filters.category}
                            onChange={handleFilterChange}
                            className="gc-input min-h-[44px]"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <input
                            type="number"
                            name="minBudget"
                            value={filters.minBudget}
                            onChange={handleFilterChange}
                            placeholder="Min Budget (₹)"
                            className="gc-input min-h-[44px]"
                        />

                        <input
                            type="number"
                            name="maxBudget"
                            value={filters.maxBudget}
                            onChange={handleFilterChange}
                            placeholder="Max Budget (₹)"
                            className="gc-input min-h-[44px]"
                        />
                    </div>
                </div>

                {/* Project Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                ) : hasError ? (
                    <ErrorState
                        title="Failed to Load Projects"
                        message="We encountered an issue fetching the projects. Please verify your connection."
                        onRetry={fetchProjects}
                    />
                ) : filteredProjects.length === 0 ? (
                    <div className="bg-white rounded-gc-xl border border-gc-border shadow-gc p-8 text-center">
                        <p className="text-gc-muted text-lg">No projects found matching your criteria.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedProjects.map(project => (
                                <div key={project._id} className="bg-white rounded-gc-xl border border-gc-border shadow-gc hover:shadow-gc-md transition p-5 sm:p-6 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4 gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                                                {project.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                {localStorage.getItem('token') && (
                                                    <button
                                                        onClick={() => toggleBookmark(project._id)}
                                                        className="text-gc-muted hover:text-gc-blue transition text-base p-1 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                                                        title={bookmarkedProjectIds.has(project._id) ? "Unbookmark" : "Bookmark"}
                                                    >
                                                        {bookmarkedProjectIds.has(project._id) ? '💙' : '🤍'}
                                                    </button>
                                                )}
                                                <span className="text-xs text-gc-muted whitespace-nowrap">
                                                    {new Date(project.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-gc-navy mb-2 line-clamp-2">{project.title}</h3>
                                        <p className="text-gc-muted text-sm mb-4 line-clamp-3">{project.description}</p>

                                        <div className="mb-4">
                                            <span className="inline-block bg-gc-soft text-gc-blue text-xs px-2.5 py-1 rounded-md font-medium">
                                                {project.category}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center mb-4 p-3 bg-gc-surface rounded-gc">
                                            <div>
                                                <p className="text-xs text-gc-muted font-medium">Budget</p>
                                                <p className={`text-xl sm:text-2xl font-bold ${getBudgetColor(project.budget)}`}>
                                                    {renderBudget(project.budget)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gc-muted font-medium">Bids</p>
                                                <p className="text-xl sm:text-2xl font-bold text-gc-slate">{project.bidsCount || 0}</p>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-xs text-gc-muted mb-1">Timeline</p>
                                            <p className="text-sm font-semibold text-gc-navy">{project.timeline}</p>
                                        </div>
                                    </div>

                                    <Link
                                        to={`/projects/${project._id}`}
                                        className="block w-full bg-gc-blue hover:bg-gc-navy text-white text-center py-3 rounded-gc transition font-bold min-h-[44px] flex items-center justify-center"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-12 flex justify-center items-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-5 py-2.5 bg-white border border-gc-border rounded-gc font-bold text-xs text-gc-slate hover:bg-gc-surface disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    ← Previous
                                </button>

                                <span className="text-xs font-black text-gc-muted uppercase tracking-widest px-3">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-5 py-2.5 bg-white border border-gc-border rounded-gc font-bold text-xs text-gc-slate hover:bg-gc-surface disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Stats */}
                {!loading && filteredProjects.length > 0 && (
                    <div className="mt-8 text-center text-gc-muted">
                        Showing {filteredProjects.length} of {projects.length} projects
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectMarketplace;
