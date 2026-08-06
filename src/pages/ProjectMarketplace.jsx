
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
    }, []);

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
        if (num < 2000) return 'text-blue-600';
        return 'text-purple-600';
    };

    const getStatusBadge = (status) => {
        const colors = {
            open: 'bg-green-100 text-green-800',
            in_progress: 'bg-blue-100 text-blue-800',
            completed: 'bg-purple-100 text-purple-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Project Marketplace</h1>
                    <p className="text-gray-600">Discover and bid on exciting projects</p>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="Search projects..."
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        <select
                            name="category"
                            value={filters.category}
                            onChange={handleFilterChange}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            placeholder="Min Budget ($)"
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />

                        <input
                            type="number"
                            name="maxBudget"
                            value={filters.maxBudget}
                            onChange={handleFilterChange}
                            placeholder="Max Budget ($)"
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <ErrorState onRetry={fetchProjects} />
                ) : filteredProjects.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl shadow-sm text-center">
                        <p className="text-gray-500 text-lg">No projects found matching your criteria</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedProjects.map(project => (
                                <div key={project._id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(project.status)}`}>
                                            {project.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{project.title}</h3>
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{project.description}</p>

                                    <div className="mb-4">
                                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                            {project.category}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Budget</p>
                                            <p className={`text-2xl font-bold ${getBudgetColor(project.budget)}`}>
                                                {renderBudget(project.budget)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Bids</p>
                                            <p className="text-2xl font-bold text-gray-700">{project.bidsCount || 0}</p>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-1">Timeline</p>
                                        <p className="text-sm font-semibold">{project.timeline}</p>
                                    </div>

                                    <Link
                                        to={`/projects/${project._id}`}
                                        className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition"
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
                                    className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    ← Previous
                                </button>

                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest px-3">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Stats */}
                {!loading && filteredProjects.length > 0 && (
                    <div className="mt-8 text-center text-gray-600">
                        Showing {filteredProjects.length} of {projects.length} projects
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectMarketplace;
