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
  const renderBarChart = (data, valueKey, labelKey, colorClass = 'from-blue-500 to-gc-cyan') => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 font-sans pb-20">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 sm:mb-10 pb-8 border-b border-gray-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gc-soft text-gc-blue rounded-full text-xs font-bold mb-3 border border-gc-light">
              <span>🛡️ Executive Command Center</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900 italic">
              Admin <span className="gc-gradient-text">Analytics</span>
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1">
              Real-time telemetry across revenue, user acquisition, project fulfillment, AI metrics, and security.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link to="/admin/users" className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl border border-gray-200 transition min-h-[44px] flex items-center justify-center shadow-sm">
              Audit Users
            </Link>
            <Link to="/admin/reviews" className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl border border-gray-200 transition min-h-[44px] flex items-center justify-center shadow-sm">
              Moderate Reviews
            </Link>
            <Link to="/admin/reviews/reported" className="px-4 py-3 bg-white hover:bg-rose-50 text-rose-600 text-xs font-black uppercase tracking-wider rounded-xl border border-rose-200 transition min-h-[44px] flex items-center justify-center shadow-sm">
              ⚠️ Reported Reviews
            </Link>
            <Link to="/admin/disputes" className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl border border-gray-200 transition min-h-[44px] flex items-center justify-center shadow-sm">
              Disputes ({analytics.projects.cancelled || 0})
            </Link>
            <Link to="/admin/security" className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl border border-gray-200 transition min-h-[44px] flex items-center justify-center shadow-sm">
              Security Center 🛡️
            </Link>
            <Link to="/admin/fraud" className="px-5 py-3 bg-gc-blue hover:bg-gc-navy text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition active:scale-95 min-h-[44px] flex items-center justify-center">
              Fraud Center 🚨
            </Link>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 mb-10 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Time Horizon:</span>
            <div className="flex bg-gray-100 p-1 rounded-xl">
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
                    ? 'bg-gc-blue text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700'
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
                className="bg-white text-gray-700 text-xs px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gc-blue"
              />
              <span className="text-gray-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-white text-gray-700 text-xs px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gc-blue"
              />
              <button
                onClick={handleApplyCustomFilter}
                className="px-3.5 py-1.5 bg-gc-blue text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-gc-navy transition cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-gc-blue mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 animate-pulse">Aggregating telemetry logs...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-lg hover:border-emerald-100 transition-all relative overflow-hidden group shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 text-2xl flex items-center justify-center font-bold">💎</span>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {analytics.payments.successful} Paid
                  </span>
                </div>
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Platform Commission</h3>
                <p className="text-3xl font-black text-gray-900 mt-1">₹{(analytics.payments.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400 font-medium mt-2">
                  Total Volume: ₹{(analytics.payments.totalVolume || 0).toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all relative overflow-hidden group shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 text-2xl flex items-center justify-center font-bold">👥</span>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                    {analytics.users.online} Online
                  </span>
                </div>
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Total Users</h3>
                <p className="text-3xl font-black text-gray-900 mt-1">{analytics.users.total.toLocaleString()}</p>
                <p className="text-xs text-gray-400 font-medium mt-2">
                  {analytics.users.students} Students • {analytics.users.freelancers} Freelancers
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-lg hover:border-gc-light transition-all relative overflow-hidden group shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-gc-soft text-gc-blue text-2xl flex items-center justify-center font-bold">📁</span>
                  <span className="px-2.5 py-1 bg-gc-soft text-gc-blue rounded-full text-[10px] font-black uppercase tracking-wider">
                    {analytics.projects.completed} Done
                  </span>
                </div>
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Active Listings</h3>
                <p className="text-3xl font-black text-gray-900 mt-1">{analytics.projects.active}</p>
                <p className="text-xs text-gray-400 font-medium mt-2">
                  Avg Budget: ₹{analytics.projects.averageBudget.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-lg hover:border-amber-100 transition-all relative overflow-hidden group shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 text-2xl flex items-center justify-center font-bold">✨</span>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Gemini AI
                  </span>
                </div>
                <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">AI Invocations</h3>
                <p className="text-3xl font-black text-gray-900 mt-1">{analytics.ai.totalRequests}</p>
                <p className="text-xs text-gray-400 font-medium mt-2">
                  {analytics.ai.proposalsGenerated} Proposals • {analytics.ai.descriptionEnhancements} Briefs
                </p>
              </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Monthly Platform Revenue</h3>
                    <p className="text-xs text-gray-400">Commissions collected over recent months</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                    Growth Trend 📈
                  </span>
                </div>
                {renderBarChart(analytics.payments.monthlyTrend, 'revenue', 'month', 'from-emerald-500 to-teal-400')}
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Projects Fulfillment</h3>
                    <p className="text-xs text-gray-400">Listings created vs completed per month</p>
                  </div>
                  <span className="px-3 py-1 bg-gc-soft text-gc-blue rounded-full text-xs font-bold border border-gc-light">
                    Fulfillment Rate 🚀
                  </span>
                </div>
                {renderBarChart(analytics.projects.monthlyTrend, 'created', 'month', 'from-gc-blue to-gc-cyan')}
              </div>
            </div>

            {/* Category Cards: Bids, Messaging, AI & Fraud */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <span>📋</span> Bids & Marketplace Ratio
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Bids:</span>
                    <span className="font-black text-gray-900">{analytics.bids.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Accepted Proposals:</span>
                    <span className="font-bold text-emerald-600">{analytics.bids.accepted}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Rejected Proposals:</span>
                    <span className="font-bold text-rose-500">{analytics.bids.rejected}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500 font-bold">Avg Bids / Project:</span>
                    <span className="font-black text-gc-blue">{analytics.bids.avgPerProject}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <span>💬</span> Real-time Messaging
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Messages Sent:</span>
                    <span className="font-black text-gray-900">{analytics.messages.countInPeriod}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Active Project Chats:</span>
                    <span className="font-bold text-gc-cyan">{analytics.messages.activeConversations}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-500 font-bold">Socket State:</span>
                    <span className="font-black text-emerald-600">Operational 🟢</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                  <span>🛡️</span> Security & Fraud Audits
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Failed Login Attempts:</span>
                    <span className="font-bold text-amber-500">{analytics.fraud.failedLoginsCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duplicate Txns Blocked:</span>
                    <span className="font-bold text-emerald-600">{analytics.fraud.duplicatePaymentsBlocked}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Flagged Accounts:</span>
                    <span className="font-bold text-rose-500">{analytics.fraud.suspiciousActivityCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactional Email statistics */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <span>✉️</span> Transactional Email Logs
                  </h3>
                  <p className="text-xs text-gray-400">Live delivery status and failure telemetry</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${emailStats.totalSent + emailStats.totalFailed === 0
                    ? 'bg-gray-100 text-gray-400 border-gray-200'
                    : (emailStats.totalSent / (emailStats.totalSent + emailStats.totalFailed)) > 0.95
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                    Delivery Success: {
                      emailStats.totalSent + emailStats.totalFailed === 0
                        ? '0%'
                        : `${((emailStats.totalSent / (emailStats.totalSent + emailStats.totalFailed)) * 100).toFixed(1)}%`
                    }
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">SENT</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{emailStats.totalSent}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">FAILED</span>
                  <p className="text-2xl font-black text-rose-500 mt-1">{emailStats.totalFailed}</p>
                </div>
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">QUEUED</span>
                  <p className="text-2xl font-black text-gc-blue mt-1">{emailStats.totalQueued}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                  Distribution by Template Type
                </h4>
                {emailStats.statsByType.length === 0 ? (
                  <p className="text-xs text-gray-400 font-medium">No email transaction logs registered yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {emailStats.statsByType.map((item, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-gray-900 uppercase tracking-wider">{item._id}</span>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Template Type</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-600">{item.sent} sent</span>
                          {item.failed > 0 && (
                            <p className="text-[10px] font-bold text-rose-500 uppercase mt-0.5">{item.failed} failed</p>
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
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <span>🏆</span> Top Freelancers Leaderboard
                </h3>
                <div className="space-y-4">
                  {analytics.topFreelancers.length === 0 ? (
                    <p className="text-gray-400 text-xs">No freelancer records found.</p>
                  ) : (
                    analytics.topFreelancers.map((f, idx) => (
                      <div key={f._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-gc-soft text-gc-blue flex items-center justify-center font-black text-xs">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-black text-gray-900 text-sm">{f.username}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                              {f.reputation?.completedProjects || 0} Completed Projects • Rating ⭐ {f.reputation?.score || 5.0}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-600">
                          ₹{(f.wallet?.balance || 0).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                  <span>⚡</span> Live Audit Activity Feed
                </h3>
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-2">
                  {analytics.recentActivity.length === 0 ? (
                    <p className="text-gray-400 text-xs">No recent platform activity logged.</p>
                  ) : (
                    analytics.recentActivity.map(act => (
                      <div key={act._id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-3">
                        <span className="text-lg">📌</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-600 font-medium">
                            <span className="font-black text-gray-900">{act.user?.username || 'System User'}:</span> {act.description}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold mt-1">
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