import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import DashboardRecommendationWidget from '../components/DashboardRecommendationWidget';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { error } = useNotification();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    pendingBids: 0,
    openProjects: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all projects
      const projectsRes = await api.projects.getMy();
      const projects = Array.isArray(projectsRes.data) ? projectsRes.data : (projectsRes.data?.projects || []);

      // Fetch all payments
      const paymentsRes = await api.payments.getMy();
      const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : (paymentsRes.data?.payments || []);

      // Calculate statistics
      const totalProjects = projects.length;
      const activeProjects = projects.filter(p => p.status === 'in_progress').length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const openProjects = projects.filter(p => p.status === 'open').length;
      const totalSpent = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

      // Count pending bids across all projects
      let pendingBidsCount = 0;
      for (const project of projects) {
        try {
          const bidsRes = await api.bids.getProjectBids(project._id);
          const pendingBids = bidsRes.data.filter(bid => bid.status === 'pending');
          pendingBidsCount += pendingBids.length;
        } catch (err) {
          // Silently handle if bids endpoint fails
        }
      }

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        totalSpent,
        pendingBids: pendingBidsCount,
        openProjects
      });

      setRecentProjects(projects.slice(0, 5));
      setRecentPayments(payments.slice(0, 5));

    } catch (err) {
      error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      open: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      disputed: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      escrowed: 'bg-indigo-100 text-indigo-800',
      released: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800',
      disputed: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Assembling your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50">
      {/* Navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tight">
              Welcome, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{user?.username}</span>! 👋
            </h1>
            <p className="text-lg text-gray-500 font-medium">Manager your projects and talent from one central hub.</p>
          </div>
          <Link
            to="/my-projects"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-1 transition-all flex items-center gap-2 w-fit"
          >
            <span className="text-xl">➕</span> Post a New Project
          </Link>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">📁</span>
              <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Global</span>
            </div>
            <h3 className="text-gray-500 font-bold text-sm uppercase mb-1">Total Projects</h3>
            <p className="text-4xl font-black text-gray-900">{stats.totalProjects}</p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-100 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">⚡</span>
              <span className="text-xs font-black text-green-500 uppercase tracking-widest">Active</span>
            </div>
            <h3 className="text-gray-500 font-bold text-sm uppercase mb-1">In Progress</h3>
            <p className="text-4xl font-black text-green-600">{stats.activeProjects}</p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-100 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">💎</span>
              <span className="text-xs font-black text-purple-500 uppercase tracking-widest">Done</span>
            </div>
            <h3 className="text-gray-500 font-bold text-sm uppercase mb-1">Completed</h3>
            <p className="text-4xl font-black text-purple-600">{stats.completedProjects}</p>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-yellow-100 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">💰</span>
              <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">Balance</span>
            </div>
            <h3 className="text-gray-500 font-bold text-sm uppercase mb-1">Total Invested</h3>
            <p className="text-4xl font-black text-yellow-500">${stats.totalSpent.toFixed(2)}</p>
          </div>
        </div>

        {/* Important Alerts Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-orange-400 to-rose-500 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-rose-200">
            <div className="relative z-10">
              <h3 className="text-rose-100 font-bold text-sm uppercase tracking-widest mb-2">Needs Attention</h3>
              <p className="text-5xl font-black mb-4">{stats.pendingBids} <span className="text-2xl font-medium">Pending Bids</span></p>
              <p className="text-rose-100 mb-6 font-medium">Freelancers are waiting for your response. Review their proposals now.</p>
              <Link to="/my-projects" className="bg-white text-rose-600 px-6 py-3 rounded-2xl font-black hover:bg-rose-50 transition-colors inline-block">
                Review Proposals →
              </Link>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[180px] opacity-10 pointer-events-none">📋</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-200">
            <div className="relative z-10">
              <h3 className="text-blue-100 font-bold text-sm uppercase tracking-widest mb-2">Bidding Active</h3>
              <p className="text-5xl font-black mb-4">{stats.openProjects} <span className="text-2xl font-medium">Open Ads</span></p>
              <p className="text-blue-100 mb-6 font-medium">Your projects are currently visible in the marketplace and receiving traffic.</p>
              <Link to="/projects" className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-6 py-3 rounded-2xl font-black hover:bg-white/30 transition-colors inline-block">
                Optimize Listings →
              </Link>
            </div>
            <div className="absolute -right-10 -bottom-10 text-[180px] opacity-10 pointer-events-none">📢</div>
          </div>
        </div>

        {/* Personalized Recommendations & Favorites Widget */}
        <div className="mb-12">
          <DashboardRecommendationWidget user={user} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Recent Projects List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900">Active Listings</h2>
                <Link to="/my-projects" className="text-blue-600 font-bold hover:text-blue-700 underline decoration-2 underline-offset-4">
                  Browse All
                </Link>
              </div>

              {recentProjects.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Your slate is clean</h3>
                  <p className="text-gray-500 mb-6">You haven't posted any projects yet. Ready to start?</p>
                  <Link to="/my-projects" className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200">
                    Post First Project
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {recentProjects.map((project) => (
                    <div key={project._id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 rounded-3xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer" onClick={() => navigate(`/projects/${project._id}`)}>
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{project.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadge(project.status)}`}>
                            {project.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                          <span>💰 ${project.budget?.max} max</span>
                          <span>•</span>
                          <span>📊 {project.bidsCount} proposals</span>
                        </div>
                      </div>
                      <Link to={`/projects/${project._id}`} className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Manage Card <span className="text-xl">→</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Financial Timeline */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 h-full">
              <h2 className="text-3xl font-black text-gray-900 mb-8">Cash Flow</h2>

              {recentPayments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 grayscale opacity-30">🪙</div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No entries yet</p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                  {recentPayments.map((payment) => (
                    <div key={payment._id} className="relative pl-12">
                      <div className="absolute left-3 top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-500 z-10"></div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-gray-900 leading-tight line-clamp-1">{payment.project?.title || 'System Pay'}</h4>
                        <span className="font-black text-blue-600">${payment.amount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">
                          {new Date(payment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getPaymentStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-10 p-6 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-3xl border border-blue-100/50">
                <h4 className="text-sm font-black text-gray-400 uppercase mb-2">Total Managed</h4>
                <p className="text-3xl font-black text-gray-900">${stats.totalSpent.toFixed(2)}</p>
                <Link to="/profile" className="mt-4 block text-center text-blue-600 text-sm font-bold hover:underline">
                  View Full Ledger
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;