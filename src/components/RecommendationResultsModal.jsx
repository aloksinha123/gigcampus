import React from 'react';

const RecommendationResultsModal = ({ recommendations = [], onClose, projectTitle = '' }) => {
    if (!recommendations || recommendations.length === 0) return null;

    const topRecommendation = recommendations[0];

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 shadow-2xl relative border border-slate-100">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all font-black flex items-center justify-center cursor-pointer"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="mb-8 pr-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold mb-2">
                        <span>✨ AI Talent Acquisition Engine</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">
                        <span className="text-purple-600">Ranked</span> Freelancers
                    </h2>
                    {projectTitle && (
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Project: {projectTitle}</p>
                    )}
                </div>

                {/* Top Summary Banner (#1 Recommended Freelancer) */}
                {topRecommendation && (
                    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] mb-10 shadow-xl border border-purple-800/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-1.5 bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5">
                                    <span>🏆</span> Best Match
                                </span>
                                <span className="text-xs font-bold text-purple-200 uppercase tracking-widest">Rank #1 Candidate</span>
                            </div>

                            <div className="flex items-center gap-2 bg-purple-950/80 px-5 py-2 rounded-2xl border border-purple-700/50">
                                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">AI Match Score</span>
                                <span className="text-2xl font-black text-yellow-400">{topRecommendation.score}<span className="text-xs text-purple-300">/100</span></span>
                            </div>
                        </div>

                        <div className="relative z-10 mb-3">
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                                {topRecommendation.username || topRecommendation.freelancerId}
                            </h3>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 relative z-10">
                            <p className="text-xs font-medium text-purple-100 leading-relaxed italic">
                                "{topRecommendation.reason}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Ranking Cards List */}
                <div className="space-y-6 mb-8">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">All Ranked Candidates ({recommendations.length})</h3>

                    {recommendations.map((item, index) => {
                        const isTop = index === 0;
                        return (
                            <div
                                key={item.freelancerId || index}
                                className={`rounded-[2rem] p-6 sm:p-8 transition-all ${
                                    isTop
                                        ? 'bg-purple-50/40 border-2 border-purple-500/80 shadow-xl shadow-purple-100/50 relative'
                                        : 'bg-white border-2 border-gray-100 hover:border-purple-200 shadow-sm'
                                }`}
                            >
                                {isTop && (
                                    <div className="absolute -top-3.5 left-8 bg-purple-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-1">
                                        <span>🏆</span> Best Match
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                                            isTop ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            #{item.rank || index + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                                                {item.username || item.freelancerId}
                                            </h4>
                                            {item.averageRating !== undefined && (
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                                        <span className="text-yellow-400">★</span> {item.averageRating || '0.0'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                        • {item.completedProjects || 0} completed gigs
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-5 py-2.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Score</span>
                                        <span className="text-2xl font-black text-indigo-600">{item.score}<span className="text-xs text-gray-400">/100</span></span>
                                    </div>
                                </div>

                                {/* Strengths and Concerns Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    {/* Strengths */}
                                    {item.strengths && item.strengths.length > 0 && (
                                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                            <h5 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                <span>🟢</span> Key Strengths
                                            </h5>
                                            <ul className="space-y-1">
                                                {item.strengths.map((str, idx) => (
                                                    <li key={idx} className="text-xs font-medium text-emerald-900 flex items-start gap-2">
                                                        <span className="text-emerald-500 font-bold">•</span>
                                                        <span>{str}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Concerns */}
                                    {item.concerns && item.concerns.length > 0 && (
                                        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                                            <h5 className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                <span>🔴</span> Considerations / Concerns
                                            </h5>
                                            <ul className="space-y-1">
                                                {item.concerns.map((con, idx) => (
                                                    <li key={idx} className="text-xs font-medium text-rose-900 flex items-start gap-2">
                                                        <span className="text-rose-500 font-bold">•</span>
                                                        <span>{con}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Recommendation Reason */}
                                {item.reason && (
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs font-medium text-gray-700 italic leading-relaxed">
                                        <span className="font-bold text-gray-900 not-italic">AI Verdict: </span>
                                        "{item.reason}"
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
                    >
                        Close Recommendations
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecommendationResultsModal;
