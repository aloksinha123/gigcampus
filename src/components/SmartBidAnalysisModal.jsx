import React from 'react';

const SmartBidAnalysisModal = ({ analysis, onClose, onReanalyze, isAnalyzing }) => {
    if (!analysis) return null;

    const { score = 85, estimatedWinChance = 'High', strengths = [], weaknesses = [], suggestions = [] } = analysis;

    const getChanceBadge = (chance) => {
        switch (chance) {
            case 'High':
                return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
            case 'Medium':
                return 'bg-amber-500/10 text-amber-600 border-amber-200';
            default:
                return 'bg-rose-500/10 text-rose-600 border-rose-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[120] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative border border-slate-100">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all font-black flex items-center justify-center cursor-pointer"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="mb-6 pr-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gc-soft text-gc-blue rounded-full text-xs font-bold mb-2">
                        <span>✨ AI Bid Quality Audit</span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight italic uppercase">
                        Proposal <span className="text-gc-blue">Analysis Results</span>
                    </h3>
                </div>

                {/* Summary Score Banner */}
                <div className="bg-gc-navy text-white p-6 rounded-3xl mb-6 shadow-xl border border-gc-navy/40 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gc-blue/20 border border-gc-blue/50 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-yellow-400">{score}</span>
                            <span className="text-[9px] font-bold text-gc-light uppercase">Score</span>
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-white">Proposal Quality</h4>
                            <p className="text-xs text-gc-light font-medium">Evaluated against project requirements</p>
                        </div>
                    </div>

                    <div className={`px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 ${getChanceBadge(estimatedWinChance)}`}>
                        <span>Win Chance:</span>
                        <span className="text-sm font-black">{estimatedWinChance}</span>
                    </div>
                </div>

                {/* Analysis Details */}
                <div className="space-y-4 mb-6">
                    {/* Strengths */}
                    {strengths.length > 0 && (
                        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                            <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span>✅</span> Key Strengths ({strengths.length})
                            </h4>
                            <ul className="space-y-1.5">
                                {strengths.map((item, idx) => (
                                    <li key={idx} className="text-xs font-medium text-emerald-950 flex items-start gap-2">
                                        <span className="text-emerald-500 font-black">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Weaknesses */}
                    {weaknesses.length > 0 && (
                        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
                            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span>⚠️</span> Areas to Improve ({weaknesses.length})
                            </h4>
                            <ul className="space-y-1.5">
                                {weaknesses.map((item, idx) => (
                                    <li key={idx} className="text-xs font-medium text-amber-950 flex items-start gap-2">
                                        <span className="text-amber-500 font-black">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="bg-gc-soft/60 p-4 rounded-2xl border border-gc-light">
                            <h4 className="text-xs font-black text-gc-navy uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span>💡</span> Actionable Suggestions ({suggestions.length})
                            </h4>
                            <ul className="space-y-1.5">
                                {suggestions.map((item, idx) => (
                                    <li key={idx} className="text-xs font-medium text-gc-navy flex items-start gap-2">
                                        <span className="text-gc-blue font-black">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={onReanalyze}
                        disabled={isAnalyzing}
                        className="w-full sm:w-auto px-6 py-3 bg-gc-blue hover:bg-gc-navy text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                        {isAnalyzing ? 'Re-analyzing...' : 'Re-Analyze Proposal 🔄'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
                    >
                        Edit & Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartBidAnalysisModal;
