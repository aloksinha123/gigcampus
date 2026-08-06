import React, { useState } from 'react';
import api from '../services/api';

const CreateMilestoneModal = ({ projectId, acceptedAmount = 0, currentSum = 0, onClose, onSuccess, toastError, toastSuccess }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);

    const remainingBudget = acceptedAmount > 0 ? Math.max(0, acceptedAmount - currentSum) : null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            if (toastError) toastError('Please enter a milestone title.');
            return;
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            if (toastError) toastError('Please enter a valid amount greater than 0.');
            return;
        }

        if (acceptedAmount > 0 && (currentSum + numAmount) > acceptedAmount) {
            if (toastError) toastError(`Milestone amount (₹${numAmount}) exceeds remaining project budget (₹${remainingBudget}).`);
            return;
        }

        try {
            setLoading(true);
            const response = await api.milestones.create({
                projectId,
                title: title.trim(),
                description: description.trim(),
                amount: numAmount,
                dueDate: dueDate || undefined
            });

            if (response.data?.success) {
                if (toastSuccess) toastSuccess('✨ Milestone created successfully!');
                onSuccess(response.data.milestone);
                onClose();
            }
        } catch (err) {
            console.error('Create Milestone Error:', err);
            if (toastError) toastError(err.response?.data?.message || 'Failed to create milestone.');
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold mb-2">
                        <span>🎯 Escrow Milestone Creation</span>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">
                        <span className="text-blue-600">New</span> Milestone
                    </h3>
                    {remainingBudget !== null && (
                        <p className="text-xs font-bold text-gray-500 mt-1">
                            Available Escrow Budget: <span className="text-blue-600 font-black">₹{remainingBudget}</span>
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Milestone Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="e.g., Phase 1 - UI Components & Setup"
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl text-gray-900 font-bold text-sm transition-all focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Milestone Amount (₹)</label>
                        <input
                            type="number"
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            placeholder="0.00"
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl text-gray-900 font-black text-xl transition-all focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target Due Date (Optional)</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl text-gray-900 font-bold text-sm transition-all focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Scope / Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows="3"
                            placeholder="Detail what deliverable files or features must be completed for this milestone..."
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl text-gray-900 font-medium text-sm transition-all focus:outline-none"
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
                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-200 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <span>Create Milestone</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateMilestoneModal;
