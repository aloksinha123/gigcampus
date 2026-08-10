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
        <div className="min-h-screen bg-gc-near">
            <Navbar variant="dark" />

            <div className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-gc-border">
                    <div>
                        <h1 className="text-4xl font-black text-gc-navy mb-2">
                            Advanced <span className="gc-gradient-text">Search Engine</span>
                        </h1>
                        <p className="text-gc-muted font-medium text-sm">Discover projects, find talent, and match capabilities using AI query routing</p>
                    </div>

                    <div className="flex flex-row gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <button
                            onClick={() => {
                                setActiveTab('projects');
                                setCurrentPage(1);
                            }}
                            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-gc font-black text-xs uppercase tracking-wider transition active:scale-95 text-center min-h-[44px] ${
                                activeTab === 'projects'
                                    ? 'bg-gc-blue text-white shadow-lg'
                                    : 'bg-gc-surface text-gc-muted hover:text-gc-slate'
                            }`}
                        >
                            💼 Projects
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('freelancers');
                                setCurrentPage(1);
                            }}
                            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-3 rounded-gc font-black text-xs uppercase tracking-wider transition active:scale-95 text-center min-h-[44px] ${
                                activeTab === 'freelancers'
                                    ? 'bg-gc-blue text-white shadow-lg'
                                    : 'bg-gc-surface text-gc-muted hover:text-gc-slate'
                            }`}
                        >
                            🚀 Freelancers
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {/* Left Column - Filters Panel */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-gc-xl border border-gc-border shadow-gc space-y-6">
                            <div className="flex justify-between items-center pb-4 border-b border-gc-border">
                                <h3 className="font-bold text-sm text-gc-navy uppercase tracking-wider">Filters Panel</h3>
                                {isAuthenticated && (
                                    <button
                                        onClick={() => setShowSaveModal(true)}
                                        className="text-[10px] font-black text-gc-blue uppercase tracking-widest hover:text-gc-navy"
                                    >
                                        💾 Save Current
                                    </button>
                                )}
                            </div>

                            {activeTab === 'projects' ? (
                                /* Project Filters Form */
                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Category</label>
                                        <select
                                            name="category"
                                            value={projectFilters.category}
                                            onChange={handleProjectFilterChange}
                                            className="gc-input"
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Experience Level</label>
                                        <select
                                            name="experienceLevel"
                                            value={projectFilters.experienceLevel}
                                            onChange={handleProjectFilterChange}
                                            className="gc-input"
                                        >
                                            <option value="">Any Level</option>
                                            <option value="entry">Entry Level</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="expert">Expert</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Skills Required</label>
                                        <input
                                            type="text"
                                            name="skills"
                                            value={projectFilters.skills}
                                            onChange={handleProjectFilterChange}
                                            placeholder="React, Node.js (comma-separated)"
                                            className="gc-input"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-gc-muted font-bold mb-1.5 uppercase">Min Budget (₹)</label>
                                            <input
                                                type="number"
                                                name="minBudget"
                                                value={projectFilters.minBudget}
                                                onChange={handleProjectFilterChange}
                                                placeholder="1000"
                                                className="gc-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gc-muted font-bold mb-1.5 uppercase">Max Budget (₹)</label>
                                            <input
                                                type="number"
                                                name="maxBudget"
                                                value={projectFilters.maxBudget}
                                                onChange={handleProjectFilterChange}
                                                placeholder="25000"
                                                className="gc-input"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Timeline / Duration</label>
                                        <input
                                            type="text"
                                            name="timeline"
                                            value={projectFilters.timeline}
                                            onChange={handleProjectFilterChange}
                                            placeholder="e.g. 7 Days"
                                            className="gc-input"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Posted Within</label>
                                        <select
                                            name="postedWithin"
                                            value={projectFilters.postedWithin}
                                            onChange={handleProjectFilterChange}
                                            className="gc-input"
                                        >
                                            <option value="">Any time</option>
                                            <option value="1">Last 24 Hours</option>
                                            <option value="7">Last 7 Days</option>
                                            <option value="30">Last 30 Days</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Sorting</label>
                                        <select
                                            name="sortBy"
                                            value={projectFilters.sortBy}
                                            onChange={handleProjectFilterChange}
                                            className="gc-input font-semibold"
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
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Minimum Rating</label>
                                        <select
                                            name="rating"
                                            value={freelancerFilters.rating}
                                            onChange={handleFreelancerFilterChange}
                                            className="gc-input"
                                        >
                                            <option value="">Any Rating</option>
                                            <option value="4.5">4.5+ Stars</option>
                                            <option value="4.0">4.0+ Stars</option>
                                            <option value="3.0">3.0+ Stars</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Experience Level</label>
                                        <select
                                            name="experience"
                                            value={freelancerFilters.experience}
                                            onChange={handleFreelancerFilterChange}
                                            className="gc-input"
                                        >
                                            <option value="">Any Experience</option>
                                            <option value="entry">Beginner (0-2 gigs completed)</option>
                                            <option value="intermediate">Intermediate (3-9 completed)</option>
                                            <option value="expert">Expert (10+ completed)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Skills</label>
                                        <input
                                            type="text"
                                            name="skills"
                                            value={freelancerFilters.skills}
                                            onChange={handleFreelancerFilterChange}
                                            placeholder="React, Python, Design"
                                            className="gc-input"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Max Hourly Rate (₹)</label>
                                        <input
                                            type="number"
                                            name="hourlyRate"
                                            value={freelancerFilters.hourlyRate}
                                            onChange={handleFreelancerFilterChange}
                                            placeholder="Hourly budget maximum limit"
                                            className="gc-input"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Min Completed Gigs</label>
                                        <input
                                            type="number"
                                            name="completedProjects"
                                            value={freelancerFilters.completedProjects}
                                            onChange={handleFreelancerFilterChange}
                                            placeholder="5"
                                            className="gc-input"
                                        />
                                    </div>

                                    {/* AI Match settings for client projects */}
                                    {isAuthenticated && user?.role === 'student' && (
                                        <div>
                                            <label className="block text-gc-muted font-bold mb-1.5 uppercase">✨ AI Skill Match Against Project</label>
                                            <select
                                                value={selectedProjForMatch}
                                                onChange={(e) => setSelectedProjForMatch(e.target.value)}
                                                className="gc-input"
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
                                        <label className="flex items-center space-x-2 text-gc-slate font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="topRatedBadge"
                                                checked={freelancerFilters.topRatedBadge}
                                                onChange={handleFreelancerFilterChange}
                                                className="accent-gc-blue"
                                            />
                                            <span>🏆 Top Rated Badge Only</span>
                                        </label>

                                        <label className="flex items-center space-x-2 text-gc-slate font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="verifiedStatus"
                                                checked={freelancerFilters.verifiedStatus}
                                                onChange={handleFreelancerFilterChange}
                                                className="accent-gc-blue"
                                            />
                                            <span>🛡️ Verified Status Only</span>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-gc-muted font-bold mb-1.5 uppercase">Sorting</label>
                                        <select
                                            name="sortBy"
                                            value={freelancerFilters.sortBy}
                                            onChange={handleFreelancerFilterChange}
                                            className="gc-input font-semibold"
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
                                className="w-full py-3 bg-gc-blue hover:bg-gc-navy text-white rounded-gc font-bold text-xs uppercase tracking-wider transition shadow-lg active:scale-95"
                            >
                                Apply All Filters
                            </button>
                        </div>

                        {/* Saved Filters Sidebar Section */}
                        {isAuthenticated && savedFilters.length > 0 && (
                            <div className="bg-white p-5 rounded-gc-xl border border-gc-border shadow-gc space-y-4">
                                <span className="text-[10px] font-black text-gc-muted uppercase tracking-wider block border-b border-gc-border pb-2">💾 Saved Filter Templates</span>
                                <div className="space-y-2">
                                    {savedFilters.map((sf) => (
                                        <div
                                            key={sf._id}
                                            onClick={() => handleLoadSavedFilter(sf)}
                                            className="p-3 bg-gc-surface border border-gc-border rounded-gc flex justify-between items-center hover:bg-gc-soft transition cursor-pointer group"
                                        >
                                            <div>
                                                <span className="font-bold text-gc-navy text-xs block truncate max-w-[120px]">{sf.name}</span>
                                                <span className="text-[8px] uppercase font-bold text-gc-muted tracking-wider">
                                                    {sf.type === 'projects' ? '📁 Project criteria' : '👤 Freelancer criteria'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteSavedFilter(sf._id, e)}
                                                className="text-gc-muted hover:text-gc-danger p-1 font-bold text-xs opacity-0 group-hover:opacity-100 transition"
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
                            <div className="flex bg-white rounded-gc-xl p-2 border border-gc-border shadow-gc gap-2">
                                <input
                                    type="text"
                                    placeholder={activeTab === 'projects' ? "Search gigs title or criteria..." : "Search freelancer name or background details..."}
                                    value={activeTab === 'projects' ? projectFilters.q : freelancerFilters.q}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                    className="flex-1 gc-input border-0 focus:outline-none focus:ring-0"
                                />
                                <button
                                    onClick={triggerSearch}
                                    className="px-6 py-3 bg-gc-blue hover:bg-gc-navy text-white rounded-gc text-sm font-semibold transition active:scale-95 shadow-md"
                                >
                                    Search
                                </button>
                            </div>

                            {/* Autocomplete Panel */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gc-border rounded-gc-xl overflow-hidden shadow-2xl z-50 animate-fade-in text-sm divide-y divide-gc-border">
                                    {suggestions.map((sug, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectSuggestion(sug)}
                                            className="w-full px-6 py-3 text-left text-gc-slate hover:bg-gc-surface hover:text-gc-navy transition flex items-center gap-3 font-medium"
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
                                <span className="text-gc-muted font-bold uppercase tracking-wide">Recent Searches:</span>
                                {history.map((h, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectSuggestion(h.query)}
                                        className="px-3 py-1 bg-gc-surface hover:bg-gc-soft text-gc-slate rounded-full font-medium transition active:scale-95 border border-gc-border"
                                    >
                                        {h.query}
                                    </button>
                                ))}
                                <button
                                    onClick={handleClearHistory}
                                    className="text-gc-muted hover:text-gc-slate font-black uppercase text-[10px] tracking-widest pl-2"
                                >
                                    [Clear]
                                </button>
                            </div>
                        )}

                        {/* Search Results Display Area */}
                        {loading ? (
                            <div className="text-center py-24">
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gc-blue mx-auto"></div>
                                <p className="text-gc-muted mt-4 font-bold text-sm">Searching the database...</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-24 bg-white border border-gc-border border-dashed rounded-gc-xl">
                                <span className="text-5xl inline-block mb-4 grayscale">📂</span>
                                <h3 className="text-lg font-bold text-gc-navy mb-1 uppercase tracking-wider">No Matches Found</h3>
                                <p className="text-gc-muted text-xs">Try broadening your search query or relaxing filter criteria.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center text-xs text-gc-muted font-bold uppercase tracking-wider px-2">
                                    <span>Query completed successfully</span>
                                    <span>{totalResults} matches returned</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeTab === 'projects' ? (
                                        /* Project Cards */
                                        results.map((project) => (
                                            <div key={project._id} className="bg-white border border-gc-border rounded-gc-xl p-6 hover:shadow-gc-md transition flex flex-col justify-between shadow-gc">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="px-2 py-0.5 bg-gc-soft text-gc-blue border border-gc-border text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                                {project.category}
                                                            </span>
                                                            {isAuthenticated && (
                                                                <button
                                                                    onClick={() => toggleBookmark(project._id)}
                                                                    className="text-gc-muted hover:text-gc-blue transition cursor-pointer text-xs"
                                                                    title={bookmarkedProjectIds.has(project._id) ? "Remove Bookmark" : "Bookmark Project"}
                                                                >
                                                                    {bookmarkedProjectIds.has(project._id) ? '💙' : '🤍'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {project.aiMatchScore !== undefined && (
                                                            <span className="px-2 py-0.5 bg-gc-soft text-gc-blue border border-gc-border text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                                                                ✨ Match {project.aiMatchScore}%
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <h4 className="font-bold text-gc-navy text-base line-clamp-1">{project.title}</h4>
                                                        <p className="text-gc-muted text-xs mt-1">Client: @{project.client?.username}</p>
                                                    </div>

                                                    <p className="text-gc-slate text-xs leading-relaxed line-clamp-3 italic">
                                                        "{project.description}"
                                                    </p>

                                                    {project.skills?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {project.skills.map((s, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-gc-surface text-gc-slate rounded-md text-[10px] font-semibold border border-gc-border">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-6 mt-6 border-t border-gc-border flex justify-between items-center gap-4">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gc-muted block uppercase">Budget Scope</span>
                                                        <span className="text-sm font-black italic text-gc-blue">
                                                            ₹{project.budget?.min} - ₹{project.budget?.max}
                                                        </span>
                                                    </div>
                                                    <Link
                                                        to={`/projects/${project._id}`}
                                                        className="px-4 py-2 bg-gc-surface hover:bg-gc-soft text-gc-navy border border-gc-border rounded-gc text-xs font-bold transition"
                                                    >
                                                        Details
                                                    </Link>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        /* Freelancer Cards */
                                        results.map((free) => (
                                            <div key={free._id} className="bg-white border border-gc-border rounded-gc-xl p-6 hover:shadow-gc-md transition flex flex-col justify-between shadow-gc">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            {free.verified && (
                                                                <span className="px-2 py-0.5 bg-gc-soft text-gc-blue border border-gc-border text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                                    🛡️ Verified
                                                                </span>
                                                            )}
                                                            {free.reputation?.totalReviews >= 20 && free.reputation?.score >= 4.8 && (
                                                                <span className="px-2 py-0.5 bg-gc-soft text-gc-blue border border-gc-border text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                                    🏆 Top Rated
                                                                </span>
                                                            )}
                                                            {isAuthenticated && user?._id !== free._id && (
                                                                <button
                                                                    onClick={() => toggleFavorite(free._id)}
                                                                    className="text-gc-muted hover:text-gc-blue transition cursor-pointer text-xs"
                                                                    title={favoriteFreelancerIds.has(free._id) ? "Remove Favorite" : "Favorite Freelancer"}
                                                                >
                                                                    {favoriteFreelancerIds.has(free._id) ? '💙' : '🤍'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {free.aiMatchScore !== undefined && (
                                                            <span className="px-2 py-0.5 bg-gc-soft text-gc-blue border border-gc-border text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                                                                ✨ Match {free.aiMatchScore}%
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-gc-soft rounded-2xl flex items-center justify-center text-xl font-black text-gc-blue">
                                                            {free.username ? free.username[0].toUpperCase() : 'U'}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-gc-navy text-base">@{free.username}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {renderStars(free.reputation?.score || 0)}
                                                                <span className="text-[10px] text-gc-muted font-bold">({free.reputation?.totalReviews || 0} reviews)</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-gc-slate text-xs leading-relaxed line-clamp-3 italic">
                                                        {free.profile?.bio ? `"${free.profile.bio}"` : 'No biography provided yet.'}
                                                    </p>

                                                    {free.profile?.skills?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {free.profile.skills.map((s, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-gc-surface text-gc-slate rounded-md text-[10px] font-semibold border border-gc-border">
                                                                    {s}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-6 mt-6 border-t border-gc-border flex justify-between items-center gap-4">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gc-muted block uppercase">Hourly Rate</span>
                                                        <span className="text-sm font-black italic text-gc-navy">
                                                            ₹{free.profile?.hourlyRate || 0}/hr
                                                        </span>
                                                    </div>
                                                    <Link
                                                        to={`/messages?user=${free._id}`}
                                                        className="px-4 py-2 bg-gc-surface hover:bg-gc-soft text-gc-navy border border-gc-border rounded-gc text-xs font-bold transition"
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
                                            className="px-4 py-2 bg-gc-surface text-gc-navy border border-gc-border font-bold rounded-gc disabled:opacity-40 hover:bg-gc-soft transition text-xs"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-gc-muted font-bold">Page {currentPage} of {totalPages}</span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-gc-surface text-gc-navy border border-gc-border font-bold rounded-gc disabled:opacity-40 hover:bg-gc-soft transition text-xs"
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
                <div className="fixed inset-0 bg-gc-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-gc-xl p-6 border border-gc-border shadow-2xl animate-in zoom-in-95 duration-300">
                        <h3 className="font-bold text-gc-navy text-base mb-2">Save Filter Configuration</h3>
                        <p className="text-gc-muted text-xs mb-4">Give this search criteria template a name to reload it later with one-click.</p>

                        <form onSubmit={handleSaveFilters} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gc-muted uppercase tracking-widest mb-1.5">Filter Template Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. React experts under 20k"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    className="gc-input"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSaveModal(false)}
                                    className="px-4 py-2 text-gc-muted bg-gc-surface rounded-gc text-xs font-semibold hover:bg-gc-soft transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-gc-blue hover:bg-gc-navy text-white rounded-gc text-xs font-bold transition"
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
