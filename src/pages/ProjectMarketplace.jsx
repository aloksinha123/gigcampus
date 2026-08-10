
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
            in_progress: 'gc-badge-warning',
            completed: 'gc-badge-info',
            cancelled: 'gc-badge-danger'
        };
        return colors[status] || 'bg-gc-surface text-gc-muted';
    };

    const getStatusLabel = (status) => {
        const labels = {
            open: 'Open',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };
        return labels[status] || status.replace('_', ' ');
    };

    return (
        <div className="min-h-screen bg-gc-near">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                {/* Page Header */}
                <div className="mb-10 sm:mb-14 max-w-2xl">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gc-navy tracking-tight leading-tight mb-3">
                        Project Marketplace
                    </h1>
                    <p className="text-base sm:text-lg text-gc-muted leading-relaxed">
                        Discover projects, find your next opportunity, and start building.
                    </p>
                </div>

                {/* Search & Filter Panel */}
                <div className="bg-white rounded-2xl border border-gc-border shadow-sm mb-8 sm:mb-10 p-4 sm:p-5">
                    <div className="flex flex-col lg:flex-row gap-3">
                        {/* Search Input - Primary */}
                        <div className="relative flex-1">
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gc-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                                placeholder="Search projects by title or description..."
                                className="w-full pl-10 pr-4 py-3 bg-gc-surface/50 border border-gc-border rounded-xl text-sm text-gc-navy placeholder:text-gc-muted focus:outline-none focus:border-gc-blue focus:ring-2 focus:ring-gc-blue/10 transition-all"
                            />
                        </div>

                        {/* Category Select */}
                        <select
                            name="category"
                            value={filters.category}
                            onChange={handleFilterChange}
                            className="lg:w-52 px-4 py-3 bg-gc-surface/50 border border-gc-border rounded-xl text-sm text-gc-slate focus:outline-none focus:border-gc-blue focus:ring-2 focus:ring-gc-blue/10 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Budget Range */}
                        <div className="flex gap-2">
                            <input
                                type="number"
                                name="minBudget"
                                value={filters.minBudget}
                                onChange={handleFilterChange}
                                placeholder="Min ₹"
                                className="w-full lg:w-28 px-3 py-3 bg-gc-surface/50 border border-gc-border rounded-xl text-sm text-gc-slate placeholder:text-gc-muted focus:outline-none focus:border-gc-blue focus:ring-2 focus:ring-gc-blue/10 transition-all"
                            />
                            <input
                                type="number"
                                name="maxBudget"
                                value={filters.maxBudget}
                                onChange={handleFilterChange}
                                placeholder="Max ₹"
                                className="w-full lg:w-28 px-3 py-3 bg-gc-surface/50 border border-gc-border rounded-xl text-sm text-gc-slate placeholder:text-gc-muted focus:outline-none focus:border-gc-blue focus:ring-2 focus:ring-gc-blue/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
                    <div className="bg-white rounded-2xl border border-gc-border shadow-sm p-12 sm:p-16 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gc-soft rounded-2xl mb-5">
                            <svg className="w-8 h-8 text-gc-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gc-navy mb-2">No projects found</h3>
                        <p className="text-sm text-gc-muted max-w-md mx-auto leading-relaxed">
                            Try adjusting your search or filters to find more opportunities.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                            {paginatedProjects.map(project => (
                                <div
                                    key={project._id}
                                    className="group bg-white rounded-2xl border border-gc-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 sm:p-6 flex flex-col"
                                >
                                    {/* Top Row: Status + Date + Bookmark */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${getStatusBadge(project.status)}`}>
                                            {getStatusLabel(project.status)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {localStorage.getItem('token') && (
                                                <button
                                                    onClick={() => toggleBookmark(project._id)}
                                                    className="p-1.5 rounded-lg hover:bg-gc-surface transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                                                    title={bookmarkedProjectIds.has(project._id) ? "Remove bookmark" : "Bookmark project"}
                                                >
                                                    {bookmarkedProjectIds.has(project._id) ? (
                                                        <svg className="w-5 h-5 text-gc-blue" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5 text-gc-muted group-hover:text-gc-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                            <span className="text-[11px] text-gc-muted tabular-nums">
                                                {new Date(project.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-gc-navy mb-2 line-clamp-2 leading-snug group-hover:text-gc-blue transition-colors duration-200">
                                        {project.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-gc-muted leading-relaxed mb-4 line-clamp-2">
                                        {project.description}
                                    </p>

                                    {/* Category Badge */}
                                    <div className="mb-5">
                                        <span className="inline-flex items-center px-2.5 py-1 bg-gc-soft text-gc-blue text-[11px] font-semibold rounded-lg">
                                            {project.category}
                                        </span>
                                    </div>

                                    {/* Info Row */}
                                    <div className="grid grid-cols-3 gap-3 mb-5 pt-4 border-t border-gc-border/60">
                                        <div>
                                            <p className="text-[10px] font-bold text-gc-muted uppercase tracking-wider mb-0.5">Budget</p>
                                            <p className={`text-sm font-bold tabular-nums ${getBudgetColor(project.budget)}`}>
                                                {renderBudget(project.budget)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gc-muted uppercase tracking-wider mb-0.5">Bids</p>
                                            <p className="text-sm font-bold text-gc-slate tabular-nums">{project.bidsCount || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gc-muted uppercase tracking-wider mb-0.5">Timeline</p>
                                            <p className="text-sm font-bold text-gc-slate truncate">{project.timeline}</p>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <Link
                                        to={`/projects/${project._id}`}
                                        className="mt-auto block w-full text-center py-3 bg-gc-blue hover:bg-gc-navy text-white text-sm font-bold rounded-xl transition-all duration-200 min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gc-blue focus-visible:ring-offset-2"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gc-border rounded-xl text-xs font-bold text-gc-slate hover:bg-gc-surface hover:border-gc-slate/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gc-border transition-all duration-200 min-h-[40px]"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Previous
                                </button>

                                <span className="text-xs font-bold text-gc-muted tabular-nums px-2">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gc-border rounded-xl text-xs font-bold text-gc-slate hover:bg-gc-surface hover:border-gc-slate/30 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gc-border transition-all duration-200 min-h-[40px]"
                                >
                                    Next
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Results Count */}
                {!loading && filteredProjects.length > 0 && (
                    <div className="mt-6 sm:mt-8 text-center">
                        <span className="text-xs font-bold text-gc-muted uppercase tracking-widest">
                            Showing {filteredProjects.length} of {projects.length} projects
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectMarketplace;
