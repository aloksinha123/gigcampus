import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const ReviewSummaryCard = ({ review: initialReview, onUpdate }) => {
    const { user: currentUser } = useAuth();
    const { success, error } = useNotification();
    const [review, setReview] = useState(initialReview);

    const {
        _id: reviewId,
        reviewer,
        reviewee,
        rating,
        review: reviewText,
        communicationRating,
        qualityRating,
        deadlineRating,
        professionalismRating,
        wouldRecommend,
        project,
        createdAt,
        sentiment,
        sentimentConfidence,
        helpfulVotes = [],
        reply,
        repliedAt,
        editedAt,
        reports = []
    } = review;

    // Helpful votes states
    const [isVoted, setIsVoted] = useState(helpfulVotes.some(id => String(id) === String(currentUser?._id)));
    const [votesCount, setVotesCount] = useState(helpfulVotes.length);
    const [voteLoading, setVoteLoading] = useState(false);

    // Reply states
    const [replyText, setReplyText] = useState(reply || '');
    const [isReplying, setIsReplying] = useState(false);
    const [replyLoading, setReplyLoading] = useState(false);

    // Report states
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('Spam');
    const [reportDescription, setReportDescription] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [hasReported, setHasReported] = useState(reports.some(r => String(r.reporter) === String(currentUser?._id)));

    const renderStars = (score) => {
        return (
            <div className="flex space-x-0.5 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-sm">
                        {star <= score ? '★' : '☆'}
                    </span>
                ))}
            </div>
        );
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleVoteHelpful = async () => {
        if (!currentUser) {
            error('Please log in to vote.');
            return;
        }
        if (voteLoading) return;

        setVoteLoading(true);
        try {
            if (isVoted) {
                const res = await api.reviews.removeHelpful(reviewId);
                setIsVoted(false);
                setVotesCount(res.data.helpfulCount);
            } else {
                const res = await api.reviews.voteHelpful(reviewId);
                setIsVoted(true);
                setVotesCount(res.data.helpfulCount);
            }
            if (onUpdate) onUpdate();
        } catch (err) {
            error(err.response?.data?.message || 'Action failed.');
        } finally {
            setVoteLoading(false);
        }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setReplyLoading(true);
        try {
            const res = await api.reviews.respond(reviewId, replyText);
            setReview(res.data);
            setIsReplying(false);
            success('Reply saved successfully!');
            if (onUpdate) onUpdate();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit reply');
        } finally {
            setReplyLoading(false);
        }
    };

    const handleReportSubmit = async (e) => {
        e.preventDefault();
        setReportLoading(true);
        try {
            await api.reviews.report(reviewId, { reason: reportReason, description: reportDescription });
            setHasReported(true);
            setShowReportModal(false);
            success('Review reported successfully. Admins will evaluate it.');
        } catch (err) {
            error(err.response?.data?.message || 'Failed to submit report.');
        } finally {
            setReportLoading(false);
        }
    };

    const isReviewee = String(currentUser?._id) === String(reviewee?._id || reviewee);

    const sentimentColors = {
        Positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Neutral: 'bg-slate-50 text-slate-700 border-slate-200',
        Negative: 'bg-rose-50 text-rose-700 border-rose-200'
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow relative">
            {/* Sentiment and Flags */}
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                    <img 
                        src={reviewer?.profile?.avatar || `https://ui-avatars.com/api/?name=${reviewer?.username || 'User'}`} 
                        alt={reviewer?.username} 
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                    />
                    <div>
                        <h4 className="font-semibold text-slate-800 text-sm">@{reviewer?.username || 'Anonymous'}</h4>
                        <p className="text-xs text-slate-400">{formatDate(createdAt)}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                        {sentiment && (
                            <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1 ${sentimentColors[sentiment] || 'bg-slate-50 text-slate-600'}`}>
                                {sentiment === 'Positive' && '😊'}
                                {sentiment === 'Neutral' && '😐'}
                                {sentiment === 'Negative' && '😟'}
                                {sentiment} ({sentimentConfidence}%)
                            </span>
                        )}
                        {renderStars(rating)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Score</span>
                </div>
            </div>

            {/* Recommendation & Project */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
                    Project: <span className="font-semibold">{project?.title || 'Unknown'}</span>
                </span>
                {wouldRecommend ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-medium flex items-center gap-1">
                        👍 Recommended
                    </span>
                ) : (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg font-medium flex items-center gap-1">
                        👎 Not Recommended
                    </span>
                )}
            </div>

            {/* Review Text */}
            <p className="text-slate-600 text-sm leading-relaxed italic">
                "{reviewText}"
            </p>

            {/* Sub-ratings Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-50">
                <div className="p-2 bg-slate-50 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Communication</span>
                    <span className="text-xs font-semibold text-slate-700">{communicationRating}/5</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quality</span>
                    <span className="text-xs font-semibold text-slate-700">{qualityRating}/5</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timeliness</span>
                    <span className="text-xs font-semibold text-slate-700">{deadlineRating}/5</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Professional</span>
                    <span className="text-xs font-semibold text-slate-700">{professionalismRating}/5</span>
                </div>
            </div>

            {/* Engagement Footer (Helpful, Reply, Report Actions) */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 text-xs">
                <div className="flex items-center space-x-3">
                    {/* Helpful Vote Button */}
                    <button
                        onClick={handleVoteHelpful}
                        disabled={voteLoading}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-bold transition-all active:scale-95 ${
                            isVoted 
                                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>👍</span>
                        <span>Helpful ({votesCount})</span>
                    </button>

                    {/* Reply Action Trigger (Recipient only, Max 1 reply) */}
                    {isReviewee && !reply && !isReplying && (
                        <button
                            onClick={() => setIsReplying(true)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-1.5"
                        >
                            💬 Reply to Review
                        </button>
                    )}
                </div>

                {/* Report Action Trigger */}
                {currentUser && String(currentUser._id) !== String(reviewer?._id || reviewer) && (
                    <button
                        onClick={() => setShowReportModal(true)}
                        disabled={hasReported}
                        className={`font-bold transition-colors flex items-center gap-1 ${
                            hasReported 
                                ? 'text-slate-400 cursor-not-allowed' 
                                : 'text-rose-500 hover:text-rose-700'
                        }`}
                    >
                        <span>🚩</span>
                        <span>{hasReported ? 'Reported' : 'Report'}</span>
                    </button>
                )}
            </div>

            {/* Reply Input Form */}
            {isReplying && (
                <form onSubmit={handleReplySubmit} className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <textarea
                        rows="2"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a public response to this review..."
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none"
                        required
                    />
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => { setIsReplying(false); setReplyText(reply || ''); }}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={replyLoading || !replyText.trim()}
                            className="px-4 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {replyLoading ? 'Saving...' : 'Submit'}
                        </button>
                    </div>
                </form>
            )}

            {/* Display Existing Reply */}
            {reply && (
                <div className="mt-3 p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100/30 pl-4 border-l-4 border-l-indigo-500 flex justify-between items-start group">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-indigo-700 block">
                            Response from recipient {editedAt && <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">(Edited)</span>}:
                        </span>
                        <p className="text-slate-600 text-xs italic">"{reply}"</p>
                    </div>
                    {isReviewee && !isReplying && (
                        <button
                            onClick={() => setIsReplying(true)}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            Edit Reply
                        </button>
                    )}
                </div>
            )}

            {/* Report Modal Dropdown Popup */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                <span>🚩</span> Report Review
                            </h3>
                            <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-700 text-lg">&times;</button>
                        </div>
                        <form onSubmit={handleReportSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason</label>
                                <select
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs bg-slate-50"
                                >
                                    <option value="Spam">Spam</option>
                                    <option value="Abusive Language">Abusive Language</option>
                                    <option value="Fake Review">Fake Review</option>
                                    <option value="Harassment">Harassment</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                                <textarea
                                    rows="3"
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    placeholder="Provide more context..."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReportModal(false)}
                                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={reportLoading}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
                                >
                                    {reportLoading ? 'Reporting...' : 'Submit Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewSummaryCard;
