import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdminProjects = () => {
    const { user } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({ status: '', search: '' });

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchProjects();
    }, [user, navigate, filters, page]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await api.admin.getProjects({ ...filters, page });
            setProjects(response.data.projects);
            setTotalPages(response.data.totalPages);
        } catch (err) {
            error('Failed to load projects');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (projectId) => {
        if (!confirm('Are you certain you want to delete this project? This action cannot be undone.')) return;

        try {
            await api.admin.deleteProject(projectId);
            success('Project deleted successfully');
            fetchProjects();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to delete project');
        }
    };

    return (
        <div className="min-h-screen bg-gc-near">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-gc-navy mb-2 italic">Project Management</h1>
                    <p className="text-gc-slate font-medium">Review and moderate platform projects.</p>
                </header>

                {/* Filters */}
                <div className="bg-white rounded-gc-xl p-6 border border-gc-border shadow-gc mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Search project title or description..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="gc-input"
                        />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="gc-input uppercase text-sm font-bold"
                        >
                            <option value="">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="disputed">Disputed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                            onClick={() => setFilters({ status: '', search: '' })}
                            className="px-6 py-3 bg-gc-surface hover:bg-gc-border border border-gc-border rounded-gc-xl text-gc-navy font-bold transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Projects List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-gc-blue"></div>
                        <p className="mt-4 text-gc-muted uppercase tracking-widest text-xs font-bold animate-pulse">Scanning Database...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="bg-white rounded-gc-xl p-12 border border-gc-border shadow-gc text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gc-surface rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-gc-navy mb-2">No Projects Found</h3>
                        <p className="text-gc-muted">Adjust filters to see more results.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {projects.map(project => (
                            <div key={project._id} className="bg-white rounded-gc-xl p-6 border border-gc-border hover:border-gc-blue/30 transition-all group shadow-gc">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${project.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                                                project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                    project.status === 'disputed' ? 'bg-red-100 text-red-700' :
                                                        'bg-gc-surface text-gc-muted'
                                                }`}>
                                                {project.status}
                                            </span>
                                            <span className="text-xs font-bold text-gc-muted">{new Date(project.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-gc-navy mb-2 group-hover:text-gc-blue transition-colors">{project.title}</h3>
                                        <p className="text-gc-slate text-sm line-clamp-2 mb-4">{project.description}</p>

                                        <div className="flex items-center gap-6 text-xs text-gc-muted font-bold uppercase tracking-wide">
                                            <div className="flex items-center gap-2">
                                                <span>Client:</span>
                                                <span className="text-gc-slate">{project.client?.username || 'Unknown'}</span>
                                            </div>
                                            {project.freelancer && (
                                                <div className="flex items-center gap-2">
                                                    <span>Freelancer:</span>
                                                    <span className="text-gc-slate">{project.freelancer.username}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span>Budget:</span>
                                                <span className="text-gc-slate">₹{project.budget.min} - ₹{project.budget.max}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 justify-center min-w-[140px]">
                                        {project.status === 'open' || project.status === 'cancelled' ? (
                                            <button
                                                onClick={() => handleDelete(project._id)}
                                                className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                            >
                                                Delete Project
                                            </button>
                                        ) : (
                                            <button disabled className="w-full px-4 py-3 bg-gc-surface text-gc-muted rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed border border-gc-border">
                                                Cannot Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-white hover:bg-gc-surface disabled:opacity-50 disabled:cursor-not-allowed border border-gc-border rounded-xl font-bold text-gc-navy transition-all"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 bg-gc-surface rounded-xl font-bold text-gc-navy">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-white hover:bg-gc-surface disabled:opacity-50 disabled:cursor-not-allowed border border-gc-border rounded-xl font-bold text-gc-navy transition-all"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProjects;
