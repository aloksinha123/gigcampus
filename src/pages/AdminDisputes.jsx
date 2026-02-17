import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdminDisputes = () => {
    const { user } = useAuth();
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const [disputes, setDisputes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispute, setSelectedDispute] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [decision, setDecision] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        fetchDisputes();
    }, [user, navigate]);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            const response = await api.admin.getDisputes();
            setDisputes(response.data);
        } catch (err) {
            error('Failed to load disputes');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!decision || !reason.trim()) {
            error('Please select a decision and provide a reason');
            return;
        }

        try {
            await api.admin.resolveDispute(selectedDispute._id, { decision, reason });
            success(`Dispute resolved: ${decision === 'release' ? 'Payment released to freelancer' : 'Refunded to student'}`);
            setShowModal(false);
            setSelectedDispute(null);
            setDecision('');
            setReason('');
            fetchDisputes();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to resolve dispute');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-white mb-2 italic">Dispute <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Resolution</span></h1>
                    <p className="text-slate-500 font-medium">Review and resolve platform disputes</p>
                </header>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-500"></div>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="bg-slate-900/50 rounded-3xl p-12 border border-slate-800 text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-2xl font-black text-white mb-2">No Active Disputes</h3>
                        <p className="text-slate-400">All disputes have been resolved</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {disputes.map(dispute => (
                            <div key={dispute._id} className="bg-slate-900/50 rounded-3xl p-8 border border-red-900/30 hover:border-red-800/50 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-2">{dispute.title}</h3>
                                        <p className="text-slate-400 text-sm">{dispute.description}</p>
                                    </div>
                                    <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-xs font-black uppercase">
                                        ⚠️ DISPUTED
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Student Info */}
                                    <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
                                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">Student (Client)</h4>
                                        <p className="font-bold text-white mb-1">{dispute.client?.username}</p>
                                        <p className="text-sm text-slate-400 mb-2">{dispute.client?.email}</p>
                                        <p className="text-xs text-slate-500">Wallet: ₹{dispute.client?.wallet?.balance || 0}</p>
                                    </div>

                                    {/* Freelancer Info */}
                                    <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
                                        <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3">Freelancer</h4>
                                        <p className="font-bold text-white mb-1">{dispute.freelancer?.username}</p>
                                        <p className="text-sm text-slate-400 mb-2">{dispute.freelancer?.email}</p>
                                        <p className="text-xs text-slate-500">Wallet: ₹{dispute.freelancer?.wallet?.balance || 0}</p>
                                    </div>
                                </div>

                                {/* Project Details */}
                                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700 mb-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Project Details</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Budget</p>
                                            <p className="font-bold text-white">₹{dispute.budget?.min} - ₹{dispute.budget?.max}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Bid Amount</p>
                                            <p className="font-bold text-white">₹{dispute.selectedBid?.price || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Category</p>
                                            <p className="font-bold text-white capitalize">{dispute.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Created</p>
                                            <p className="font-bold text-white">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => {
                                        setSelectedDispute(dispute);
                                        setShowModal(true);
                                    }}
                                    className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-red-900/20 transition-all active:scale-95"
                                >
                                    RESOLVE DISPUTE
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Resolution Modal */}
            {showModal && selectedDispute && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-slate-900 w-full max-w-2xl rounded-3xl p-8 border border-slate-700">
                        <h2 className="text-2xl font-black text-white mb-6">Resolve Dispute</h2>

                        <div className="mb-6">
                            <h3 className="font-bold text-white mb-2">{selectedDispute.title}</h3>
                            <p className="text-sm text-slate-400">Make a decision on how to resolve this dispute</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <label className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border-2 border-transparent hover:border-green-500/50 cursor-pointer transition-all">
                                <input
                                    type="radio"
                                    name="decision"
                                    value="release"
                                    checked={decision === 'release'}
                                    onChange={(e) => setDecision(e.target.value)}
                                    className="w-5 h-5"
                                />
                                <div>
                                    <p className="font-bold text-white">Release Payment to Freelancer</p>
                                    <p className="text-xs text-slate-400">Freelancer completed the work satisfactorily</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border-2 border-transparent hover:border-red-500/50 cursor-pointer transition-all">
                                <input
                                    type="radio"
                                    name="decision"
                                    value="refund"
                                    checked={decision === 'refund'}
                                    onChange={(e) => setDecision(e.target.value)}
                                    className="w-5 h-5"
                                />
                                <div>
                                    <p className="font-bold text-white">Refund Student</p>
                                    <p className="text-xs text-slate-400">Freelancer did not deliver as promised</p>
                                </div>
                            </label>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-400 mb-2">Resolution Reason</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows="4"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-all"
                                placeholder="Explain your decision..."
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedDispute(null);
                                    setDecision('');
                                    setReason('');
                                }}
                                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResolve}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-2xl font-bold transition-all active:scale-95"
                            >
                                Confirm Resolution
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDisputes;
