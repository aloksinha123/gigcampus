import React, { useState } from 'react';
import api from '../services/api';

const RejectMilestoneModal = ({ milestone, onClose, onSuccess, toastError, toastSuccess }) => {
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);

    if (!milestone) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!feedback.trim()) {
            if (toastError) toastError('Please provide a reason for requesting revision / rejecting this milestone.');
            return;
        }

        try {
            setLoading(true);
            const response = await api.milestones.reject(milestone._id, {
                feedback: feedback.trim()
            });

            if (response.data?.success) {
                if (toastSuccess) toastSuccess('Milestone revision feedback sent to freelancer.');
                onSuccess(response.data.milestone);
                onClose();
            }
        } catch (err) {
            console.error('Reject Milestone Error:', err);
            if (toastError) toastError(err.response?.data?.message || 'Failed to reject milestone.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] max-w-lg w-full p-6 sm:p-10 shadow-2xl relative border border-slate-100">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all font-black flex items-center justify-center cursor-pointer"
                >
                    ✕
                </button>

                <div className="mb-8 pr-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold mb-2">
                        <span>⚠️ Request Revision</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">
                        <span className="text-rose-600">Reject</span> Milestone
                    </h3>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                        Milestone: <span className="text-gray-900 font-black">{milestone.title}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Revision Reason / Feedback *</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            required
                            rows="4"
                            placeholder="Explain what changes or fixes are required before approving this milestone..."
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-rose-200 rounded-2xl text-gray-900 font-medium text-sm transition-all focus:outline-none"
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-200 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <span>Request Revision</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RejectMilestoneModal;
