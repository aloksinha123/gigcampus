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
        <div className="min-h-screen bg-gc-near">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-gc-navy mb-2 italic">Dispute Resolution</h1>
                    <p className="text-gc-slate font-medium">Review and resolve platform disputes</p>
                </header>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-gc-blue"></div>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="bg-white rounded-gc-xl p-12 border border-gc-border shadow-gc text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-gc-navy mb-2">No Active Disputes</h3>
                        <p className="text-gc-muted">All disputes have been resolved</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {disputes.map(dispute => (
                            <div key={dispute._id} className="bg-white rounded-gc-xl p-8 border border-red-200 hover:border-red-300 transition-all shadow-gc">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-gc-navy mb-2">{dispute.title}</h3>
                                        <p className="text-gc-muted text-sm">{dispute.description}</p>
                                    </div>
                                    <span className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-black uppercase">
                                        DISPUTED
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Student Info */}
                                    <div className="bg-gc-surface rounded-2xl p-6 border border-gc-border">
                                        <h4 className="text-xs font-black text-gc-blue uppercase tracking-widest mb-3">Student (Client)</h4>
                                        <p className="font-bold text-gc-navy mb-1">{dispute.client?.username}</p>
                                        <p className="text-sm text-gc-muted mb-2">{dispute.client?.email}</p>
                                        <p className="text-xs text-gc-slate">Wallet: ₹{dispute.client?.wallet?.balance || 0}</p>
                                    </div>

                                    {/* Freelancer Info */}
                                    <div className="bg-gc-surface rounded-2xl p-6 border border-gc-border">
                                        <h4 className="text-xs font-black text-gc-blue uppercase tracking-widest mb-3">Freelancer</h4>
                                        <p className="font-bold text-gc-navy mb-1">{dispute.freelancer?.username}</p>
                                        <p className="text-sm text-gc-muted mb-2">{dispute.freelancer?.email}</p>
                                        <p className="text-xs text-gc-slate">Wallet: ₹{dispute.freelancer?.wallet?.balance || 0}</p>
                                    </div>
                                </div>

                                {/* Project Details */}
                                <div className="bg-gc-surface rounded-2xl p-6 border border-gc-border mb-6">
                                    <h4 className="text-xs font-black text-gc-muted uppercase tracking-widest mb-3">Project Details</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-gc-muted text-xs mb-1">Budget</p>
                                            <p className="font-bold text-gc-navy">₹{dispute.budget?.min} - ₹{dispute.budget?.max}</p>
                                        </div>
                                        <div>
                                            <p className="text-gc-muted text-xs mb-1">Bid Amount</p>
                                            <p className="font-bold text-gc-navy">₹{dispute.selectedBid?.price || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gc-muted text-xs mb-1">Category</p>
                                            <p className="font-bold text-gc-navy capitalize">{dispute.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-gc-muted text-xs mb-1">Created</p>
                                            <p className="font-bold text-gc-navy">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => {
                                        setSelectedDispute(dispute);
                                        setShowModal(true);
                                    }}
                                    className="w-full px-6 py-4 bg-gc-blue hover:bg-gc-navy text-white rounded-2xl font-black text-sm transition-all active:scale-95"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-2xl rounded-3xl p-8 border border-gc-border shadow-2xl">
                        <h2 className="text-2xl font-black text-gc-navy mb-6">Resolve Dispute</h2>

                        <div className="mb-6">
                            <h3 className="font-bold text-gc-navy mb-2">{selectedDispute.title}</h3>
                            <p className="text-sm text-gc-muted">Make a decision on how to resolve this dispute</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            <label className="flex items-center gap-3 p-4 bg-gc-surface rounded-2xl border-2 border-transparent hover:border-emerald-400 cursor-pointer transition-all">
                                <input
                                    type="radio"
                                    name="decision"
                                    value="release"
                                    checked={decision === 'release'}
                                    onChange={(e) => setDecision(e.target.value)}
                                    className="w-5 h-5"
                                />
                                <div>
                                    <p className="font-bold text-gc-navy">Release Payment to Freelancer</p>
                                    <p className="text-xs text-gc-muted">Freelancer completed the work satisfactorily</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 bg-gc-surface rounded-2xl border-2 border-transparent hover:border-red-400 cursor-pointer transition-all">
                                <input
                                    type="radio"
                                    name="decision"
                                    value="refund"
                                    checked={decision === 'refund'}
                                    onChange={(e) => setDecision(e.target.value)}
                                    className="w-5 h-5"
                                />
                                <div>
                                    <p className="font-bold text-gc-navy">Refund Student</p>
                                    <p className="text-xs text-gc-muted">Freelancer did not deliver as promised</p>
                                </div>
                            </label>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gc-muted mb-2">Resolution Reason</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows="4"
                                className="w-full gc-input"
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
                                className="flex-1 px-6 py-3 bg-gc-surface hover:bg-gc-border text-gc-navy rounded-2xl font-bold transition-all border border-gc-border"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResolve}
                                className="flex-1 px-6 py-3 bg-gc-blue hover:bg-gc-navy text-white rounded-2xl font-bold transition-all active:scale-95"
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
