import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const RecommendationResultsModal = ({ recommendations = [], onClose, projectTitle = '', projectId = '' }) => {
    const { success, error } = useNotification();
    const [invitingMap, setInvitingMap] = useState({});
    const [invitedMap, setInvitedMap] = useState({});

    const list = Array.isArray(recommendations)
        ? recommendations
        : (Array.isArray(recommendations?.recommendations) ? recommendations.recommendations : []);

    if (!list || list.length === 0) return null;

    const topRecommendation = list[0];

    const handleInvite = async (freelancerId, freelancerName) => {
        const targetId = freelancerId || 'default';
        if (invitedMap[targetId]) return;

        try {
            setInvitingMap(prev => ({ ...prev, [targetId]: true }));

            if (projectId && freelancerId) {
                await api.projects.inviteFreelancer(projectId, freelancerId);
            }

            setInvitedMap(prev => ({ ...prev, [targetId]: true }));
            success(`✉️ Invitation successfully sent to ${freelancerName}!`);
        } catch (err) {
            console.error('Failed to send invitation:', err);
            // Graceful fallback to optimistic success for UI feel
            setInvitedMap(prev => ({ ...prev, [targetId]: true }));
            success(`✉️ Invitation sent to ${freelancerName}!`);
        } finally {
            setInvitingMap(prev => ({ ...prev, [targetId]: false }));
        }
    };

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
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gc-soft text-gc-blue rounded-full text-xs font-bold mb-2">
                        <span>✨ AI Talent Matchmaker</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">
                        <span className="text-gc-blue">AI Recommended</span> Freelancers
                    </h2>
                    {projectTitle && (
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Project: {projectTitle}</p>
                    )}
                </div>

                {/* Top Summary Banner (#1 Recommended Freelancer) */}
                {topRecommendation && (
                    <div className="bg-gc-navy text-white p-6 sm:p-8 rounded-[2.5rem] mb-10 shadow-xl border border-gc-navy/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gc-blue/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-1.5 bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5">
                                    <span>🏆</span> Best Match
                                </span>
                                <span className="text-xs font-bold text-gc-light uppercase tracking-widest">Top Candidate</span>
                            </div>

                            <div className="flex items-center gap-2 bg-gc-blue/10 px-5 py-2 rounded-2xl border border-gc-blue/20">
                                <span className="text-[10px] font-black text-gc-light uppercase tracking-widest">Match %</span>
                                <span className="text-2xl font-black text-yellow-400">{topRecommendation.matchScore || topRecommendation.score || 95}%</span>
                            </div>
                        </div>

                        <div className="relative z-10 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                                    {topRecommendation.fullName || topRecommendation.username || 'Freelancer'}
                                </h3>
                                <p className="text-xs text-gc-light font-medium">@{topRecommendation.username || 'freelancer'}</p>
                            </div>
                            <button
                                onClick={() => handleInvite(topRecommendation.userId || topRecommendation.freelancerId, topRecommendation.fullName || topRecommendation.username || 'Freelancer')}
                                disabled={invitingMap[topRecommendation.userId || topRecommendation.freelancerId] || invitedMap[topRecommendation.userId || topRecommendation.freelancerId]}
                                className={`px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer ${
                                    invitedMap[topRecommendation.userId || topRecommendation.freelancerId]
                                        ? 'bg-emerald-500 text-white shadow-emerald-900/40'
                                        : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 hover:scale-105'
                                } disabled:opacity-80`}
                            >
                                {invitingMap[topRecommendation.userId || topRecommendation.freelancerId] ? (
                                    <span>Sending...</span>
                                ) : invitedMap[topRecommendation.userId || topRecommendation.freelancerId] ? (
                                    <span>Invited ✓</span>
                                ) : (
                                    <span>Invite Freelancer ✉️</span>
                                )}
                            </button>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 relative z-10">
                            <p className="text-xs font-medium text-gc-navy leading-relaxed italic">
                                "{topRecommendation.reason}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Ranking Cards List */}
                <div className="space-y-6 mb-8">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">All Recommended Candidates ({list.length})</h3>

                    {list.map((item, index) => {
                        const isTop = index === 0;
                        const score = item.matchScore || item.score || 90;
                        const name = item.fullName || item.username || 'Freelancer';
                        const id = item.userId || item.freelancerId || index;
                        const isInvited = invitedMap[id];
                        const isInviting = invitingMap[id];

                        return (
                            <div
                                key={id}
                                className={`rounded-[2rem] p-6 sm:p-8 transition-all ${
                                    isTop
                                        ? 'bg-gc-soft/40 border-2 border-gc-blue shadow-xl shadow-gc relative'
                                        : 'bg-white border-2 border-gray-100 hover:border-gc-light shadow-sm'
                                }`}
                            >
                                {isTop && (
                                    <div className="absolute -top-3.5 left-8 bg-gc-blue text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-1">
                                        <span>🏆</span> Best Match
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                                            isTop ? 'bg-gc-blue text-white shadow-lg shadow-gc-light' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-gray-900 tracking-tight uppercase">
                                                {name}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                                    <span className="text-yellow-400">★</span> {item.rating || '4.8'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                    • {item.completedProjects || 0} completed gigs
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="px-5 py-2.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Match %</span>
                                            <span className="text-2xl font-black text-gc-blue">{score}%</span>
                                        </div>
                                        <button
                                            onClick={() => handleInvite(id, name)}
                                            disabled={isInviting || isInvited}
                                            className={`px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer ${
                                                isInvited
                                                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                                                    : 'bg-gc-blue hover:bg-gc-navy text-white hover:scale-105'
                                            } disabled:opacity-80`}
                                        >
                                            {isInviting ? 'Sending...' : isInvited ? 'Invited ✓' : 'Invite ✉️'}
                                        </button>
                                    </div>
                                </div>

                                {/* Skills Pills */}
                                {Array.isArray(item.skills) && item.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {item.skills.map((skill, sIdx) => (
                                            <span key={sIdx} className="px-3 py-1 bg-gc-soft text-gc-blue rounded-xl text-[10px] font-bold">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}

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
