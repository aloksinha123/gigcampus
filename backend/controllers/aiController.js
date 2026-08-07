import mongoose from 'mongoose';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { improveProjectDescription, analyzeBidProposal, recommendFreelancers } from '../services/aiService.js';
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

// @desc    Analyze a freelancer's bid proposal before submission
// @route   POST /api/ai/analyze-bid
// @access  Private (Authenticated Users)
export const analyzeBid = async (req, res) => {
    try {
        let { projectDescription, bidText, budget, deliveryDays } = req.body;

        // Validation
        if (!projectDescription || typeof projectDescription !== 'string' || !projectDescription.trim()) {
            return res.status(400).json({
                success: false,
                message: 'projectDescription is required and must be a valid string.'
            });
        }

        if (projectDescription.trim().length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'projectDescription must not exceed 5000 characters.'
            });
        }

        if (!bidText || typeof bidText !== 'string' || !bidText.trim()) {
            return res.status(400).json({
                success: false,
                message: 'bidText is required and must be a valid string.'
            });
        }

        if (bidText.trim().length > 3000) {
            return res.status(400).json({
                success: false,
                message: 'bidText must not exceed 3000 characters.'
            });
        }

        if (budget === undefined || budget === null || isNaN(Number(budget)) || Number(budget) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'budget is required and must be a positive number greater than 0.'
            });
        }

        if (deliveryDays === undefined || deliveryDays === null || isNaN(Number(deliveryDays)) || Number(deliveryDays) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'deliveryDays is required and must be a positive number greater than 0.'
            });
        }

        const analysis = await analyzeBidProposal({
            projectDescription: projectDescription.trim(),
            bidText: bidText.trim(),
            budget: Number(budget),
            deliveryDays: Number(deliveryDays)
        });

        if (!analysis || typeof analysis !== 'object') {
            return res.status(500).json({
                success: false,
                message: 'Unable to analyze bid proposal.'
            });
        }

        return res.status(200).json({
            score: typeof analysis.score === 'number' ? analysis.score : 80,
            requirementMatch: typeof analysis.requirementMatch === 'number' ? analysis.requirementMatch : 85,
            professionalism: analysis.professionalism || 'Good',
            communication: analysis.communication || 'Good',
            risk: analysis.risk || 'Low',
            strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
            weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
            missingPoints: Array.isArray(analysis.missingPoints) ? analysis.missingPoints : [],
            improvedBid: analysis.improvedBid || bidText
        });
    } catch (error) {
        return handleAiError(res, error, 'Unable to analyze bid proposal.');
    }
};

// @desc    Rank and recommend freelancers for a project using Google Gemini AI
// @route   POST /api/ai/recommend-freelancers
// @access  Private (Project Owner / Authenticated Users)
export const recommendFreelancersController = async (req, res) => {
    try {
        let { projectDescription, requiredSkills, budget, deliveryDays, bids } = req.body;

        if (!projectDescription || typeof projectDescription !== 'string' || !projectDescription.trim()) {
            return res.status(400).json({
                success: false,
                message: 'projectDescription is required and must be a valid string.'
            });
        }

        if (!Array.isArray(bids) || bids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'bids must be a non-empty array of candidate bids.'
            });
        }

        if (budget === undefined || budget === null || isNaN(Number(budget)) || Number(budget) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'budget is required and must be a positive number greater than 0.'
            });
        }

        if (deliveryDays === undefined || deliveryDays === null || isNaN(Number(deliveryDays)) || Number(deliveryDays) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'deliveryDays is required and must be a positive number greater than 0.'
            });
        }

        const result = await recommendFreelancers({
            projectDescription: projectDescription.trim(),
            requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
            budget: Number(budget),
            deliveryDays: Number(deliveryDays),
            bids
        });

        if (!result || !Array.isArray(result.recommendations)) {
            return res.status(500).json({
                success: false,
                message: 'Unable to generate freelancer recommendations.'
            });
        }

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
    generateProposalController,
    analyzeBid,
    recommendFreelancersController
};
