import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const MyBids = () => {
    const { user, logout } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchMyBids();
    }, [user, navigate]);

    const fetchMyBids = async () => {
        try {
            setLoading(true);
            const response = await api.bids.getMy();
            setBids(response.data);
        } catch (err) {
            error('Failed to load your bids');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (bidId) => {
        if (!window.confirm('Are you sure you want to withdraw this bid?')) return;

        try {
            await api.bids.withdraw(bidId);
            success('Bid withdrawn successfully');
            fetchMyBids();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to withdraw bid');
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            accepted: 'bg-green-100 text-green-700 border-green-200',
            rejected: 'bg-red-100 text-red-700 border-red-200',
            withdrawn: 'bg-gray-100 text-gray-700 border-gray-200'
        };
        return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50">
            {/* Navbar */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tight">Your <span className="text-indigo-600">Proposals</span></h1>
                    <p className="text-lg text-gray-500 font-medium">Track your active bids, accepted contracts, and project history.</p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-gray-400 font-black text-xs uppercase tracking-widest mb-1">Active Bids</p>
                        <p className="text-4xl font-black text-gray-900">{bids.filter(b => b.status === 'pending').length}</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-green-500 font-black text-xs uppercase tracking-widest mb-1">Accepted</p>
                        <p className="text-4xl font-black text-green-600">{bids.filter(b => b.status === 'accepted').length}</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                        <p className="text-gray-400 font-black text-xs uppercase tracking-widest mb-1">Total Value</p>
                        <p className="text-4xl font-black text-gray-900">${bids.reduce((sum, b) => sum + (b.price || 0), 0)}</p>
                    </div>
                    <Link to="/projects" className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100 flex flex-col justify-center items-center hover:-translate-y-1 transition-all group">
                        <span className="text-2xl mb-1 font-black">Find More →</span>
                        <span className="text-xs font-bold text-indigo-100">Marketplace</span>
                    </Link>
                </div>

                {/* Proposals List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
                        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Fetching Proposals...</p>
                    </div>
                ) : bids.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-gray-200">
                        <div className="text-[120px] mb-8 grayscale">📨</div>
                        <h2 className="text-4xl font-black text-gray-900 mb-4">No Proposals Yet</h2>
                        <p className="text-xl text-gray-500 mb-10 max-w-lg mx-auto font-medium">
                            You haven't bid on any projects. Start exploring the marketplace to find work that matches your skills.
                        </p>
                        <Link to="/projects" className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-bold text-lg shadow-xl shadow-indigo-200 hover:shadow-indigo-400 transition-all">
                            Browse Marketplace
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {bids.map(bid => (
                            <div key={bid._id} className="group bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all">
                                <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                    <div className="flex-1 w-full">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(bid.status)}`}>
                                                {bid.status}
                                            </span>
                                            <span className="text-gray-400 font-bold text-xs uppercase tracking-tighter">
                                                Bid ID: #{bid._id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                {bid.project?.title || 'Unknown Project'}
                                            </h3>
                                        </div>

                                        <div className="flex flex-wrap gap-6 mb-6">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={bid.project?.client?.profile?.avatar || 'https://ui-avatars.com/api/?name=Client'}
                                                    alt="Client"
                                                    className="w-6 h-6 rounded-full border border-gray-200"
                                                />
                                                <span className="text-gray-500 text-sm font-bold">{bid.project?.client?.username}</span>
                                            </div>
                                            <div className="text-gray-500 text-sm font-bold flex items-center gap-1">
                                                <span>💰</span> Bid: ${bid.price}
                                            </div>
                                            <div className="text-gray-500 text-sm font-bold flex items-center gap-1">
                                                <span>📅</span> Timeline: {bid.timeline}
                                            </div>
                                            <div className="text-gray-500 text-sm font-bold flex items-center gap-1">
                                                <span>📊</span> Project Status: {bid.project?.status}
                                            </div>
                                        </div>

                                        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/30">
                                            <p className="text-sm font-bold text-indigo-900 mb-2 uppercase tracking-widest opacity-60">Your Proposal Preview</p>
                                            <p className="text-gray-600 font-medium italic line-clamp-2">"{bid.proposal}"</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 w-full lg:w-48">
                                        <Link
                                            to={`/projects/${bid.project?._id}`}
                                            className="bg-indigo-600 text-white py-4 rounded-2xl font-black text-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                        >
                                            View Project
                                        </Link>
                                        {bid.status === 'pending' && (
                                            <button
                                                onClick={() => handleWithdraw(bid._id)}
                                                className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all active:scale-95"
                                            >
                                                Withdraw Bid
                                            </button>
                                        )}
                                        {bid.status === 'accepted' && (
                                            <Link
                                                to="/messages"
                                                className="bg-green-600 text-white py-4 rounded-2xl font-black text-center shadow-lg shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
                                            >
                                                Start Chat
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBids;
