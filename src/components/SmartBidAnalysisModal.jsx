import React, { useState } from 'react';

const SmartBidAnalysisModal = ({ analysis, onClose, onApplyImprovedBid, toastSuccess }) => {
    const [copied, setCopied] = useState(false);

    if (!analysis) return null;

    const {
        score = 80,
        requirementMatch = 85,
        professionalism = 'Good',
        communication = 'Good',
        risk = 'Low',
        strengths = [],
        weaknesses = [],
        missingPoints = [],
        improvedBid = ''
    } = analysis;

    const handleCopy = () => {
        if (improvedBid) {
            navigator.clipboard.writeText(improvedBid);
            setCopied(true);
            if (toastSuccess) toastSuccess('Copied improved bid to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getRiskColor = (riskLevel) => {
        const r = (riskLevel || '').toLowerCase();
        if (r.includes('low')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (r.includes('medium') || r.includes('moderate')) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-rose-100 text-rose-700 border-rose-200';
    };

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-10 shadow-2xl relative border border-slate-100">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-all font-black flex items-center justify-center"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="mb-8 pr-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold mb-2">
                        <span>✨ AI Smart Bid Audit</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bid Optimization Insights</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Review feedback to maximize your chances of getting hired.</p>
                </div>

                {/* Score Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
                    {/* Overall Score */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100/50 text-center col-span-2 sm:col-span-1">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Overall Score</p>
                        <p className="text-3xl font-black text-indigo-600">{score}<span className="text-xs text-indigo-400">/100</span></p>
                    </div>

                    {/* Requirement Match */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100/50 text-center">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Match Rate</p>
                        <p className="text-2xl font-black text-blue-600">{requirementMatch}%</p>
                    </div>

                    {/* Professionalism */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tone</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{professionalism}</p>
                    </div>

                    {/* Communication */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Clarity</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{communication}</p>
                    </div>

                    {/* Risk Level */}
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center col-span-2 sm:col-span-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Risk Level</p>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskColor(risk)}`}>
                            {risk}
                        </span>
                    </div>
                </div>

                {/* Analysis Lists */}
                <div className="space-y-4 mb-8">
                    {/* Strengths */}
                    {strengths.length > 0 && (
                        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                            <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span>🟢</span> Key Strengths
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-xs text-emerald-900 font-medium">
                                {strengths.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Weaknesses */}
                    {weaknesses.length > 0 && (
                        <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                            <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span>🟡</span> Areas for Improvement
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-xs text-amber-900 font-medium">
                                {weaknesses.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Missing Points */}
                    {missingPoints.length > 0 && (
                        <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100">
                            <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <span>🔴</span> Missing Key Information
                            </h4>
                            <ul className="list-disc list-inside space-y-1 text-xs text-rose-900 font-medium">
                                {missingPoints.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Improved Bid Suggestion Box */}
                {improvedBid && (
                    <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl mb-8 shadow-inner border border-slate-800">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <span>🚀</span> Recommended Proposal Rewrite
                            </h4>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                            >
                                {copied ? '✓ Copied' : '📋 Copy'}
                            </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                            {improvedBid}
                        </p>
                    </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                    >
                        <span>📋</span> {copied ? 'Copied!' : 'Copy Proposal'}
                    </button>
                    {improvedBid && (
                        <button
                            type="button"
                            onClick={() => onApplyImprovedBid(improvedBid)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-200 hover:shadow-purple-400 hover:scale-105 transition flex items-center justify-center gap-2"
                        >
                            <span>✨</span> Use Improved Bid
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartBidAnalysisModal;
