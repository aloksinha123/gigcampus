import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const FreelancerDashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-800">Freelancer Dashboard 👋</h1>
          <p className="text-gray-600 italic">Welcome back, {user?.username}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-50">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Active Bids</h3>
            <p className="text-3xl font-black text-blue-600">0</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-50">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Won Projects</h3>
            <p className="text-3xl font-black text-green-600">0</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-50">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Total Earned</h3>
            <p className="text-3xl font-black text-purple-600">${user?.wallet?.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-yellow-50">
            <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Rating</h3>
            <p className="text-3xl font-black text-yellow-500">
              {user?.reputation?.score?.toFixed(1) || '0.0'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link to="/projects" className="group bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 rounded-2xl text-center hover:shadow-lg hover:shadow-blue-200 transition-all active:scale-[0.98]">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔍</div>
              <span className="font-bold text-lg">Browse Projects</span>
            </Link>
            <Link to="/my-projects" className="group bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-2xl text-center hover:shadow-lg hover:shadow-green-200 transition-all active:scale-[0.98]">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💼</div>
              <span className="font-bold text-lg">My Projects</span>
            </Link>
            <Link to="/portfolio" className="group bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white p-6 rounded-2xl text-center hover:shadow-lg hover:shadow-purple-200 transition-all active:scale-[0.98]">
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎨</div>
              <span className="font-bold text-lg">Manage Portfolio</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreelancerDashboard;