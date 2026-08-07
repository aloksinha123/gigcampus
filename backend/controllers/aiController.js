import mongoose from 'mongoose';
import Project from '../models/Project.js';
import User from '../models/User.js';
import {
    improveProjectDescription,
    enhanceProjectDescriptionService,
    recommendFreelancersForProjectService,
    analyzeBidQualityService,
    analyzeProjectRiskService,
    analyzeBidProposal,
    recommendFreelancers
} from '../services/aiService.js';
import { generateAIProposal } from '../services/geminiProposalService.js';

// Helper for formatting clean error responses for temporary AI availability issues
const handleAiError = (res, error, defaultMessage = 'AI service is temporarily unavailable.') => {
    console.error('⚠️ AI Service Error:', error);

    const isTemporaryFailure =
        error?.status === 503 ||
        error?.status === 429 ||
        error?.message?.includes('503') ||
        error?.message?.includes('429') ||
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('UNAVAILABLE') ||
        error?.message?.includes('Failed to generate response');

    if (isTemporaryFailure) {
        return res.status(503).json({
            success: false,
            message: 'AI service is temporarily unavailable. Please try again in a few moments.'
        });
    }

    return res.status(500).json({
        success: false,
        message: defaultMessage
    });
};

// @desc    Improve project description using Google Gemini AI
// @route   POST /api/ai/improve-description
// @access  Private (Authenticated Users)
export const improveDescription = async (req, res) => {
    try {
        const { description } = req.body;

        if (!description || typeof description !== 'string' || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid project description.'
            });
        }

        const aiResponse = await improveProjectDescription(description.trim());

        // Validate JSON structure
        if (!aiResponse || typeof aiResponse !== 'object' || Array.isArray(aiResponse)) {
            return res.status(500).json({
                success: false,
                message: 'Unable to generate AI suggestions.'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                title: aiResponse.title || '',
                summary: aiResponse.summary || description,
                requirements: Array.isArray(aiResponse.requirements) ? aiResponse.requirements : [],
                skills: Array.isArray(aiResponse.skills) ? aiResponse.skills : [],
                timeline: aiResponse.timeline || '',
                budget: aiResponse.budget || '',
                deliverables: Array.isArray(aiResponse.deliverables) ? aiResponse.deliverables : []
            }
        });
    } catch (error) {
        return handleAiError(res, error, 'Unable to generate AI suggestions.');
    }
};

// @desc    Enhance project description, title, skills & complexity using Google Gemini AI
// @route   POST /api/v1/ai/enhance-description
// @access  Private (Authenticated Clients / Users)
export const enhanceDescriptionController = async (req, res) => {
    const startTime = Date.now();
    try {
        const { title, description, budget, category, timeline } = req.body;
        const userId = req.user?._id;

        const reqTitle = title ? String(title).trim() : '';
        const reqDesc = description ? String(description).trim() : '';

        // Validation: Must provide title or description
        if (!reqTitle && !reqDesc) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a project title or description.'
            });
        }

        const effectiveDescription = reqDesc || reqTitle;

        if (effectiveDescription.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Project description exceeds maximum length of 5000 characters.'
            });
        }

        // Call Gemini Enhancement Service
        const result = await enhanceProjectDescriptionService({
            title: reqTitle,
            description: effectiveDescription,
            budget: budget ? String(budget).trim() : '',
            category: category ? String(category).trim() : 'General',
            timeline: timeline ? String(timeline).trim() : ''
        });

        const generationTimeMs = Date.now() - startTime;

        // Structured Logging
        console.log(`
[AI DESCRIPTION ENHANCED]
Request ID: ${req.requestId || 'N/A'}
User ID: ${userId || 'Unauthenticated'}
Project Category: ${category || 'General'}
Generation Time: ${generationTimeMs}ms
Model Used: ${result.modelUsed}
Prompt Tokens: ${result.promptTokens ?? 'N/A'}
Response Tokens: ${result.responseTokens ?? 'N/A'}
Timestamp: ${new Date().toISOString()}
`);

        return res.status(200).json({
            success: true,
            enhancedTitle: result.enhancedTitle,
            enhancedDescription: result.enhancedDescription,
            recommendedSkills: result.recommendedSkills,
            estimatedComplexity: result.estimatedComplexity,
            meta: {
                modelUsed: result.modelUsed,
                generationTimeMs,
                promptTokens: result.promptTokens,
                responseTokens: result.responseTokens
            }
        });
    } catch (error) {
        return handleAiError(res, error, 'Unable to enhance project description.');
    }
};

// @desc    Generate personalized AI proposal for a project using Google Gemini AI
// @route   POST /api/v1/ai/generate-proposal
// @access  Private (Freelancers / Authenticated Users)
export const generateProposalController = async (req, res) => {
    const startTime = Date.now();
    try {
        const { projectId, tone = 'professional' } = req.body;
        const userId = req.user?._id;

        // Validation: Project ID
        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid projectId is required.'
            });
        }

        // Fetch Project from MongoDB
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found.'
            });
        }

        // Fetch Freelancer User Profile
        const freelancer = await User.findById(userId).select('-password');

        // Generate AI Proposal via Gemini Service
        const result = await generateAIProposal({
            project,
            freelancer,
            tone
        });

        const generationTimeMs = Date.now() - startTime;

        // Structured Logging
        console.log(`
[AI PROPOSAL GENERATED]
Request ID: ${req.requestId || 'N/A'}
User ID: ${userId || 'Unauthenticated'}
Project ID: ${projectId}
Generation Time: ${generationTimeMs}ms
Model Used: ${result.modelUsed}
Prompt Tokens: ${result.promptTokens ?? 'N/A'}
Response Tokens: ${result.responseTokens ?? 'N/A'}
Timestamp: ${new Date().toISOString()}
`);

        return res.status(200).json({
            success: true,
            proposal: result.proposal,
            meta: {
                modelUsed: result.modelUsed,
                generationTimeMs,
                promptTokens: result.promptTokens,
                responseTokens: result.responseTokens
            }
        });
    } catch (error) {
        return handleAiError(res, error, 'Failed to generate AI proposal.');
    }
};

// @desc    Analyze a freelancer's bid proposal quality (FEATURE 1)
// @route   POST /api/v1/ai/analyze-bid & POST /api/ai/analyze-bid
// @access  Private (Freelancers / Authenticated Users)
export const analyzeBid = async (req, res) => {
    const startTime = Date.now();
    try {
        let { projectId, proposal, projectDescription, bidText } = req.body;
        const userId = req.user?._id;

        const effectiveProposal = proposal || bidText || '';

        // Reject empty proposals
        if (!effectiveProposal || typeof effectiveProposal !== 'string' || !effectiveProposal.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Proposal text cannot be empty.'
            });
        }

        if (effectiveProposal.trim().length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Proposal text cannot exceed 5000 characters.'
            });
        }

        let project = null;
        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            project = await Project.findById(projectId);
        } else if (projectDescription) {
            project = { title: 'Project Listing', description: projectDescription };
        }

        const result = await analyzeBidQualityService({
            projectId,
            proposal: effectiveProposal.trim(),
            project
        });

        const generationTimeMs = Date.now() - startTime;

        // Structured Logging
        console.log(`
[AI BID QUALITY ANALYZED]
Request ID: ${req.requestId || 'N/A'}
User ID: ${userId || 'Unauthenticated'}
Project ID: ${projectId || 'N/A'}
Generation Time: ${generationTimeMs}ms
Model Used: ${result.modelUsed}
Prompt Tokens: ${result.promptTokens ?? 'N/A'}
Response Tokens: ${result.responseTokens ?? 'N/A'}
Timestamp: ${new Date().toISOString()}
`);

        return res.status(200).json({
            success: true,
            score: result.score,
            estimatedWinChance: result.estimatedWinChance,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            suggestions: result.suggestions,
            meta: {
                modelUsed: result.modelUsed,
                generationTimeMs,
                promptTokens: result.promptTokens,
                responseTokens: result.responseTokens
            }
        });
    } catch (error) {
        return handleAiError(res, error, 'Unable to analyze bid proposal quality.');
    }
};

// @desc    Analyze project risk & complexity for client listings (FEATURE 2)
// @route   POST /api/v1/ai/analyze-project-risk
// @access  Private (Students / Clients / Authenticated Users)
export const analyzeProjectRiskController = async (req, res) => {
    const startTime = Date.now();
    try {
        const { title = '', description = '', budget, timeline, category } = req.body;
        const userId = req.user?._id;

        const reqTitle = String(title).trim();
        const reqDesc = String(description).trim();

        // Reject empty title/description
        if (!reqTitle && !reqDesc) {
            return res.status(400).json({
                success: false,
                message: 'Project title and description cannot be empty.'
            });
        }

        const result = await analyzeProjectRiskService({
            title: reqTitle || reqDesc.substring(0, 50),
            description: reqDesc || reqTitle,
            budget: budget ? String(budget).trim() : '',
            timeline: timeline ? String(timeline).trim() : '',
            category: category ? String(category).trim() : 'Development'
        });

        const generationTimeMs = Date.now() - startTime;

        // Structured Logging
        console.log(`
[AI PROJECT RISK ANALYZED]
Request ID: ${req.requestId || 'N/A'}
User ID: ${userId || 'Unauthenticated'}
Project Category: ${category || 'Development'}
Generation Time: ${generationTimeMs}ms
Model Used: ${result.modelUsed}
Prompt Tokens: ${result.promptTokens ?? 'N/A'}
Response Tokens: ${result.responseTokens ?? 'N/A'}
Timestamp: ${new Date().toISOString()}
`);

        return res.status(200).json({
            success: true,
            risk: result.risk,
            estimatedComplexity: result.estimatedComplexity,
            issues: result.issues,
            recommendations: result.recommendations,
            meta: {
                modelUsed: result.modelUsed,
                generationTimeMs,
                promptTokens: result.promptTokens,
                responseTokens: result.responseTokens
            }
        });
    } catch (error) {
        return handleAiError(res, error, 'Unable to analyze project risk.');
    }
};

// @desc    Rank and recommend top freelancers for a project using Google Gemini AI
// @route   POST /api/v1/ai/recommend-freelancers
// @access  Private (Authenticated Clients / Project Owner)
export const recommendFreelancersController = async (req, res) => {
    const startTime = Date.now();
    try {
        const { projectId } = req.body;
        const userId = req.user?._id;

        // 1. If projectId provided, perform database-backed AI freelancer recommendation
        if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found.' });
            }

            // Fetch candidate freelancers from MongoDB
            const freelancers = await User.find({
                role: { $in: ['freelancer', 'both', 'student'] },
                isActive: true
            }).select('-password').limit(10);

            if (!freelancers || freelancers.length === 0) {
                return res.status(200).json({ success: true, recommendations: [] });
            }

            const result = await recommendFreelancersForProjectService({ project, freelancers });
            const generationTimeMs = Date.now() - startTime;

            console.log(`
[AI FREELANCERS RECOMMENDED]
Request ID: ${req.requestId || 'N/A'}
User ID: ${userId || 'Unauthenticated'}
Project ID: ${projectId}
Candidate Count: ${freelancers.length}
Generation Time: ${generationTimeMs}ms
Model Used: ${result.modelUsed}
Prompt Tokens: ${result.promptTokens ?? 'N/A'}
Response Tokens: ${result.responseTokens ?? 'N/A'}
Timestamp: ${new Date().toISOString()}
`);

            return res.status(200).json({
                success: true,
                recommendations: result.recommendations,
                meta: {
                    modelUsed: result.modelUsed,
                    generationTimeMs,
                    promptTokens: result.promptTokens,
                    responseTokens: result.responseTokens
                }
            });
        }

        // 2. Backward compatibility for candidate bids array
        let { projectDescription, requiredSkills, budget, deliveryDays, bids } = req.body;

        if (!projectDescription || !Array.isArray(bids) || bids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'projectId or non-empty candidate bids array is required.'
            });
        }

        const result = await recommendFreelancers({
            projectDescription: projectDescription.trim(),
            requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
            budget: Number(budget) || 1000,
            deliveryDays: Number(deliveryDays) || 7,
            bids
        });

        return res.status(200).json({
            success: true,
            recommendations: result.recommendations
        });
    } catch (error) {
        return handleAiError(res, error, 'Unable to generate freelancer recommendations.');
    }
};

export default {
    improveDescription,
    enhanceDescriptionController,
    generateProposalController,
    analyzeBid,
    analyzeProjectRiskController,
    recommendFreelancersController
};
