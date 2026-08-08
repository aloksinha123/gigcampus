import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const AdvancedSearch = () => {
    const { user, isAuthenticated } = useAuth();
    const { success, error } = useNotification();

    const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'freelancers'
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // Live Auto-complete Suggestions States
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef(null);
    const debounceTimer = useRef(null);

    // User Search History & Saved Filters States
    const [history, setHistory] = useState([]);
    const [savedFilters, setSavedFilters] = useState([]);
    const [saveName, setSaveName] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);

    // Client Projects list for AI Matching dropdown
    const [myProjects, setMyProjects] = useState([]);
    const [selectedProjForMatch, setSelectedProjForMatch] = useState('');

    // Project Filters State
    const [projectFilters, setProjectFilters] = useState({
        q: '',
        category: '',
        skills: '',
        minBudget: '',
        maxBudget: '',
        timeline: '',
        experienceLevel: '',
        status: 'open',
        postedWithin: '',
        location: '',
        sortBy: 'newest'
    });

    // Freelancer Filters State
    const [freelancerFilters, setFreelancerFilters] = useState({
        q: '',
        skills: '',
        rating: '',
        experience: '',
        hourlyRate: '',
        availability: '',
        completedProjects: '',
        responseRate: '',
        topRatedBadge: false,
        verifiedStatus: false,
        sortBy: 'highestRating'
    });

    const [bookmarkedProjectIds, setBookmarkedProjectIds] = useState(new Set());
    const [favoriteFreelancerIds, setFavoriteFreelancerIds] = useState(new Set());

    const categories = [
        'Web Development',
        'Mobile Development',
        'UI/UX Design',
        'Data Science',
        'Machine Learning',
        'Content Writing',
        'Digital Marketing',
        'Video Editing',
        'Graphic Design',
        'Other'
    ];

    useEffect(() => {
        // Load initial search history and saved filters if logged in
        if (isAuthenticated) {
            fetchSearchHistory();
            fetchSavedFilters();
            fetchBookmarks();
            fetchFavorites();
            if (user?.role === 'student') {
                fetchMyProjects();
            }
        }
        // Perform initial search
        triggerSearch();

        // Click outside listener for suggestions popup
        const handleClickOutside = (e) => {
            if (suggestionRef.current && !suggestionRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [activeTab, currentPage, selectedProjForMatch]);

    const fetchSearchHistory = async () => {
        try {
            const res = await api.search.getHistory();
            setHistory(res.data || []);
        } catch (err) {
            console.error('Failed to load search history:', err);
        }
    };

    const fetchBookmarks = async () => {
        try {
            const res = await api.favorites.getBookmarks({ limit: 100 });
            setBookmarkedProjectIds(new Set((res.data.projects || []).map(p => p._id)));
        } catch (err) {
            console.error('Failed to fetch bookmarks:', err);
        }
    };

    const fetchFavorites = async () => {
        try {
            const res = await api.favorites.getFavorites({ limit: 100 });
            setFavoriteFreelancerIds(new Set((res.data.freelancers || []).map(f => f._id)));
        } catch (err) {
            console.error('Failed to fetch favorites:', err);
        }
    };

    const toggleBookmark = async (projectId) => {
        try {
            const isBookmarked = bookmarkedProjectIds.has(projectId);
            if (isBookmarked) {
                await api.favorites.unbookmarkProject(projectId);
                setBookmarkedProjectIds(prev => {
                    const next = new Set(prev);
                    next.delete(projectId);
                    return next;
                });
                success('Bookmark removed!');
            } else {
                await api.favorites.bookmarkProject(projectId);
                setBookmarkedProjectIds(prev => {
                    const next = new Set(prev);
                    next.add(projectId);
                    return next;
                });
                success('Project bookmarked!');
            }
        } catch (err) {
            error(err.response?.data?.message || 'Bookmark toggle failed.');
        }
    };

    const toggleFavorite = async (freelancerId) => {
        try {
            const isFavorite = favoriteFreelancerIds.has(freelancerId);
            if (isFavorite) {
                await api.favorites.unfavoriteFreelancer(freelancerId);
                setFavoriteFreelancerIds(prev => {
                    const next = new Set(prev);
                    next.delete(freelancerId);
                    return next;
                });
                success('Freelancer removed from favorites!');
            } else {
                await api.favorites.favoriteFreelancer(freelancerId);
                setFavoriteFreelancerIds(prev => {
                    const next = new Set(prev);
                    next.add(freelancerId);
                    return next;
                });
                success('Freelancer added to favorites!');
            }
        } catch (err) {
            error(err.response?.data?.message || 'Favorite toggle failed.');
        }
    };

    const fetchSavedFilters = async () => {
        try {
            const res = await api.search.getSavedFilters();
            setSavedFilters(res.data || []);
        } catch (err) {
            console.error('Failed to load saved filters:', err);
        }
    };

    const fetchMyProjects = async () => {
        try {
            const res = await api.projects.getMy();
            setMyProjects((res.data || []).filter(p => p.status === 'open' || p.status === 'in_progress'));
        } catch (err) {
            console.error('Failed to load projects list:', err);
        }
    };

    const handleProjectFilterChange = (e) => {
        const { name, value } = e.target;
        setProjectFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleFreelancerFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFreelancerFilters(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setCurrentPage(1);
    };

    // Live search auto-complete query fetcher with debouncing
    const handleSearchInput = (val) => {
        if (activeTab === 'projects') {
            setProjectFilters(prev => ({ ...prev, q: val }));
        } else {
            setFreelancerFilters(prev => ({ ...prev, q: val }));
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!val.trim()) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        debounceTimer.current = setTimeout(async () => {
            try {
                const res = await api.search.suggestions({ q: val.trim() });
                setSuggestions(res.data || []);
                setShowSuggestions(true);
            } catch (err) {
                console.error(err);
            }
        }, 300);
    };

    const handleSelectSuggestion = (val) => {
        if (activeTab === 'projects') {
            setProjectFilters(prev => ({ ...prev, q: val }));
        } else {
            setFreelancerFilters(prev => ({ ...prev, q: val }));
        }
        setShowSuggestions(false);
        triggerSearch();
    };

    const triggerSearch = async () => {
        try {
            setLoading(true);
            let response;
            if (activeTab === 'projects') {
                const params = {
                    ...projectFilters,
                    page: currentPage,
                    limit: 6
                };
                response = await api.search.projects(params);
                setResults(response.data.projects || []);
                setTotalPages(response.data.totalPages || 1);
                setTotalResults(response.data.total || 0);

                // Add search log to history
                if (isAuthenticated && projectFilters.q.trim()) {
                    await api.search.addHistory({ query: projectFilters.q.trim(), filters: projectFilters });
                    fetchSearchHistory();
                }
            } else {
                const params = {
                    ...freelancerFilters,
                    projectId: selectedProjForMatch || undefined,
                    page: currentPage,
                    limit: 6
                };
                response = await api.search.freelancers(params);
                setResults(response.data.freelancers || []);
                setTotalPages(response.data.totalPages || 1);
                setTotalResults(response.data.total || 0);

                if (isAuthenticated && freelancerFilters.q.trim()) {
                    await api.search.addHistory({ query: freelancerFilters.q.trim(), filters: freelancerFilters });
                    fetchSearchHistory();
                }
            }
        } catch (err) {
            error('Failed to load search results.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleClearHistory = async () => {
        try {
            await api.search.clearHistory();
            success('Search history cleared!');
            setHistory([]);
        } catch (err) {
            error('Failed to clear search history.');
        }
    };

    const handleSaveFilters = async (e) => {
        e.preventDefault();
        if (!saveName.trim()) {
            error('Please enter a name for the saved filter.');
            return;
        }

        try {
            const currentFilters = activeTab === 'projects' ? projectFilters : freelancerFilters;
            await api.search.saveFilter({
                name: saveName.trim(),
                type: activeTab,
                filters: currentFilters
            });
            success(`✨ Filter "${saveName}" saved successfully!`);
            setSaveName('');
            setShowSaveModal(false);
            fetchSavedFilters();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to save filter.');
        }
    };

    const handleLoadSavedFilter = (sf) => {
        if (sf.type === 'projects') {
            setActiveTab('projects');
            setProjectFilters(sf.filters);
        } else {
            setActiveTab('freelancers');
            setFreelancerFilters(sf.filters);
        }
        setCurrentPage(1);
        success(`Applied saved filter: "${sf.name}"`);
    };

    const handleDeleteSavedFilter = async (id, e) => {
        e.stopPropagation();
        try {
            await api.search.deleteSavedFilter(id);
            success('Saved filter removed.');
            fetchSavedFilters();
        } catch (err) {
            error('Failed to delete saved filter.');
        }
    };

    const renderStars = (score) => {
        return (
            <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-xs">
                        {star <= Math.round(score) ? '★' : '☆'}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-800">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 italic">
                            Advanced <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Search Engine</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">Discover projects, find talent, and match capabilities using AI query routing</p>
                    </div>

                    <div className="flex flex-row gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <button
                            onClick={() => {
                                setActiveTab('projects');
                                setCurrentPage(1);
                            }}
                            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition active:scale-95 text-center min-h-[44px] ${
                                activeTab === 'projects'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            💼 Projects
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('freelancers');
                                setCurrentPage(1);
                            }}
                            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition active:scale-95 text-center min-h-[44px] ${
                                activeTab === 'freelancers'
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            🚀 Freelancers
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {/* Left Column - Filters Panel */}
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                                <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Filters Panel</h3>
                                {isAuthenticated && (
                                    <button
                                        onClick={() => setShowSaveModal(true)}
                                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300"
                                    >
                                        💾 Save Current
                                    </button>
                                )}
                            </div>

                            {activeTab === 'projects' ? (
                                /* Project Filters Form */
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Category</label>
                                        <select
                                            name="category"
                                            value={projectFilters.category}
                                            onChange={handleProjectFilterChange}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Experience Level</label>
                                        <select
                                            name="experienceLevel"
                                            value={projectFilters.experienceLevel}
                                            onChange={handleProjectFilterChange}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Any Level</option>
                                            <option value="entry">Entry Level</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="expert">Expert</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Skills Required</label>
                                        <input
                                            type="text"
                                            name="skills"
                                            value={projectFilters.skills}
                                            onChange={handleProjectFilterChange}
                                            placeholder="React, Node.js (comma-separated)"
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1.5 uppercase">Min Budget (₹)</label>
                                            <input
                                                type="number"
                                                name="minBudget"
                                                value={projectFilters.minBudget}
                                                onChange={handleProjectFilterChange}
                                                placeholder="1000"
                                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1.5 uppercase">Max Budget (₹)</label>
                                            <input
                                                type="number"
                                                name="maxBudget"
                                                value={projectFilters.maxBudget}
                                                onChange={handleProjectFilterChange}
                                                placeholder="25000"
                                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Timeline / Duration</label>
                                        <input
                                            type="text"
                                            name="timeline"
                                            value={projectFilters.timeline}
                                            onChange={handleProjectFilterChange}
                                            placeholder="e.g. 7 Days"
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Posted Within</label>
                                        <select
                                            name="postedWithin"
                                            value={projectFilters.postedWithin}
                                            onChange={handleProjectFilterChange}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="">Any time</option>
                                            <option value="1">Last 24 Hours</option>
                                            <option value="7">Last 7 Days</option>
                                            <option value="30">Last 30 Days</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Sorting</label>
                                        <select
                                            name="sortBy"
                                            value={projectFilters.sortBy}
                                            onChange={handleProjectFilterChange}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-blue-500 font-semibold"
                                        >
                                            <option value="newest">Newest Posted</option>
                                            <option value="oldest">Oldest Posted</option>
                                            <option value="highestBudget">Highest Budget</option>
                                            <option value="lowestBudget">Lowest Budget</option>
                                            <option value="mostBids">Most Proposals</option>
                                            {isAuthenticated && user?.role === 'freelancer' && (
                                                <option value="aiRecommended">✨ AI Recommended</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                /* Freelancer Filters Form */
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Minimum Rating</label>
                                        <select
                                            name="rating"
                                            value={freelancerFilters.rating}
                                            onChange={handleFreelancerFilterChange}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500"
                                        >
                                            <option value="">Any Rating</option>
                                            <option value="4.5">4.5+ Stars</option>
                                            <option value="4.0">4.0+ Stars</option>
                                            <option value="3.0">3.0+ Stars</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Experience Level</label>
                                        <select
                                            name="experience"
                                            value={freelancerFilters.experience}
                                            onChange={handleFreelancerFilterChange}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500"
                                        >
                                            <option value="">Any Experience</option>
                                            <option value="entry">Beginner (0-2 gigs completed)</option>
                                            <option value="intermediate">Intermediate (3-9 completed)</option>
                                            <option value="expert">Expert (10+ completed)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Skills</label>
                                        <input
                                            type="text"
                                            name="skills"
                                            value={freelancerFilters.skills}
                                            onChange={handleFreelancerFilterChange}
                                            placeholder="React, Python, Design"
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Max Hourly Rate (₹)</label>
                                        <input
                                            type="number"
                                            name="hourlyRate"
                                            value={freelancerFilters.hourlyRate}
                                            onChange={handleFreelancerFilterChange}
                                            placeholder="Hourly budget maximum limit"
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Min Completed Gigs</label>
                                        <input
                                            type="number"
                                            name="completedProjects"
                                            value={freelancerFilters.completedProjects}
                                            onChange={handleFreelancerFilterChange}
                                            placeholder="5"
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    {/* AI Match settings for client projects */}
                                    {isAuthenticated && user?.role === 'student' && (
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1.5 uppercase">✨ AI Skill Match Against Project</label>
                                            <select
                                                value={selectedProjForMatch}
                                                onChange={(e) => setSelectedProjForMatch(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500"
                                            >
                                                <option value="">My Profile Skills (Default)</option>
                                                {myProjects.map(p => (
                                                    <option key={p._id} value={p._id}>{p.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Boolean filters checkboxes */}
                                    <div className="space-y-2 pt-2">
                                        <label className="flex items-center space-x-2 text-slate-300 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="topRatedBadge"
                                                checked={freelancerFilters.topRatedBadge}
                                                onChange={handleFreelancerFilterChange}
                                                className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0 focus:ring-offset-0"
                                            />
                                            <span>🏆 Top Rated Badge Only</span>
                                        </label>

                                        <label className="flex items-center space-x-2 text-slate-300 font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="verifiedStatus"
                                                checked={freelancerFilters.verifiedStatus}
                                                onChange={handleFreelancerFilterChange}
                                                className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-0 focus:ring-offset-0"
                                            />
                                            <span>🛡️ Verified Status Only</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-slate-500 font-bold mb-1.5 uppercase">Sorting</label>
                                        <select
                                            name="sortBy"
                                            value={freelancerFilters.sortBy}
                                            onChange={handleFreelancerFilterChange}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500 font-semibold"
                                        >
                                            <option value="highestRating">Highest Ratings Score</option>
                                            <option value="mostProjects">Most Gigs Finished</option>
                                            <option value="mostReviews">Most Customer Reviews</option>
                                            <option value="newest">Newest Joining Date</option>
                                            <option value="aiMatchScore">✨ AI Match Score</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={triggerSearch}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-lg active:scale-95"
                            >
                                Apply All Filters
                            </button>
                        </div>

                        {/* Saved Filters Sidebar Section */}
                        {isAuthenticated && savedFilters.length > 0 && (
                            <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-800 pb-2">💾 Saved Filter Templates</span>
                                <div className="space-y-2">
                                    {savedFilters.map((sf) => (
                                        <div
                                            key={sf._id}
                                            onClick={() => handleLoadSavedFilter(sf)}
                                            className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl flex justify-between items-center hover:bg-slate-900/60 transition cursor-pointer group"
                                        >
                                            <div>
                                                <span className="font-bold text-white text-xs block truncate max-w-[120px]">{sf.name}</span>
                                                <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">
                                                    {sf.type === 'projects' ? '📁 Project criteria' : '👤 Freelancer criteria'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteSavedFilter(sf._id, e)}
                                                className="text-slate-500 hover:text-rose-500 p-1 font-bold text-xs opacity-0 group-hover:opacity-100 transition"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Results Area */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Search input with live suggestion drop panel */}
                        <div className="relative" ref={suggestionRef}>
                            <div className="flex bg-slate-900/50 rounded-3xl p-2 border border-slate-800 shadow-xl gap-2">
                                <input
                                    type="text"
                                    placeholder={activeTab === 'projects' ? "Search gigs title or criteria..." : "Search freelancer name or background details..."}
                                    value={activeTab === 'projects' ? projectFilters.q : freelancerFilters.q}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    className="flex-1 bg-transparent px-6 py-4 border-0 focus:outline-none focus:ring-0 text-slate-200 text-sm placeholder:text-slate-500"
                                />
                                <button
                                    onClick={triggerSearch}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-semibold transition active:scale-95 shadow-md shadow-indigo-600/10"
                                >
                                    Search
                                </button>
                            </div>

                            {/* Autocomplete Panel */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-50 animate-fade-in text-sm divide-y divide-slate-800/50">
                                    {suggestions.map((sug, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectSuggestion(sug)}
                                            className="w-full px-6 py-3 text-left text-slate-300 hover:bg-slate-850 hover:text-white transition flex items-center gap-3 font-medium"
                                        >
                                            <span>🔍</span>
                                            <span>{sug}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Clickable historical query shortcuts */}
                        {isAuthenticated && history.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-wide">Recent Searches:</span>
                                {history.map((h, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectSuggestion(h.query)}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full font-medium transition active:scale-95"
                                    >
                                        {h.query}
                                    </button>
                                ))}
                                <button
                                    onClick={handleClearHistory}
                                    className="text-slate-500 hover:text-slate-400 font-black uppercase text-[10px] tracking-widest pl-2"
                                >
                                    [Clear]
                                </button>
                            </div>
                        )}

                        {/* Search Results Display Area */}
                        {loading ? (
                            <div className="text-center py-24">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                                <p className="text-slate-500 mt-4 font-bold text-sm">Searching the database...</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-24 bg-slate-900/20 border border-slate-800 border-dashed rounded-3xl">
                                <span className="text-5xl inline-block mb-4 grayscale">📂</span>
                                <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-wider">No Matches Found</h3>
                                <p className="text-slate-500 text-xs">Try broadening your search query or relaxing filter criteria.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider px-2">
                                    <span>Query completed successfully</span>
                                    <span>{totalResults} matches returned</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeTab === 'projects' ? (
                                        /* Project Cards */
                                        results.map((project) => (
                                            <div key={project._id} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 hover:border-slate-700 transition flex flex-col justify-between shadow-xl">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="px-2 py-0.5 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                                {project.category}
                                                            </span>
                                                            {isAuthenticated && (
                                                                <button
                                                                    onClick={() => toggleBookmark(project._id)}
                                                                    className="text-slate-500 hover:text-blue-400 transition cursor-pointer text-xs"
                                                                    title={bookmarkedProjectIds.has(project._id) ? "Remove Bookmark" : "Bookmark Project"}
                                                                >
                                                                    {bookmarkedProjectIds.has(project._id) ? '💙' : '🤍'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {project.aiMatchScore !== undefined && (
                                                            <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                                                                ✨ Match {project.aiMatchScore}%
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <h4 className="font-bold text-white text-base line-clamp-1">{project.title}</h4>
                                                        <p className="text-slate-500 text-xs mt-1">Client: @{project.client?.username}</p>
                                                    </div>

                                                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 italic">
                                                        "{project.description}"
                                                    </p>

                                                    {project.skills?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {project.skills.map((s, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md text-[10px] font-semibold">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-6 mt-6 border-t border-slate-800/60 flex justify-between items-center gap-4">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-500 block uppercase">Budget Scope</span>
                                                        <span className="text-sm font-black italic text-blue-400">
                                                            ₹{project.budget?.min} - ₹{project.budget?.max}
                                                        </span>
                                                    </div>
                                                    <Link
                                                        to={`/projects/${project._id}`}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                                                    >
                                                        Details
                                                    </Link>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        /* Freelancer Cards */
                                        results.map((free) => (
                                            <div key={free._id} className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 hover:border-slate-700 transition flex flex-col justify-between shadow-xl">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            {free.verified && (
                                                                <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/20 text-blue-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                                    🛡️ Verified
                                                                </span>
                                                            )}
                                                            {free.reputation?.totalReviews >= 20 && free.reputation?.score >= 4.8 && (
                                                                <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                                    🏆 Top Rated
                                                                </span>
                                                            )}
                                                            {isAuthenticated && user?._id !== free._id && (
                                                                <button
                                                                    onClick={() => toggleFavorite(free._id)}
                                                                    className="text-slate-500 hover:text-purple-400 transition cursor-pointer text-xs"
                                                                    title={favoriteFreelancerIds.has(free._id) ? "Remove Favorite" : "Favorite Freelancer"}
                                                                >
                                                                    {favoriteFreelancerIds.has(free._id) ? '💙' : '🤍'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {free.aiMatchScore !== undefined && (
                                                            <span className="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                                                                ✨ Match {free.aiMatchScore}%
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-xl font-black text-purple-400">
                                                            {free.username ? free.username[0].toUpperCase() : 'U'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-white text-base">@{free.username}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {renderStars(free.reputation?.score || 0)}
                                                                <span className="text-[10px] text-slate-500 font-bold">({free.reputation?.totalReviews || 0} reviews)</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 italic">
                                                        {free.profile?.bio ? `"${free.profile.bio}"` : 'No biography provided yet.'}
                                                    </p>

                                                    {free.profile?.skills?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {free.profile.skills.map((s, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md text-[10px] font-semibold">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-6 mt-6 border-t border-slate-800/60 flex justify-between items-center gap-4">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-500 block uppercase">Hourly Rate</span>
                                                        <span className="text-sm font-black italic text-purple-400">
                                                            ₹{free.profile?.hourlyRate || 0}/hr
                                                        </span>
                                                    </div>
                                                    <Link
                                                        to={`/messages?user=${free._id}`}
                                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                                                    >
                                                        Hire Now
                                                    </Link>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Pagination controls */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-4 pt-6">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-slate-700 transition text-xs"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-slate-500 font-bold">Page {currentPage} of {totalPages}</span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl disabled:opacity-40 hover:bg-slate-700 transition text-xs"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Save Filter Modal Dialog */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-850 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h3 className="font-bold text-white text-base mb-2">Save Filter Configuration</h3>
                        <p className="text-slate-500 text-xs mb-4">Give this search criteria template a name to reload it later with one-click.</p>

                        <form onSubmit={handleSaveFilters} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Filter Template Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. React experts under 20k"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-indigo-500 text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-4 py-2 text-slate-400 bg-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-750 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                                >
                                    Save Filter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedSearch;
