import Project from '../models/Project.js';
import User from '../models/User.js';
import SearchHistory from '../models/SearchHistory.js';
import SavedFilter from '../models/SavedFilter.js';

// Structured logging helper
const logSearchActivity = ({ userId, query, filters, execTimeMs, resultsCount, requestId }) => {
    console.log(`
[SEARCH AUDIT LOG]
Request ID: ${requestId || 'N/A'}
User ID: ${userId || 'Anonymous'}
Search Query: "${query || ''}"
Filters Applied: ${JSON.stringify(filters || {})}
Execution Time: ${execTimeMs}ms
Results Count: ${resultsCount}
Timestamp: ${new Date().toISOString()}
`);
};

// @desc    Advanced Project Search
// @route   GET /api/v1/search/projects
// @access  Public (Authenticated for AI Recommended sorting)
export const searchProjects = async (req, res) => {
    const startTime = Date.now();
    try {
        const {
            q,
            query: queryText,
            category,
            skills,
            minBudget,
            maxBudget,
            timeline,
            experienceLevel,
            status = 'open',
            postedWithin,
            location,
            sortBy = 'newest',
            page = 1,
            limit = 10
        } = req.query;

        const searchText = q || queryText || '';
        const searchFilters = {};

        // 1. Build Query Filters
        const mongoQuery = {};

        // Keyword text search (uses MongoDB Text Index or Regex fallback)
        if (searchText.trim()) {
            mongoQuery.$text = { $search: searchText.trim() };
        }

        // Project category
        if (category) {
            mongoQuery.category = { $regex: new RegExp(`^${category}$`, 'i') };
        }

        // Skills (Skills required is an array of strings)
        if (skills) {
            const skillsList = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
            mongoQuery.skills = { $in: skillsList.map(s => new RegExp(`^${s}$`, 'i')) };
        }

        // Budget Range (match min/max range)
        if (minBudget || maxBudget) {
            mongoQuery.budget = {};
            if (minBudget) {
                mongoQuery['budget.max'] = { $gte: Number(minBudget) };
            }
            if (maxBudget) {
                mongoQuery['budget.min'] = { $lte: Number(maxBudget) };
            }
        }

        // Timeline
        if (timeline) {
            mongoQuery.timeline = { $regex: new RegExp(timeline, 'i') };
        }

        // Experience Level
        if (experienceLevel) {
            mongoQuery.experienceLevel = experienceLevel.toLowerCase();
        }

        // Project Status (Open, In Progress, Completed, etc.)
        if (status && status !== 'all') {
            mongoQuery.status = status.toLowerCase();
        }

        // Posted Within (in days)
        if (postedWithin) {
            const daysLimit = Number(postedWithin);
            if (!isNaN(daysLimit)) {
                const limitDate = new Date();
                limitDate.setDate(limitDate.getDate() - daysLimit);
                mongoQuery.createdAt = { $gte: limitDate };
            }
        }

        // Location (if project has a location or via client details)
        if (location) {
            // Check if location matches project fields (in case projects support location) or via Client populate
            mongoQuery.$or = [
                { location: { $regex: new RegExp(location, 'i') } }
            ];
        }

        // 2. Fetch and Sort Results
        let projectsQuery = Project.find(mongoQuery).populate('client', 'username profile.location');

        // Apply Sorting
        if (sortBy === 'oldest') {
            projectsQuery = projectsQuery.sort({ createdAt: 1 });
        } else if (sortBy === 'highestBudget') {
            projectsQuery = projectsQuery.sort({ 'budget.max': -1 });
        } else if (sortBy === 'lowestBudget') {
            projectsQuery = projectsQuery.sort({ 'budget.min': 1 });
        } else if (sortBy === 'mostBids') {
            projectsQuery = projectsQuery.sort({ bidsCount: -1 });
        } else if (sortBy === 'newest') {
            // Text search relevance score sort if text search was done
            if (mongoQuery.$text) {
                projectsQuery = projectsQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
            } else {
                projectsQuery = projectsQuery.sort({ createdAt: -1 });
            }
        }

        let projects = await projectsQuery;

        // In-memory sorting for AI Recommended (cosine skill match)
        if (sortBy === 'aiRecommended' && req.user) {
            const userSkills = req.user.profile?.skills || [];
            projects = projects.map(p => {
                const projSkills = p.skills || [];
                const matchingSkills = projSkills.filter(s => 
                    userSkills.some(us => us.toLowerCase() === s.toLowerCase())
                );
                const score = projSkills.length > 0 ? (matchingSkills.length / projSkills.length) * 100 : 0;
                return { ...p.toObject(), aiMatchScore: Math.round(score) };
            }).sort((a, b) => b.aiMatchScore - a.aiMatchScore);
        }

        // Pagination
        const total = projects.length;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const paginatedProjects = projects.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        const execTime = Date.now() - startTime;
        
        // Log search metadata
        logSearchActivity({
            userId: req.user?._id,
            query: searchText,
            filters: { category, skills, minBudget, maxBudget, timeline, experienceLevel, status, postedWithin, location, sortBy },
            execTimeMs: execTime,
            resultsCount: total,
            requestId: req.requestId
        });

        res.json({
            projects: paginatedProjects,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            total
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Advanced Freelancers Search
// @route   GET /api/v1/search/freelancers
// @access  Public (Authenticated for AI Match Score)
export const searchFreelancers = async (req, res) => {
    const startTime = Date.now();
    try {
        const {
            q,
            query: queryText,
            name,
            skills,
            rating,
            experience,
            hourlyRate,
            availability,
            completedProjects,
            responseRate,
            topRatedBadge,
            verifiedStatus,
            projectId,
            sortBy = 'highestRating',
            page = 1,
            limit = 10
        } = req.query;

        const searchText = q || queryText || name || '';
        
        // 1. Build Freelancer Query
        const mongoQuery = { role: 'freelancer', isActive: true };

        // Name/username search
        if (searchText.trim()) {
            mongoQuery.$or = [
                { username: { $regex: new RegExp(searchText.trim(), 'i') } },
                { 'profile.fullName': { $regex: new RegExp(searchText.trim(), 'i') } },
                { 'profile.bio': { $regex: new RegExp(searchText.trim(), 'i') } }
            ];
        }

        // Skills matching
        if (skills) {
            const skillsList = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
            mongoQuery['profile.skills'] = { $in: skillsList.map(s => new RegExp(`^${s}$`, 'i')) };
        }

        // Ratings (Min rating score)
        if (rating) {
            mongoQuery['reputation.score'] = { $gte: Number(rating) };
        }

        // Completed Projects count
        if (completedProjects) {
            mongoQuery['reputation.completedProjects'] = { $gte: Number(completedProjects) };
        }

        // Hourly Rate filter (Max Rate)
        if (hourlyRate) {
            mongoQuery['profile.hourlyRate'] = { $lte: Number(hourlyRate) };
        }

        // Availability status
        if (availability) {
            mongoQuery['profile.availability'] = availability === 'true';
        }

        // Response Rate (Minimum response rate)
        if (responseRate) {
            mongoQuery['reputation.responseRate'] = { $gte: Number(responseRate) };
        }

        // Top Rated Badge status (Reviews >= 20, rating >= 4.8)
        if (topRatedBadge === 'true') {
            mongoQuery['reputation.totalReviews'] = { $gte: 20 };
            mongoQuery['reputation.score'] = { $gte: 4.8 };
        }

        // Verified Status
        if (verifiedStatus === 'true') {
            mongoQuery.verified = true;
        }

        // Experience Level filter (can map to completed projects threshold)
        if (experience) {
            const exp = experience.toLowerCase();
            if (exp === 'entry') {
                mongoQuery['reputation.completedProjects'] = { $lte: 2 };
            } else if (exp === 'intermediate') {
                mongoQuery['reputation.completedProjects'] = { $gt: 2, $lt: 10 };
            } else if (exp === 'expert') {
                mongoQuery['reputation.completedProjects'] = { $gte: 10 };
            }
        }

        // 2. Query and Sort
        let freelancersQuery = User.find(mongoQuery);

        if (sortBy === 'mostProjects') {
            freelancersQuery = freelancersQuery.sort({ 'reputation.completedProjects': -1 });
        } else if (sortBy === 'mostReviews') {
            freelancersQuery = freelancersQuery.sort({ 'reputation.totalReviews': -1 });
        } else if (sortBy === 'newest') {
            freelancersQuery = freelancersQuery.sort({ createdAt: -1 });
        } else if (sortBy === 'highestRating') {
            freelancersQuery = freelancersQuery.sort({ 'reputation.score': -1 });
        }

        let freelancers = await freelancersQuery;

        // In-memory sorting for AI Match Score (match project skills required vs freelancer skills)
        if (sortBy === 'aiMatchScore' && projectId) {
            try {
                const targetProject = await Project.findById(projectId);
                if (targetProject) {
                    const projectSkills = targetProject.skills || [];
                    freelancers = freelancers.map(f => {
                        const freeSkills = f.profile?.skills || [];
                        const matchCount = projectSkills.filter(s =>
                            freeSkills.some(fs => fs.toLowerCase() === s.toLowerCase())
                        ).length;
                        const score = projectSkills.length > 0 ? (matchCount / projectSkills.length) * 100 : 0;
                        return { ...f.getPublicProfile(), aiMatchScore: Math.round(score) };
                    }).sort((a, b) => b.aiMatchScore - a.aiMatchScore);
                }
            } catch (err) {
                console.error('Failed to calculate AI Match score:', err);
            }
        } else if (sortBy === 'aiMatchScore' && req.user) {
            // Fallback matching: match project creator skills or match freelancer vs client preferences
            const clientSkills = req.user.profile?.skills || [];
            freelancers = freelancers.map(f => {
                const freeSkills = f.profile?.skills || [];
                const matchCount = clientSkills.filter(s =>
                    freeSkills.some(fs => fs.toLowerCase() === s.toLowerCase())
                ).length;
                const score = clientSkills.length > 0 ? (matchCount / clientSkills.length) * 100 : 0;
                return { ...f.getPublicProfile(), aiMatchScore: Math.round(score) };
            }).sort((a, b) => b.aiMatchScore - a.aiMatchScore);
        } else {
            // Clean/sanitize public profile representation
            freelancers = freelancers.map(f => f.getPublicProfile());
        }

        // Pagination
        const total = freelancers.length;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const paginatedFreelancers = freelancers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        const execTime = Date.now() - startTime;
        
        logSearchActivity({
            userId: req.user?._id,
            query: searchText,
            filters: { rating, experience, hourlyRate, availability, completedProjects, topRatedBadge, verifiedStatus, sortBy },
            execTimeMs: execTime,
            resultsCount: total,
            requestId: req.requestId
        });

        res.json({
            freelancers: paginatedFreelancers,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            total
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Live search suggestions auto-complete
// @route   GET /api/v1/search/suggestions
// @access  Public
export const getSearchSuggestions = async (req, res) => {
    try {
        const { q = '' } = req.query;
        if (!q.trim()) {
            return res.json([]);
        }

        const queryRegex = new RegExp(q.trim(), 'i');
        const suggestions = new Set();

        // 1. Match against Project Categories
        const staticCategories = [
            'Web Development', 'Mobile Development', 'UI/UX Design', 'Data Science', 
            'Machine Learning', 'Content Writing', 'Digital Marketing', 'Video Editing', 
            'Graphic Design', 'development', 'design', 'writing', 'tutoring', 'marketing', 'other'
        ];
        staticCategories.forEach(cat => {
            if (queryRegex.test(cat)) {
                suggestions.add(cat);
            }
        });

        // 2. Match against project skills
        const matchingProjects = await Project.find({ skills: queryRegex }).limit(5);
        matchingProjects.forEach(p => {
            p.skills.forEach(skill => {
                if (queryRegex.test(skill)) {
                    suggestions.add(skill);
                }
            });
        });

        // 3. Match against Freelancer skills
        const matchingFreelancers = await User.find({ role: 'freelancer', 'profile.skills': queryRegex }).limit(5);
        matchingFreelancers.forEach(f => {
            f.profile?.skills?.forEach(skill => {
                if (queryRegex.test(skill)) {
                    suggestions.add(skill);
                }
            });
        });

        // 4. Match against popular query history logs
        const popularHistory = await SearchHistory.find({ query: queryRegex }).limit(5);
        popularHistory.forEach(h => {
            suggestions.add(h.query);
        });

        // Convert Set to array and cap at 8 items
        const results = Array.from(suggestions).slice(0, 8);
        res.json(results);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get user search history
// @route   GET /api/v1/search/history
// @access  Private
export const getSearchHistory = async (req, res) => {
    try {
        const history = await SearchHistory.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Add query to user search history (capped at 10 items)
// @route   POST /api/v1/search/history
// @access  Private
export const addSearchHistory = async (req, res) => {
    try {
        const { query, filters = {} } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({ message: 'Query string is required.' });
        }

        // If query exists, update timestamp; otherwise create new
        const existing = await SearchHistory.findOne({ user: req.user._id, query: query.trim() });
        if (existing) {
            existing.createdAt = new Date();
            existing.filters = filters;
            await existing.save();
            return res.json(existing);
        }

        const newHistory = await SearchHistory.create({
            user: req.user._id,
            query: query.trim(),
            filters
        });

        // Cap history to 10 entries by removing older ones
        const count = await SearchHistory.countDocuments({ user: req.user._id });
        if (count > 10) {
            const oldest = await SearchHistory.find({ user: req.user._id })
                .sort({ createdAt: 1 })
                .limit(count - 10);
            const oldestIds = oldest.map(h => h._id);
            await SearchHistory.deleteMany({ _id: { $in: oldestIds } });
        }

        res.status(201).json(newHistory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Clear search history
// @route   DELETE /api/v1/search/history
// @access  Private
export const clearSearchHistory = async (req, res) => {
    try {
        await SearchHistory.deleteMany({ user: req.user._id });
        res.json({ message: 'Search history cleared successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Save custom filter
// @route   POST /api/v1/search/save-filter
// @access  Private
export const saveFilter = async (req, res) => {
    try {
        const { name, type, filters } = req.body;
        if (!name || !type || !filters) {
            return res.status(400).json({ message: 'Name, type (projects/freelancers), and filters object are required.' });
        }

        const saved = await SavedFilter.create({
            user: req.user._id,
            name,
            type,
            filters
        });

        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get user's saved filters
// @route   GET /api/v1/search/saved-filters
// @access  Private
export const getSavedFilters = async (req, res) => {
    try {
        const saved = await SavedFilter.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(saved);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete custom saved filter
// @route   DELETE /api/v1/search/saved-filters/:id
// @access  Private
export const deleteSavedFilter = async (req, res) => {
    try {
        const deleted = await SavedFilter.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!deleted) {
            return res.status(404).json({ message: 'Saved filter not found.' });
        }
        res.json({ message: 'Saved filter deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
