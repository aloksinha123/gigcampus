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
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-white mb-2 italic">Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">Management</span></h1>
                    <p className="text-slate-500 font-medium">Review and moderate platform projects.</p>
                </header>

                {/* Filters */}
                <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Search project title or description..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                        />
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition-all uppercase text-sm font-bold"
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
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-bold transition-all"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Projects List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-500"></div>
                        <p className="mt-4 text-slate-500 uppercase tracking-widest text-xs font-bold animate-pulse">Scanning Database...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="bg-slate-900/50 rounded-3xl p-12 border border-slate-800 text-center">
                        <div className="text-6xl mb-4">📂</div>
                        <h3 className="text-2xl font-black text-white mb-2">No Projects Found</h3>
                        <p className="text-slate-400">Adjust filters to see more results.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {projects.map(project => (
                            <div key={project._id} className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800 hover:border-slate-700 transition-all group">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${project.status === 'open' ? 'bg-green-500/10 text-green-400' :
                                                project.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                                                    project.status === 'disputed' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-slate-700 text-slate-400'
                                                }`}>
                                                {project.status}
                                            </span>
                                            <span className="text-xs font-bold text-slate-500">{new Date(project.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 group-hover:text-purple-400 transition-colors">{project.title}</h3>
                                        <p className="text-slate-400 text-sm line-clamp-2 mb-4">{project.description}</p>

                                        <div className="flex items-center gap-6 text-xs text-slate-500 font-bold uppercase tracking-wide">
                                            <div className="flex items-center gap-2">
                                                <span>👤 Client:</span>
                                                <span className="text-slate-300">{project.client?.username || 'Unknown'}</span>
                                            </div>
                                            {project.freelancer && (
                                                <div className="flex items-center gap-2">
                                                    <span>🔨 Freelancer:</span>
                                                    <span className="text-slate-300">{project.freelancer.username}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span>💰 Budget:</span>
                                                <span className="text-slate-300">₹{project.budget.min} - ₹{project.budget.max}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 justify-center min-w-[140px]">
                                        {project.status === 'open' || project.status === 'cancelled' ? (
                                            <button
                                                onClick={() => handleDelete(project._id)}
                                                className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-red-500/20 hover:border-red-500/50"
                                            >
                                                Delete Project
                                            </button>
                                        ) : (
                                            <button disabled className="w-full px-4 py-3 bg-slate-800 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed border border-slate-800">
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
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 bg-slate-900 rounded-xl font-bold text-white">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all"
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
