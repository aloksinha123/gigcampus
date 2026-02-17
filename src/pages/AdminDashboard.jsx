import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { error } = useNotification();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    totalRevenue: 0,
    disputes: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getStats();
      setStats(response.data.stats);
      setRecentUsers(response.data.recentUsers);
      setRecentProjects(response.data.recentProjects);
    } catch (err) {
      error('Failed to load administrative data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
          <p className="text-purple-400 font-bold tracking-widest animate-pulse">INITIATING SECURE SESSION...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      {/* Admin Header */}
      <Navbar variant="dark" />

      <div className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-white mb-2 italic">Platform <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 text-normal">Observability</span></h1>
          <p className="text-slate-500 font-medium">Real-time oversight of the campus freelance ecosystem.</p>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Entities', value: stats.totalUsers, icon: '👥', color: 'from-blue-600/20 to-blue-900/10' },
            { label: 'Network Load', value: stats.activeProjects, icon: '⚡', color: 'from-green-600/20 to-green-900/10' },
            { label: 'System Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: '💎', color: 'from-purple-600/20 to-purple-900/10' },
            { label: 'Critical Errors', value: stats.disputes, icon: '⚠️', color: 'from-red-600/20 to-red-900/10' },
          ].map((m, i) => (
            <div key={i} className={`bg-slate-900/50 rounded-3xl p-8 border border-slate-800 hover:border-slate-700 transition-all group overflow-hidden relative`}>
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${m.color} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
              <div className="relative z-10">
                <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">{m.icon}</span>
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{m.label}</h3>
                <p className="text-3xl font-black text-white">{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Influx */}
          <div className="bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Recent Onboarding
              </h2>
              <button className="text-[10px] font-black text-slate-500 hover:text-blue-400 transition-colors tracking-widest uppercase">View All Logs</button>
            </div>
            <div className="space-y-4">
              {recentUsers.map(u => (
                <div key={u._id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-black text-blue-400">
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{u.username}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{u.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Project Feed */}
          <div className="bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                Global Listing Feed
              </h2>
              <button className="text-[10px] font-black text-slate-500 hover:text-purple-400 transition-colors tracking-widest uppercase">Inspect All</button>
            </div>
            <div className="space-y-4">
              {recentProjects.map(p => (
                <div key={p._id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1">
                    <p className="font-black text-white text-sm truncate max-w-[200px]">{p.title}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">By {p.client?.username || 'Redacted'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${p.status === 'open' ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'}`}>
                      {p.status}
                    </span>
                    <p className="text-[10px] font-bold text-slate-600 mt-1">{new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Controls */}
        <div className="mt-12 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-[2.5rem] p-12 border border-slate-700/30 text-center">
          <h2 className="text-3xl font-black text-white mb-4">Core Management Tools</h2>
          <p className="text-slate-400 font-medium mb-8 max-w-xl mx-auto">Access higher-level protocols for user suspension, dispute resolution, and economic adjustment.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/admin/users" className="px-8 py-4 bg-slate-800 font-black text-sm rounded-2xl border border-slate-700 hover:border-purple-500 transition-all hover:bg-slate-700 hover:text-white">Audit Users</Link>
            <Link to="/admin/projects" className="px-8 py-4 bg-slate-800 font-black text-sm rounded-2xl border border-slate-700 hover:border-green-500 transition-all hover:bg-slate-700 hover:text-white">Review Projects</Link>
            <Link to="/admin/disputes" className="px-8 py-4 bg-slate-800 font-black text-sm rounded-2xl border border-slate-700 hover:border-red-500 transition-all hover:bg-slate-700 hover:text-white">Pending Disputes</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;