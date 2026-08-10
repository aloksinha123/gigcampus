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
        <div className="min-h-screen bg-gc-near">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-gc-navy mb-2 italic">User Management</h1>
                    <p className="text-gc-slate font-medium">Monitor and manage platform users</p>
                </header>

                {/* Filters */}
                <div className="bg-white rounded-gc-xl p-6 border border-gc-border shadow-gc mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Search username or email..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="gc-input"
                        />
                        <select
                            value={filters.role}
                            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                            className="gc-input"
                        >
                            <option value="">All Roles</option>
                            <option value="student">Student</option>
                            <option value="freelancer">Freelancer</option>
                            <option value="admin">Admin</option>
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="gc-input"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <button
                            onClick={() => setFilters({ role: '', status: '', search: '' })}
                            className="px-6 py-3 bg-gc-surface hover:bg-gc-border border border-gc-border rounded-gc-xl text-gc-navy font-bold transition-all"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-gc-blue"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-gc-xl border border-gc-border overflow-hidden shadow-gc">
                        <div className="overflow-x-auto custom-scrollbar-x w-full">
                            <table className="w-full min-w-[640px]">
                                <thead className="bg-gc-surface">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gc-muted uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gc-muted uppercase tracking-widest">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gc-muted uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gc-muted uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gc-muted uppercase tracking-widest">Joined</th>
                                    <th className="px-6 py-4 text-left text-xs font-black text-gc-muted uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gc-border">
                                {users.map(u => (
                                    <tr key={u._id} className="hover:bg-gc-surface/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gc-surface rounded-full flex items-center justify-center font-black text-gc-blue">
                                                    {u.username[0].toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gc-navy">{u.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gc-muted">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.role === 'admin' ? 'bg-gc-navy text-white' :
                                                u.role === 'freelancer' ? 'bg-gc-soft text-gc-blue' :
                                                    'bg-gc-soft text-gc-slate'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {u.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gc-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {u.isActive ? (
                                                    <button
                                                        onClick={() => handleSuspend(u._id)}
                                                        className="px-3 py-1 bg-red-500 text-white hover:bg-red-600 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Suspend
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleActivate(u._id)}
                                                        className="px-3 py-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Activate
                                                    </button>
                                                )}
                                                {u.role === 'freelancer' && !u.isVerified && (
                                                    <button
                                                        onClick={() => handleVerify(u._id)}
                                                        className="px-3 py-1 bg-gc-blue text-white hover:bg-gc-navy rounded-lg text-xs font-bold transition-all"
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

export default AdminUsers;
