import React from 'react';

const ReviewSummaryCard = ({ review, onRespond }) => {
    const {
        reviewer,
        rating,
        review: reviewText,
        communicationRating,
        qualityRating,
        deadlineRating,
        professionalismRating,
        wouldRecommend,
        project,
        createdAt,
        response
    } = review;

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

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            {/* Reviewer Info & Stars */}
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
                <div className="text-right">
                    {renderStars(rating)}
                    <span className="text-xs font-bold text-slate-500 block mt-0.5">Overall Score</span>
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

            {/* Response */}
            {response?.comment ? (
                <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 pl-4 border-l-4 border-l-indigo-500">
                    <span className="text-xs font-bold text-indigo-700 block mb-1">Response:</span>
                    <p className="text-slate-600 text-xs italic">"{response.comment}"</p>
                </div>
            ) : (
                onRespond && (
                    <button
                        onClick={onRespond}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-2"
                    >
                        💬 Reply to this review
                    </button>
                )
            )}
        </div>
    );
};

export default ReviewSummaryCard;
