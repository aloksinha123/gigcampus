import React, { useState } from 'react';
import api from '../services/api';

const SubmitMilestoneModal = ({ milestone, onClose, onSuccess, toastError, toastSuccess }) => {
    const [deliverableUrl, setDeliverableUrl] = useState('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);

    if (!milestone) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!deliverableUrl.trim()) {
            if (toastError) toastError('Please provide a valid deliverable URL (e.g., GitHub, Drive, Figma link).');
            return;
        }

        try {
            setLoading(true);
            const response = await api.milestones.submit(milestone._id, {
                deliverableUrl: deliverableUrl.trim(),
                feedback: feedback.trim()
            });

            if (response.data?.success) {
                if (toastSuccess) toastSuccess('🚀 Milestone deliverable submitted to student!');
                onSuccess(response.data.milestone);
                onClose();
            }
        } catch (err) {
            console.error('Submit Milestone Error:', err);
            if (toastError) toastError(err.response?.data?.message || 'Failed to submit deliverable.');
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold mb-2">
                        <span>📤 Freelancer Submission</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">
                        <span className="text-purple-600">Submit</span> Milestone
                    </h3>
                    <p className="text-xs font-bold text-gray-500 mt-1">
                        Milestone: <span className="text-gray-900 font-black">{milestone.title}</span> (₹{milestone.amount})
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Deliverable URL / Link *</label>
                        <input
                            type="url"
                            value={deliverableUrl}
                            onChange={(e) => setDeliverableUrl(e.target.value)}
                            required
                            placeholder="https://github.com/user/project or https://drive.google.com/..."
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-purple-200 rounded-2xl text-gray-900 font-bold text-sm transition-all focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Submission Notes / Summary (Optional)</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows="3"
                            placeholder="Summarize key features completed or instructions for the student to test..."
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-purple-200 rounded-2xl text-gray-900 font-medium text-sm transition-all focus:outline-none"
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
                            className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-200 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <span>Submit Deliverable</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubmitMilestoneModal;
