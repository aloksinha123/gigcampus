import RecentlyViewed from '../models/RecentlyViewed.js';
import ProjectFavorite from '../models/ProjectFavorite.js';
import FreelancerFavorite from '../models/FreelancerFavorite.js';
import SearchHistory from '../models/SearchHistory.js';
import SavedFilter from '../models/SavedFilter.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Bid from '../models/Bid.js';

// Structured logging helper
const logRecommendationActivity = ({ userId, action, entityId, execTimeMs, resultsCount, requestId }) => {
    console.log(`
[RECOMMENDATION AUDIT LOG]
Request ID: ${requestId || 'N/A'}
User ID: ${userId || 'Anonymous'}
Action: ${action}
Entity ID: ${entityId || 'N/A'}
Recommendation Request: true
Execution Time: ${execTimeMs}ms
Result Count: ${resultsCount}
Timestamp: ${new Date().toISOString()}
`);
};

// @desc    Track recently viewed project or freelancer
// @route   POST /api/v1/recommendations/recently-viewed
// @access  Private
export const trackRecentlyViewed = async (req, res) => {
    const startTime = Date.now();
    try {
        const { entityType, entityId } = req.body;
        if (!entityType || !entityId) {
            return res.status(400).json({ message: 'entityType (project/freelancer) and entityId are required.' });
        }

        const query = {
            user: req.user._id,
            entityType
        };

        if (entityType === 'project') {
            query.project = entityId;
            query.freelancer = null;
            // Verify project exists
            const projectExists = await Project.findById(entityId);
            if (!projectExists) return res.status(404).json({ message: 'Project not found' });
        } else {
            query.freelancer = entityId;
            query.project = null;
            // Verify freelancer exists
            const freelancerExists = await User.findOne({ _id: entityId, role: 'freelancer' });
            if (!freelancerExists) return res.status(404).json({ message: 'Freelancer profile not found' });
        }

        // Upsert record (updating viewedAt timestamp)
        await RecentlyViewed.findOneAndUpdate(
            query,
            { viewedAt: new Date() },
            { upsert: true, new: true }
        );

        // Cap count to 20 by rotating out older items
        const count = await RecentlyViewed.countDocuments({ user: req.user._id, entityType });
        if (count > 20) {
            const oldest = await RecentlyViewed.find({ user: req.user._id, entityType })
                .sort({ viewedAt: 1 })
                .limit(count - 20);
            const oldestIds = oldest.map(rv => rv._id);
            await RecentlyViewed.deleteMany({ _id: { $in: oldestIds } });
        }

        const execTime = Date.now() - startTime;
        logRecommendationActivity({
            userId: req.user._id,
            action: `VIEW_${entityType.toUpperCase()}`,
            entityId,
            execTimeMs: execTime,
            resultsCount: 1,
            requestId: req.requestId
        });

        res.json({ success: true, message: 'View tracked successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get recently viewed projects or freelancers
// @route   GET /api/v1/recommendations/recently-viewed
// @access  Private
export const getRecentlyViewed = async (req, res) => {
    const startTime = Date.now();
    try {
        const { entityType } = req.query;
        
        const filter = { user: req.user._id };
        if (entityType) {
            filter.entityType = entityType;
        }

        const list = await RecentlyViewed.find(filter)
            .populate({
                path: 'project',
                populate: { path: 'client', select: 'username profile.location' }
            })
            .populate('freelancer', 'username profile reputation verified isOnline lastSeen')
            .sort({ viewedAt: -1 })
            .limit(20);

        // Sanitize return values
        const sanitizedList = list.map(item => {
            const result = {
                _id: item._id,
                entityType: item.entityType,
                viewedAt: item.viewedAt
            };
            if (item.entityType === 'project') {
                result.project = item.project;
            } else if (item.entityType === 'freelancer' && item.freelancer) {
                result.freelancer = typeof item.freelancer.getPublicProfile === 'function'
                    ? item.freelancer.getPublicProfile()
                    : item.freelancer;
            }
            return result;
        }).filter(item => item.project || item.freelancer);

        const execTime = Date.now() - startTime;
        logRecommendationActivity({
            userId: req.user._id,
            action: 'GET_RECENTLY_VIEWED',
            execTimeMs: execTime,
            resultsCount: sanitizedList.length,
            requestId: req.requestId
        });

        res.json(sanitizedList);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Clear recently viewed history
// @route   DELETE /api/v1/recommendations/recently-viewed
// @access  Private
export const clearRecentlyViewed = async (req, res) => {
    const startTime = Date.now();
    try {
        const { entityType } = req.query;
        const filter = { user: req.user._id };
        if (entityType) {
            filter.entityType = entityType;
        }

        await RecentlyViewed.deleteMany(filter);

        const execTime = Date.now() - startTime;
        logRecommendationActivity({
            userId: req.user._id,
            action: 'CLEAR_RECENTLY_VIEWED',
            execTimeMs: execTime,
            resultsCount: 0,
            requestId: req.requestId
        });

        res.json({ success: true, message: 'Recently viewed history cleared.' });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get Personalized Project Recommendations for Freelancer
// @route   GET /api/v1/recommendations/projects
// @access  Private
export const getProjectRecommendations = async (req, res) => {
    const startTime = Date.now();
    try {
        if (req.user.role !== 'freelancer') {
            return res.status(403).json({ message: 'Only freelancers can get project recommendations.' });
        }

        const userSkills = req.user.profile?.skills || [];
        
        // 1. Gather Freelancer preferences/activity
        const [bookmarks, bids, views, history, savedFilters] = await Promise.all([
            ProjectFavorite.find({ user: req.user._id }),
            Bid.find({ freelancer: req.user._id }),
            RecentlyViewed.find({ user: req.user._id, entityType: 'project' }).populate('project'),
            SearchHistory.find({ user: req.user._id }),
            SavedFilter.find({ user: req.user._id, type: 'projects' })
        ]);

        // Categories from history
        const activeCategories = new Set();
        bookmarks.forEach(b => b.project?.category && activeCategories.add(b.project.category));
        views.forEach(v => v.project?.category && activeCategories.add(v.project.category));
        savedFilters.forEach(sf => sf.filters?.category && activeCategories.add(sf.filters.category));

        // Keywords from history
        const searchKeywords = history.map(h => h.query.toLowerCase().trim()).filter(Boolean);

        // Clients previously bid on
        const bidClientIds = new Set();
        try {
            const populatedBids = await Bid.find({ freelancer: req.user._id }).populate('project');
            populatedBids.forEach(b => b.project?.client && bidClientIds.add(b.project.client.toString()));
        } catch (bidErr) {
            console.error('Bid collection lookup error:', bidErr);
        }

        // Fetch all open projects
        const openProjects = await Project.find({ status: 'open' }).populate('client', 'username profile.location');

        let recommendations = [];

        // 2. Score calculation
        for (const project of openProjects) {
            let score = 0;
            const reasons = [];

            // A. Skill Match (40%)
            const projSkills = project.skills || [];
            if (projSkills.length > 0 && userSkills.length > 0) {
                const intersection = projSkills.filter(s =>
                    userSkills.some(us => us.toLowerCase() === s.toLowerCase())
                );
                const skillOverlapPercent = intersection.length / projSkills.length;
                const skillScore = Math.round(skillOverlapPercent * 40);
                score += skillScore;
                if (skillScore >= 20) {
                    reasons.push(`Matches your ${intersection.slice(0, 2).join(' & ')} skills`);
                }
            }

            // B. Category Match (20%)
            if (project.category && activeCategories.has(project.category)) {
                score += 20;
                reasons.push(`In your preferred category: ${project.category}`);
            }

            // C. Search/Bookmark Activity (15%)
            let activityMatch = false;
            if (searchKeywords.length > 0) {
                const titleLower = (project.title || '').toLowerCase();
                const descLower = (project.description || '').toLowerCase();
                const matchedKeyword = searchKeywords.find(kw => 
                    titleLower.includes(kw) || descLower.includes(kw)
                );
                if (matchedKeyword) {
                    score += 15;
                    activityMatch = true;
                    reasons.push(`Matches your recent search for "${matchedKeyword}"`);
                }
            }
            if (!activityMatch && bookmarks.some(b => b.project?.toString() === project._id.toString())) {
                score += 15;
                reasons.push('You bookmarked this project');
            }

            // D. Previous Bids / Interactions (10%)
            if (project.client && bidClientIds.has(project.client._id.toString())) {
                score += 10;
                reasons.push(`Posted by a client you previously bid on: @${project.client.username}`);
            }

            // E. Budget Compatibility (10%)
            // Give budget score based on overall project budget scale
            const budgetMax = project.budget?.max || 0;
            if (budgetMax >= 5000) {
                score += 10;
            } else if (budgetMax > 0) {
                score += Math.round((budgetMax / 5000) * 10);
            }

            // F. Project Recency (5%)
            const hoursSincePost = (Date.now() - project.createdAt) / (1000 * 60 * 60);
            const recencyScore = Math.max(0, Math.round(5 - (hoursSincePost / 24) * 0.5)); // decays over 10 days
            score += recencyScore;

            if (score > 10) {
                recommendations.push({
                    projectId: project._id,
                    project,
                    matchScore: score,
                    reason: reasons.length > 0 ? reasons.join('. ') + '.' : 'Recommended based on your preferences.'
                });
            }
        }

        // Sort by score descending
        recommendations.sort((a, b) => b.matchScore - a.matchScore);

        // Fallback: If not enough recommended items, fill with popular/recent open projects
        if (recommendations.length < 5) {
            const fallbackProjects = await Project.find({
                status: 'open',
                _id: { $nin: recommendations.map(r => r.projectId) }
            })
            .populate('client', 'username profile.location')
            .sort({ bidsCount: -1, createdAt: -1 })
            .limit(5);

            fallbackProjects.forEach(proj => {
                recommendations.push({
                    projectId: proj._id,
                    project: proj,
                    matchScore: 60,
                    reason: 'Popular project on GigCampus'
                });
            });
        }

        // Cap at top 10 results
        const finalResults = recommendations.slice(0, 10);

        const execTime = Date.now() - startTime;
        logRecommendationActivity({
            userId: req.user._id,
            action: 'RECOMMEND_PROJECTS',
            execTimeMs: execTime,
            resultsCount: finalResults.length,
            requestId: req.requestId
        });

        res.json({
            success: true,
            recommendations: finalResults
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get Personalized Freelancer Recommendations for Client
// @route   GET /api/v1/recommendations/freelancers
// @access  Private
export const getFreelancerRecommendations = async (req, res) => {
    const startTime = Date.now();
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can get freelancer recommendations.' });
        }

        // 1. Fetch Client's past projects & bookmarks
        const [clientProjects, favorites, history] = await Promise.all([
            Project.find({ client: req.user._id }),
            FreelancerFavorite.find({ user: req.user._id }),
            SearchHistory.find({ user: req.user._id })
        ]);

        const clientProjectSkills = new Set();
        const clientProjectCategories = new Set();
        clientProjects.forEach(p => {
            p.skills?.forEach(s => clientProjectSkills.add(s.toLowerCase()));
            if (p.category) clientProjectCategories.add(p.category.toLowerCase());
        });

        // Keywords search targets
        const searchKeywords = history.map(h => h.query.toLowerCase().trim()).filter(Boolean);

        // Previous hires (freelancers who worked on client's completed projects)
        const previousFreelancerIds = new Set();
        clientProjects.forEach(p => {
            if (p.freelancer) {
                previousFreelancerIds.add(p.freelancer.toString());
            }
        });

        // Fetch active freelancers
        const freelancers = await User.find({ role: 'freelancer', isActive: true });
        let recommendations = [];

        // 2. Score calculations
        for (const free of freelancers) {
            let score = 0;
            const reasons = [];

            const freeSkills = free.profile?.skills || [];
            
            // A. Skill Match (30%)
            if (freeSkills.length > 0 && clientProjectSkills.size > 0) {
                const intersection = freeSkills.filter(s => clientProjectSkills.has(s.toLowerCase()));
                const overlapScore = Math.round((intersection.length / freeSkills.length) * 30);
                score += overlapScore;
                if (overlapScore >= 15) {
                    reasons.push(`Skills match your past requirements (${intersection.slice(0, 2).join(', ')})`);
                }
            }

            // B. Category Match (20%)
            // Map skill categories or profile bio keywords
            const matchesCategory = freeSkills.some(s => clientProjectCategories.has(s.toLowerCase()));
            if (matchesCategory) {
                score += 20;
                reasons.push('Matches your typical project category');
            }

            // C. Rating & Reputation (20%)
            const avgRating = free.reputation?.score || 0;
            const ratingPoints = Math.round((avgRating / 5) * 20);
            score += ratingPoints;

            // D. Availability & Response Rate (15%)
            if (free.profile?.availability !== false) {
                score += 10;
            }
            const responseRate = free.reputation?.responseRate || 90;
            score += Math.round((responseRate / 100) * 5);

            // E. Hires & Favorites (15%)
            let hasHistory = false;
            if (favorites.some(f => f.freelancer.toString() === free._id.toString())) {
                score += 15;
                hasHistory = true;
                reasons.push('In your favorite list');
            } else if (previousFreelancerIds.has(free._id.toString())) {
                score += 15;
                hasHistory = true;
                reasons.push('You previously hired this freelancer');
            }

            // F. Search History keywords check
            if (!hasHistory && searchKeywords.length > 0) {
                const freeUsername = (free.username || '').toLowerCase();
                const matchedKeyword = searchKeywords.find(kw => 
                    freeUsername.includes(kw) || freeSkills.some(s => s.toLowerCase().includes(kw))
                );
                if (matchedKeyword) {
                    score += 10; // secondary boost
                    reasons.push(`Matches your recent search for "${matchedKeyword}"`);
                }
            }

            if (score > 15) {
                recommendations.push({
                    freelancerId: free._id,
                    freelancer: free.getPublicProfile(),
                    matchScore: Math.min(score, 100),
                    reason: reasons.length > 0 ? reasons.join('. ') + '.' : 'Recommended based on overall ratings and availability.'
                });
            }
        }

        // Sort by score
        recommendations.sort((a, b) => b.matchScore - a.matchScore);

        // Fallback: If not enough recommendations, fill with top-rated freelancers
        if (recommendations.length < 5) {
            const fallbackFreelancers = await User.find({
                role: 'freelancer',
                isActive: true,
                _id: { $nin: recommendations.map(r => r.freelancerId) }
            })
            .sort({ 'reputation.score': -1, 'reputation.completedProjects': -1 })
            .limit(5);

            fallbackFreelancers.forEach(f => {
                recommendations.push({
                    freelancerId: f._id,
                    freelancer: f.getPublicProfile(),
                    matchScore: 85,
                    reason: 'Top Rated freelancer on GigCampus'
                });
            });
        }

        // Cap at top 10
        const finalResults = recommendations.slice(0, 10);

        const execTime = Date.now() - startTime;
        logRecommendationActivity({
            userId: req.user._id,
            action: 'RECOMMEND_FREELANCERS',
            execTimeMs: execTime,
            resultsCount: finalResults.length,
            requestId: req.requestId
        });

        res.json({
            success: true,
            recommendations: finalResults
        });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
