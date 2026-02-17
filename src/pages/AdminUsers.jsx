import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdminUsers = () => {
    const { user } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ role: '', status: '', search: '' });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchUsers();
    }, [user, navigate, filters, page]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.admin.getUsers({ ...filters, page });
            setUsers(response.data.users);
            setTotalPages(response.data.totalPages);
        } catch (err) {
            error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async (userId) => {
        if (!confirm('Suspend this user?')) return;
        try {
            await api.admin.suspendUser(userId);
            success('User suspended');
            fetchUsers();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to suspend user');
        }
    };

    const handleActivate = async (userId) => {
        try {
            await api.admin.activateUser(userId);
            success('User activated');
            fetchUsers();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to activate user');
        }
    };

    const handleVerify = async (userId) => {
        try {
            await api.admin.verifyFreelancer(userId);
            success('Freelancer verified');
            fetchUsers();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to verify freelancer');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-white mb-2 italic">User <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Management</span></h1>
                    <p className="text-slate-500 font-medium">Monitor and manage platform users</p>
                </header>

                {/* Filters */}
                <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Search username or email..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                        />
                        <select
                            value={filters.role}
                            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                            className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition-all"
                        >
                            <option value="">All Roles</option>
                            <option value="student">Student</option>
                            <option value="freelancer">Freelancer</option>
                            <option value="admin">Admin</option>
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-purple-500 transition-all"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <button
                            onClick={() => setFilters({ role: '', status: '', search: '' })}
                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-white font-bold transition-all"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500"></div>
                    </div>
                ) : (
                    <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Joined</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {users.map(u => (
                                    <tr key={u._id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-black text-purple-400">
                                                    {u.username[0].toUpperCase()}
                                                </div>
                                                <span className="font-bold text-white">{u.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                                u.role === 'freelancer' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {u.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {u.isActive ? (
                                                    <button
                                                        onClick={() => handleSuspend(u._id)}
                                                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Suspend
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActivate(u._id)}
                                                        className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                                {u.role === 'freelancer' && !u.isVerified && (
                                                    <button
                                                        onClick={() => handleVerify(u._id)}
                                                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Verify
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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

export default AdminUsers;
