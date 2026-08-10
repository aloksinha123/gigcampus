import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const DashboardRecommendationWidget = ({ user }) => {
    const { success, error } = useNotification();
    const isFreelancer = user?.role === 'freelancer';

    const [activeSubTab, setActiveSubTab] = useState('recommended'); // 'recommended', 'favorites', 'recent'
    const [loading, setLoading] = useState(false);
    const [recommendedItems, setRecommendedItems] = useState([]);
    const [savedItems, setSavedItems] = useState([]);
    const [recentItems, setRecentItems] = useState([]);

    useEffect(() => {
        loadData();
    }, [activeSubTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (activeSubTab === 'recommended') {
                if (isFreelancer) {
                    const res = await api.recommendations.getProjects();
                    setRecommendedItems(res.data?.recommendations || []);
                } else {
                    const res = await api.recommendations.getFreelancers();
                    setRecommendedItems(res.data?.recommendations || []);
                }
            } else if (activeSubTab === 'favorites') {
                if (isFreelancer) {
                    const res = await api.favorites.getBookmarks();
                    setSavedItems(res.data?.projects || []);
                } else {
                    const res = await api.favorites.getFavorites();
                    setSavedItems(res.data?.freelancers || []);
                }
            } else if (activeSubTab === 'recent') {
                const res = await api.recommendations.getViews({ entityType: isFreelancer ? 'project' : 'freelancer' });
                setRecentItems(res.data || []);
            }
        } catch (err) {
            console.error('Failed to load dashboard recommendations data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClearRecent = async () => {
        try {
            await api.recommendations.clearViews({ entityType: isFreelancer ? 'project' : 'freelancer' });
            setRecentItems([]);
            success('Recently viewed history cleared!');
        } catch (err) {
            error('Failed to clear viewed history.');
        }
    };

    const handleToggleBookmark = async (projectId, e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await api.favorites.unbookmarkProject(projectId);
            setSavedItems(prev => prev.filter(p => p._id !== projectId));
            success('Bookmark removed.');
        } catch (err) {
            error('Failed to remove bookmark.');
        }
    };

    const handleToggleFavorite = async (freelancerId, e) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await api.favorites.unfavoriteFreelancer(freelancerId);
            setSavedItems(prev => prev.filter(f => f._id !== freelancerId));
            success('Freelancer removed from favorites.');
        } catch (err) {
            error('Failed to remove favorite.');
        }
    };

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveSubTab('recommended')}
                        className={`text-xs font-black uppercase tracking-widest transition-all pb-2 border-b-2 ${
                            activeSubTab === 'recommended'
                                ? 'text-gc-blue border-gc-blue'
                                : 'text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                    >
                        ✨ Recommended For You
                    </button>
                    <button
                        onClick={() => setActiveSubTab('favorites')}
                        className={`text-xs font-black uppercase tracking-widest transition-all pb-2 border-b-2 ${
                            activeSubTab === 'favorites'
                                ? 'text-gc-blue border-gc-blue'
                                : 'text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                    >
                        {isFreelancer ? '💙 Saved Gigs' : '💙 Favorite Freelancers'}
                    </button>
                    <button
                        onClick={() => setActiveSubTab('recent')}
                        className={`text-xs font-black uppercase tracking-widest transition-all pb-2 border-b-2 ${
                            activeSubTab === 'recent'
                                ? 'text-gc-blue border-gc-blue'
                                : 'text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                    >
                        ⏱️ Recently Viewed
                    </button>
                </div>

                {activeSubTab === 'recent' && recentItems.length > 0 && (
                    <button
                        onClick={handleClearRecent}
                        className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest"
                    >
                        🗑️ Clear History
                    </button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gc-blue mx-auto"></div>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeSubTab === 'recommended' && (
                        recommendedItems.length === 0 ? (
                            <p className="text-gray-400 text-xs italic py-4">No recommendations available at this moment.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recommendedItems.map((item, idx) => {
                                    const scoreColor = item.matchScore >= 80 ? 'text-emerald-600 bg-emerald-50' : 'text-gc-blue bg-gc-soft';
                                    if (isFreelancer && item.project) {
                                        return (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-gray-200 hover:shadow-sm transition">
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{item.project.category}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${scoreColor}`}>
                                                            {item.matchScore}% Match
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.project.title}</h4>
                                                    <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed italic">"{item.project.description}"</p>
                                                    <p className="text-[10px] text-gc-blue font-medium mt-3 bg-gc-soft/50 p-2 rounded-xl border border-gc-light">💡 {item.reason}</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400">Budget: ₹{item.project.budget?.max}</span>
                                                    <Link to={`/projects/${item.project._id}`} className="text-xs font-black text-gc-blue uppercase tracking-wider hover:underline">
                                                        Apply →
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    } else if (!isFreelancer && item.freelancer) {
                                        return (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-gray-200 hover:shadow-sm transition">
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex gap-2">
                                                            {item.freelancer.verified && <span className="text-[8px] bg-gc-soft text-gc-blue font-bold px-1.5 py-0.5 rounded border border-gc-light">🛡️ Verified</span>}
                                                            {item.freelancer.reputation?.score >= 4.5 && <span className="text-[8px] bg-amber-50 text-amber-600 font-bold px-1.5 py-0.5 rounded">🏆 Top Rated</span>}
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${scoreColor}`}>
                                                            {item.matchScore}% Match
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 text-sm">@{item.freelancer.username}</h4>
                                                    <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">{item.freelancer.profile?.bio || 'Freelancer details match your search profile.'}</p>
                                                    <p className="text-[10px] text-gc-blue font-medium mt-3 bg-gc-soft/50 p-2 rounded-xl border border-gc-light">💡 {item.reason}</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400">Rate: ₹{item.freelancer.profile?.hourlyRate || 0}/hr</span>
                                                    <Link to={`/portfolio/${item.freelancerId}`} className="text-xs font-black text-gc-blue uppercase tracking-wider hover:underline">
                                                        Showcase →
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )
                    )}

                    {activeSubTab === 'favorites' && (
                        savedItems.length === 0 ? (
                            <div className="text-center py-8">
                                <span className="text-4xl block mb-2 grayscale opacity-40">💙</span>
                                <p className="text-gray-400 text-xs italic">
                                    {isFreelancer ? 'Your saved projects will appear here.' : 'Your favorite freelancers will appear here.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedItems.map((item, idx) => {
                                    if (isFreelancer) {
                                        return (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-gray-200 hover:shadow-sm transition">
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{item.category}</span>
                                                        <button onClick={(e) => handleToggleBookmark(item._id, e)} className="text-gc-blue hover:text-rose-400 transition text-xs">
                                                            💙
                                                        </button>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.title}</h4>
                                                    <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed italic">"{item.description}"</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400">Budget: ₹{item.budget?.max}</span>
                                                    <Link to={`/projects/${item._id}`} className="text-xs font-black text-gc-blue uppercase tracking-wider hover:underline">
                                                        Apply →
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-gray-200 hover:shadow-sm transition">
                                                <div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Freelancer</span>
                                                        <button onClick={(e) => handleToggleFavorite(item._id, e)} className="text-gc-blue hover:text-rose-400 transition text-xs">
                                                            💙
                                                        </button>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 text-sm">@{item.username}</h4>
                                                    <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">{item.profile?.bio || 'No biography details provided.'}</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400">Rate: ₹{item.profile?.hourlyRate || 0}/hr</span>
                                                    <Link to={`/portfolio/${item._id}`} className="text-xs font-black text-gc-blue uppercase tracking-wider hover:underline">
                                                        Showcase →
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    }
                                })}
                            </div>
                        )
                    )}

                    {activeSubTab === 'recent' && (
                        recentItems.length === 0 ? (
                            <p className="text-gray-400 text-xs italic py-4">No recently viewed history.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recentItems.map((item, idx) => {
                                    if (item.entityType === 'project' && item.project) {
                                        return (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-gray-200 hover:shadow-sm transition">
                                                <div>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase block mb-2">⏱️ Visited: {new Date(item.viewedAt).toLocaleTimeString()}</span>
                                                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.project.title}</h4>
                                                    <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed italic">"{item.project.description}"</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400">Budget: ₹{item.project.budget?.max}</span>
                                                    <Link to={`/projects/${item.project._id}`} className="text-xs font-black text-gc-blue uppercase tracking-wider hover:underline">
                                                        Apply →
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    } else if (item.entityType === 'freelancer' && item.freelancer) {
                                        return (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-between hover:border-gray-200 hover:shadow-sm transition">
                                                <div>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase block mb-2">⏱️ Visited: {new Date(item.viewedAt).toLocaleTimeString()}</span>
                                                    <h4 className="font-bold text-gray-900 text-sm">@{item.freelancer.username}</h4>
                                                    <p className="text-gray-400 text-xs mt-2 line-clamp-2 leading-relaxed">{item.freelancer.profile?.bio || 'Freelancer showcase details.'}</p>
                                                </div>
                                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                                    <span className="text-xs font-bold text-gray-400">Rate: ₹{item.freelancer.profile?.hourlyRate || 0}/hr</span>
                                                    <Link to={`/portfolio/${item.freelancer._id}`} className="text-xs font-black text-gc-blue uppercase tracking-wider hover:underline">
                                                        Showcase →
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default DashboardRecommendationWidget;
