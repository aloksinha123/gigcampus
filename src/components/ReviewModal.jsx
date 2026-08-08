import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const ReviewModal = ({ isOpen, onClose, project, reviewee, onReviewSubmitted }) => {
    const { success, error } = useNotification();
    const [loading, setLoading] = useState(false);

    // Form states
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [communicationRating, setCommunicationRating] = useState(5);
    const [qualityRating, setQualityRating] = useState(5);
    const [deadlineRating, setDeadlineRating] = useState(5);
    const [professionalismRating, setProfessionalismRating] = useState(5);
    const [wouldRecommend, setWouldRecommend] = useState(true);

    if (!isOpen || !project || !reviewee) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (review.length < 20) {
            error('Review text must be at least 20 characters long.');
            return;
        }
        if (review.length > 1000) {
            error('Review text cannot exceed 1000 characters.');
            return;
        }

        setLoading(false);
        try {
            setLoading(true);
            const payload = {
                project: project._id,
                reviewee: reviewee._id,
                rating,
                review,
                communicationRating,
                qualityRating,
                deadlineRating,
                professionalismRating,
                wouldRecommend
            };

            const res = await api.reviews.submit(payload);
            success('✨ Review submitted successfully!');
            if (onReviewSubmitted) {
                onReviewSubmitted(res.data);
            }
            onClose();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit review.');
        } finally {
            setLoading(false);
        }
    };

    // Category Selector Component
    const StarRatingSelector = ({ label, value, onChange }) => {
        return (
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            type="button"
                            key={star}
                            onClick={() => onChange(star)}
                            className="focus:outline-none transition-transform active:scale-95"
                        >
                            <span className={`text-xl ${star <= value ? 'text-amber-400' : 'text-slate-200'}`}>
                                ★
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 transform scale-100 transition-all max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-base sm:text-lg">Leave a Review</h3>
                        <p className="text-xs text-blue-100 truncate max-w-[240px] sm:max-w-none">For {reviewee.profile?.fullName || reviewee.username} • Project: {project.title}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white hover:text-blue-200 focus:outline-none text-2xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Overall Rating */}
                    <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                        <label className="block text-sm font-bold text-slate-500 mb-2">OVERALL RATING</label>
                        <div className="flex justify-center space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    type="button"
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform active:scale-95 hover:scale-110"
                                >
                                    <span className={`text-4xl ${star <= rating ? 'text-amber-400' : 'text-slate-200'}`}>
                                        ★
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Ratings */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category Ratings</h4>
                        <StarRatingSelector label="Communication" value={communicationRating} onChange={setCommunicationRating} />
                        <StarRatingSelector label="Quality of Work" value={qualityRating} onChange={setQualityRating} />
                        <StarRatingSelector label="Timeliness / Deadline" value={deadlineRating} onChange={setDeadlineRating} />
                        <StarRatingSelector label="Professionalism" value={professionalismRating} onChange={setProfessionalismRating} />
                    </div>

                    {/* Recommendation Toggle */}
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <span className="text-sm font-bold text-slate-700">Would you recommend them?</span>
                            <p className="text-xs text-slate-500">Would you work with this person again?</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWouldRecommend(!wouldRecommend)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                wouldRecommend ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    wouldRecommend ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Review text */}
                    <div className="space-y-1">
                        <label className="block text-sm font-bold text-slate-700">Detailed Feedback</label>
                        <textarea
                            rows="4"
                            value={review}
                            onChange={(e) => setReview(e.target.value)}
                            placeholder="Describe your experience working together. How was the execution, quality, communication, and professionalism? (Minimum 20 characters)"
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                            required
                        />
                        <div className="flex justify-between text-xs">
                            <span className={review.length < 20 ? 'text-rose-500' : 'text-emerald-500'}>
                                {review.length < 20 
                                    ? `Need ${20 - review.length} more characters` 
                                    : `${review.length} characters`
                                }
                            </span>
                            <span className="text-slate-400">Max 1000</span>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || review.length < 20 || review.length > 1000}
                            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition-colors ${
                                loading || review.length < 20 || review.length > 1000
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {loading ? 'Submitting...' : 'Submit Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
