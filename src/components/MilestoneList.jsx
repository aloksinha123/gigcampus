import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CreateMilestoneModal from './CreateMilestoneModal';
import SubmitMilestoneModal from './SubmitMilestoneModal';
import RejectMilestoneModal from './RejectMilestoneModal';

const MilestoneList = ({ project, isOwner, isFreelancer, toastError, toastSuccess, onUpdate }) => {
    const { user } = useAuth();
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    // Modals state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedMilestoneForSubmit, setSelectedMilestoneForSubmit] = useState(null);
    const [selectedMilestoneForReject, setSelectedMilestoneForReject] = useState(null);

    const projectId = project._id;
    const acceptedAmount = project.selectedBid?.price || project.selectedBid?.bidAmount || project.budget?.max || 0;

    // Bulletproof ownership & role checks
    const currentUserId = user?._id || user?.id;
    const projectClientId = project.client?._id || project.client;
    const projectFreelancerId = project.freelancer?._id || project.freelancer;

    const isOwnerCheck = Boolean(
        isOwner ||
        (currentUserId && projectClientId && String(currentUserId) === String(projectClientId))
    );

    const isFreelancerCheck = Boolean(
        isFreelancer ||
        (currentUserId && projectFreelancerId && String(currentUserId) === String(projectFreelancerId))
    );

    useEffect(() => {
        if (projectId) {
            fetchMilestones();
        }
    }, [projectId]);

    const fetchMilestones = async () => {
        try {
            setLoading(true);
            const response = await api.milestones.getProjectMilestones(projectId);
            if (response.data?.success) {
                setMilestones(response.data.milestones || []);
            }
        } catch (err) {
            console.error('Fetch Milestones Error:', err);
            if (toastError) toastError('Failed to load project milestones.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const totalMilestoneSum = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const totalReleasedSum = milestones.filter(m => m.status === 'released').reduce((sum, m) => sum + Number(m.amount || 0), 0);
    const releaseProgressPercent = acceptedAmount > 0 ? Math.min(100, Math.round((totalReleasedSum / acceptedAmount) * 100)) : 0;

    // Handlers
    const handleApproveMilestone = async (milestone) => {
        try {
            setActionLoadingId(milestone._id);
            const response = await api.milestones.approve(milestone._id);
            if (response.data?.success) {
                if (toastSuccess) toastSuccess(`✨ Milestone "${milestone.title}" approved! ₹${response.data.freelancerAmount || milestone.amount} released to freelancer wallet.`);
                fetchMilestones();
                // Notify parent to re-fetch project (status may have changed to 'completed')
                if (onUpdate) onUpdate();
            }
        } catch (err) {
            console.error('Approve Milestone Error:', err);
            if (toastError) toastError(err.response?.data?.message || 'Failed to approve milestone.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteMilestone = async (milestoneId) => {
        if (!window.confirm('Are you sure you want to delete this pending milestone?')) return;
        try {
            setActionLoadingId(milestoneId);
            const response = await api.milestones.delete(milestoneId);
            if (response.data?.success) {
                if (toastSuccess) toastSuccess('Milestone deleted.');
                fetchMilestones();
            }
        } catch (err) {
            console.error('Delete Milestone Error:', err);
            if (toastError) toastError(err.response?.data?.message || 'Failed to delete milestone.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'submitted':
                return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
            case 'approved':
            case 'released':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'rejected':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header & Escrow Summary Metrics Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden border border-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gc-soft text-gc-blue rounded-full text-xs font-bold mb-2 border border-gc-light">
                            <span>🎯 Milestone Escrow Vault</span>
                        </div>
                        <h3 className="text-3xl font-black tracking-tight italic uppercase">
                            Project <span className="text-gc-blue">Milestones</span>
                        </h3>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Funds are safely escrowed and released incrementally upon deliverable approval.
                        </p>
                    </div>

                    {isOwnerCheck && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-4 bg-gc-blue hover:bg-gc-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gc hover:scale-105 transition flex items-center gap-2 cursor-pointer"
                        >
                            <span>+</span> Create Milestone
                        </button>
                    )}
                </div>

                {/* Progress Bar & Escrow Metrics */}
                <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Budget</p>
                        <p className="text-2xl font-black text-white">₹{acceptedAmount}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Milestones Total</p>
                        <p className="text-2xl font-black text-gc-blue">₹{totalMilestoneSum}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Released Payout</p>
                        <p className="text-2xl font-black text-emerald-400">₹{totalReleasedSum}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Released %</p>
                        <p className="text-2xl font-black text-yellow-400">{releaseProgressPercent}%</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                        className="bg-gc-blue h-full rounded-full transition-all duration-500"
                        style={{ width: `${releaseProgressPercent}%` }}
                    ></div>
                </div>
            </div>

            {/* Loading Spinner */}
            {loading ? (
                <div className="text-center py-16 bg-white/50 rounded-[2.5rem] border border-gray-100">
                    <div className="w-10 h-10 border-4 border-gc-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading project milestones...</p>
                </div>
            ) : milestones.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                    <div className="text-7xl mb-6 grayscale opacity-20">🎯</div>
                    <h4 className="text-xl font-black text-gray-800 tracking-tight uppercase mb-2">No Milestones Created Yet</h4>
                    <p className="text-gray-400 font-medium text-xs max-w-sm mx-auto leading-relaxed">
                        {isOwnerCheck
                            ? 'As the project owner, click "+ Create Milestone" to break this gig into manageable payment phases.'
                            : 'The project owner has not created payment milestones for this gig yet.'}
                    </p>
                    {isOwnerCheck && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-6 px-8 py-4 bg-gc-blue hover:bg-gc-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-gc-light hover:scale-105 transition cursor-pointer"
                        >
                            + Create First Milestone
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {milestones.map((item, index) => {
                        const isActionLoading = actionLoadingId === item._id;
                        return (
                            <div
                                key={item._id}
                                className={`bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden ${
                                    item.status === 'released' ? 'border-emerald-100 bg-emerald-50/10' : ''
                                }`}
                            >
                                {item.status === 'released' && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-8 py-1 font-black text-[10px] uppercase tracking-widest rotate-45 translate-x-8 translate-y-3">
                                        RELEASED
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gc-soft text-gc-blue flex items-center justify-center font-black text-lg">
                                            #{item.order || index + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-gray-900 tracking-tight">{item.title}</h4>
                                            {item.dueDate && (
                                                <p className="text-xs font-bold text-gray-400 mt-0.5">
                                                    Target Due: {new Date(item.dueDate).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${getStatusBadge(item.status)}`}>
                                            {item.status === 'submitted' ? '⏳ Submitted (In Review)' : item.status.toUpperCase()}
                                        </span>
                                        <p className="text-3xl font-black text-gc-blue tracking-tight">₹{item.amount}</p>
                                    </div>
                                </div>

                                {item.description && (
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6 text-xs text-gray-600 font-medium leading-relaxed">
                                        {item.description}
                                    </div>
                                )}

                                {/* Deliverable Link & Notes */}
                                {item.deliverableUrl && (
                                    <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100 mb-6">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Submitted Deliverable URL</p>
                                        <a
                                            href={item.deliverableUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-blue-700 underline break-all hover:text-blue-900 transition flex items-center gap-1.5"
                                        >
                                            <span>🔗</span> {item.deliverableUrl}
                                        </a>
                                        {item.feedback && item.status !== 'rejected' && (
                                            <p className="text-xs text-blue-900 font-medium mt-2 italic">
                                                Freelancer Notes: "{item.feedback}"
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Rejection Feedback Banner */}
                                {item.status === 'rejected' && item.feedback && (
                                    <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 mb-6">
                                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Revision Feedback from Client</p>
                                        <p className="text-xs font-bold text-rose-900 italic">"{item.feedback}"</p>
                                    </div>
                                )}

                                {/* Action Buttons Footer */}
                                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-100 gap-4">
                                    <div className="text-xs text-gray-400 font-bold">
                                        {item.releasedAt ? (
                                            <span className="text-emerald-600">✓ Released on {new Date(item.releasedAt).toLocaleString()}</span>
                                        ) : item.submittedAt ? (
                                            <span>Submitted on {new Date(item.submittedAt).toLocaleString()}</span>
                                        ) : (
                                            <span>Status: {item.status}</span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
                                        {/* Student Actions */}
                                        {isOwnerCheck && item.status === 'pending' && (
                                            <button
                                                onClick={() => handleDeleteMilestone(item._id)}
                                                disabled={isActionLoading}
                                                className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                                            >
                                                Delete
                                            </button>
                                        )}

                                        {isOwnerCheck && item.status === 'submitted' && (
                                            <>
                                                <button
                                                    onClick={() => setSelectedMilestoneForReject(item)}
                                                    disabled={isActionLoading}
                                                    className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                                                >
                                                    Reject / Revise
                                                </button>
                                                <button
                                                    onClick={() => handleApproveMilestone(item)}
                                                    disabled={isActionLoading}
                                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-200 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                                >
                                                    {isActionLoading ? (
                                                        <>
                                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            <span>Releasing...</span>
                                                        </>
                                                    ) : (
                                                        <span>✓ Approve & Release ₹{item.amount}</span>
                                                    )}
                                                </button>
                                            </>
                                        )}

                                        {/* Freelancer Actions */}
                                        {isFreelancerCheck && (item.status === 'pending' || item.status === 'rejected') && (
                                            <button
                                                onClick={() => setSelectedMilestoneForSubmit(item)}
                                                disabled={isActionLoading}
                                                className="px-6 py-2.5 bg-gc-blue hover:bg-gc-navy text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-gc-light transition flex items-center gap-2 cursor-pointer"
                                            >
                                                <span>📤</span> {item.status === 'rejected' ? 'Resubmit Deliverable' : 'Submit Deliverable'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Milestone Modal */}
            {showCreateModal && (
                <CreateMilestoneModal
                    projectId={projectId}
                    acceptedAmount={acceptedAmount}
                    currentSum={totalMilestoneSum}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => fetchMilestones()}
                    toastError={toastError}
                    toastSuccess={toastSuccess}
                />
            )}

            {/* Submit Milestone Modal */}
            {selectedMilestoneForSubmit && (
                <SubmitMilestoneModal
                    milestone={selectedMilestoneForSubmit}
                    onClose={() => setSelectedMilestoneForSubmit(null)}
                    onSuccess={() => fetchMilestones()}
                    toastError={toastError}
                    toastSuccess={toastSuccess}
                />
            )}

            {/* Reject Milestone Modal */}
            {selectedMilestoneForReject && (
                <RejectMilestoneModal
                    milestone={selectedMilestoneForReject}
                    onClose={() => setSelectedMilestoneForReject(null)}
                    onSuccess={() => fetchMilestones()}
                    toastError={toastError}
                    toastSuccess={toastSuccess}
                />
            )}
        </div>
    );
};

export default MilestoneList;
