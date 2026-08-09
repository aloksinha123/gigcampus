import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { error, success } = useNotification();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);

  const defaultAnalytics = {
    users: { total: 0, students: 0, freelancers: 0, online: 0, newInPeriod: 0, monthlyTrend: [] },
    projects: { total: 0, active: 0, completed: 0, cancelled: 0, open: 0, averageBudget: 0, monthlyTrend: [] },
    payments: { totalRevenue: 0, totalVolume: 0, successful: 0, failed: 0, refunds: 0, monthlyTrend: [] },
    bids: { total: 0, accepted: 0, rejected: 0, avgPerProject: 0 },
    messages: { countInPeriod: 0, activeConversations: 0 },
    ai: { totalRequests: 0, proposalsGenerated: 0, descriptionEnhancements: 0, recommendationsGenerated: 0 },
    fraud: { failedLoginsCount: 0, duplicatePaymentsBlocked: 0, suspiciousActivityCount: 0, flaggedAccounts: [] },
    topFreelancers: [],
    topClients: [],
    recentActivity: [],
    recentPayments: [],
    recentProjects: []
  };

  const [analytics, setAnalytics] = useState(defaultAnalytics);

  const [emailStats, setEmailStats] = useState({
    totalSent: 0,
    totalFailed: 0,
    totalQueued: 0,
    statsByType: []
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchAnalytics();
  }, [user, navigate, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = { range: dateRange };
      if (dateRange === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const response = await api.admin.getAnalytics(params);
      if (response.data?.analytics) {
        const apiData = response.data.analytics;
        setAnalytics({
          users: { ...defaultAnalytics.users, ...apiData.users },
          projects: { ...defaultAnalytics.projects, ...apiData.projects },
          payments: { ...defaultAnalytics.payments, ...apiData.payments },
          bids: { ...defaultAnalytics.bids, ...apiData.bids },
          messages: { ...defaultAnalytics.messages, ...apiData.messages },
          ai: { ...defaultAnalytics.ai, ...apiData.ai },
          fraud: { ...defaultAnalytics.fraud, ...apiData.fraud },
          topFreelancers: apiData.topFreelancers ?? defaultAnalytics.topFreelancers,
          topClients: apiData.topClients ?? defaultAnalytics.topClients,
          recentActivity: apiData.recentActivity ?? defaultAnalytics.recentActivity,
          recentPayments: apiData.recentPayments ?? defaultAnalytics.recentPayments,
          recentProjects: apiData.recentProjects ?? defaultAnalytics.recentProjects
        });
      }

      // Load transactional email metrics
      try {
        const mailResponse = await api.admin.getEmailStats();
        if (mailResponse.data?.success) {
          setEmailStats({
            totalSent: mailResponse.data.totalSent,
            totalFailed: mailResponse.data.totalFailed,
            totalQueued: mailResponse.data.totalQueued,
            statsByType: mailResponse.data.statsByType || []
          });
        }
      } catch (mailErr) {
        console.error('Failed to load email stats:', mailErr);
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
      error('Failed to load administrative analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomFilter = () => {
    if (!customStart || !customEnd) {
      error('Please select both start date and end date.');
      return;
    }
    fetchAnalytics();
  };

  // Helper SVG Bar Chart Renderer
  const renderBarChart = (data, valueKey, labelKey, colorClass = 'from-blue-500 to-indigo-600') => {
    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => Number(d[valueKey]) || 1), 1);

    return (
      <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-2">
        {data.map((item, idx) => {
          const val = Number(item[valueKey]) || 0;
          const heightPercent = Math.max(10, Math.round((val / maxVal) * 100));
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
              <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                ₹{val.toLocaleString()}
              </div>
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full bg-gradient-to-t ${colorClass} rounded-t-xl transition-all duration-500 group-hover:brightness-125 shadow-lg`}
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                {item[labelKey]}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans pb-20">
      <Navbar variant="dark" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 sm:mb-10 pb-8 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-bold mb-3 border border-purple-500/20">
              <span>🛡️ Executive Command Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white italic">
              Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Analytics</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
              Real-time telemetry across revenue, user acquisition, project fulfillment, AI metrics, and security.
            </p>
          </div>

          {/* Quick Actions & Security */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              to="/admin/users"
              className="px-4 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-700 transition min-h-[44px] flex items-center justify-center"
            >
              Audit Users
            </Link>
            <Link
              to="/admin/reviews"
              className="px-4 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-700 transition min-h-[44px] flex items-center justify-center"
            >
              Moderate Reviews
            </Link>
            <Link
              to="/admin/reviews/reported"
              className="px-4 py-3 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-black uppercase tracking-wider rounded-xl border border-rose-500/20 transition min-h-[44px] flex items-center justify-center"
            >
              ⚠️ Reported Reviews
            </Link>
            <Link
              to="/admin/disputes"
              className="px-4 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-700 transition min-h-[44px] flex items-center justify-center"
            >
              Disputes ({analytics.projects.cancelled || 0})
            </Link>
            <Link
              to="/admin/security"
              className="px-4 py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-700 transition min-h-[44px] flex items-center justify-center"
            >
              Security Center 🛡️
            </Link>
            <Link
              to="/admin/fraud"
              className="px-5 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 min-h-[44px] flex items-center justify-center"
            >
              Fraud Center 🚨
            </Link>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800/80 mb-10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Time Horizon:</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'today', label: 'Today' },
                { id: '7days', label: '7 Days' },
                { id: '30days', label: '30 Days' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDateRange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${dateRange === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-slate-950 text-white text-xs px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-500 text-xs font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-slate-950 text-white text-xs px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleApplyCustomFilter}
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-500 transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60">
            <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Aggregating telemetry logs...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Revenue */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 hover:border-emerald-500/40 transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl flex items-center justify-center font-bold">💎</span>
                  <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {analytics.payments.successful} Paid
                  </span>
                </div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Platform Commission</h3>
                <p className="text-3xl font-black text-white mt-1">₹{(analytics.payments.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Total Volume: ₹{(analytics.payments.totalVolume || 0).toLocaleString()}
                </p>
              </div>

              {/* Users */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 hover:border-blue-500/40 transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 text-2xl flex items-center justify-center font-bold">👥</span>
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
                    {analytics.users.online} Online
                  </span>
                </div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Users</h3>
                <p className="text-3xl font-black text-white mt-1">{analytics.users.total.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  {analytics.users.students} Students • {analytics.users.freelancers} Freelancers
                </p>
              </div>

              {/* Projects */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 hover:border-purple-500/40 transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 text-2xl flex items-center justify-center font-bold">📁</span>
                  <span className="px-2.5 py-1 bg-purple-500/10 text-purple-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {analytics.projects.completed} Done
                  </span>
                </div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Listings</h3>
                <p className="text-3xl font-black text-white mt-1">{analytics.projects.active}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Avg Budget: ₹{analytics.projects.averageBudget.toLocaleString()}
                </p>
              </div>

              {/* AI Requests */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800 hover:border-amber-500/40 transition-all relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 text-2xl flex items-center justify-center font-bold">✨</span>
                  <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Gemini AI
                  </span>
                </div>
                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">AI Invocations</h3>
                <p className="text-3xl font-black text-white mt-1">{analytics.ai.totalRequests}</p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  {analytics.ai.proposalsGenerated} Proposals • {analytics.ai.descriptionEnhancements} Briefs
                </p>
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Revenue Chart */}
              <div className="bg-slate-900/60 rounded-[2.5rem] p-8 border border-slate-800/80">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-black text-white">Monthly Platform Revenue</h3>
                    <p className="text-xs text-slate-500">Commissions collected over recent months</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                    Growth Trend 📈
                  </span>
                </div>
                {renderBarChart(analytics.payments.monthlyTrend, 'revenue', 'month', 'from-emerald-600 to-teal-500')}
              </div>

              {/* Projects Created Chart */}
              <div className="bg-slate-900/60 rounded-[2.5rem] p-8 border border-slate-800/80">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-black text-white">Projects Fulfillment</h3>
                    <p className="text-xs text-slate-500">Listings created vs completed per month</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-bold border border-purple-500/20">
                    Fulfillment Rate 🚀
                  </span>
                </div>
                {renderBarChart(analytics.projects.monthlyTrend, 'created', 'month', 'from-purple-600 to-indigo-600')}
              </div>
            </div>

            {/* Category Cards: Bids, Messaging, AI & Fraud */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bids & Marketplace Metrics */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <span>📋</span> Bids & Marketplace Ratio
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Bids:</span>
                    <span className="font-black text-white">{analytics.bids.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Accepted Proposals:</span>
                    <span className="font-bold text-emerald-400">{analytics.bids.accepted}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Rejected Proposals:</span>
                    <span className="font-bold text-rose-400">{analytics.bids.rejected}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-bold">Avg Bids / Project:</span>
                    <span className="font-black text-blue-400">{analytics.bids.avgPerProject}</span>
                  </div>
                </div>
              </div>

              {/* Chat & Messages */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <span>💬</span> Real-time Messaging
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Messages Sent:</span>
                    <span className="font-black text-white">{analytics.messages.countInPeriod}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Active Project Chats:</span>
                    <span className="font-bold text-indigo-400">{analytics.messages.activeConversations}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-bold">Socket State:</span>
                    <span className="font-black text-emerald-400">Operational 🟢</span>
                  </div>
                </div>
              </div>

              {/* Fraud Audit */}
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <span>🛡️</span> Security & Fraud Audits
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Failed Login Attempts:</span>
                    <span className="font-bold text-amber-400">{analytics.fraud.failedLoginsCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duplicate Txns Blocked:</span>
                    <span className="font-bold text-emerald-400">{analytics.fraud.duplicatePaymentsBlocked}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Flagged Accounts:</span>
                    <span className="font-bold text-rose-400">{analytics.fraud.suspiciousActivityCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactional Email statistics */}
            <div className="bg-slate-900/60 rounded-[2.5rem] p-8 border border-slate-800/80">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-800/80">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <span>✉️</span> Transactional Email Logs
                  </h3>
                  <p className="text-xs text-slate-500">Live delivery status and failure telemetry</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${emailStats.totalSent + emailStats.totalFailed === 0
                    ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    : (emailStats.totalSent / (emailStats.totalSent + emailStats.totalFailed)) > 0.95
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                    Delivery Success: {
                      emailStats.totalSent + emailStats.totalFailed === 0
                        ? '0%'
                        : `${((emailStats.totalSent / (emailStats.totalSent + emailStats.totalFailed)) * 100).toFixed(1)}%`
                    }
                  </span>
                </div>
              </div>

              {/* Stats counts cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">SENT</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{emailStats.totalSent}</p>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">FAILED</span>
                  <p className="text-2xl font-black text-rose-400 mt-1">{emailStats.totalFailed}</p>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">QUEUED</span>
                  <p className="text-2xl font-black text-blue-400 mt-1">{emailStats.totalQueued}</p>
                </div>
              </div>

              {/* Distribution list */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                  Distribution by Template Type
                </h4>
                {emailStats.statsByType.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium">No email transaction logs registered yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {emailStats.statsByType.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-950/40 border border-slate-800/60 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-white uppercase tracking-wider">{item._id}</span>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Template Type</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-400">{item.sent} sent</span>
                          {item.failed > 0 && (
                            <p className="text-[10px] font-bold text-rose-400 uppercase mt-0.5">{item.failed} failed</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboards & Recent Activity Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Freelancers Leaderboard */}
              <div className="bg-slate-900/60 rounded-[2.5rem] p-8 border border-slate-800/80">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                  <span>🏆</span> Top Freelancers Leaderboard
                </h3>
                <div className="space-y-4">
                  {analytics.topFreelancers.length === 0 ? (
                    <p className="text-slate-500 text-xs">No freelancer records found.</p>
                  ) : (
                    analytics.topFreelancers.map((f, idx) => (
                      <div key={f._id} className="flex items-center justify-between p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-black text-xs">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-black text-white text-sm">{f.username}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">
                              {f.reputation?.completedProjects || 0} Completed Projects • Rating ⭐ {f.reputation?.score || 5.0}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-400">
                          ₹{(f.wallet?.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity Audit Feed */}
              <div className="bg-slate-900/60 rounded-[2.5rem] p-8 border border-slate-800/80">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                  <span>⚡</span> Live Audit Activity Feed
                </h3>
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
                  {analytics.recentActivity.length === 0 ? (
                    <p className="text-slate-500 text-xs">No recent platform activity logged.</p>
                  ) : (
                    analytics.recentActivity.map(act => (
                      <div key={act._id} className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-start gap-3">
                        <span className="text-lg">📌</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-200 font-medium">
                            <span className="font-black text-white">{act.user?.username || 'System User'}:</span> {act.description}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">
                            {new Date(act.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;