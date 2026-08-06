import { improveProjectDescription, analyzeBidProposal } from '../services/aiService.js';

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
        console.error("Gemini Error:");
        console.error(error);
        console.error(error.response?.data);
        return res.status(500).json({
            success: false,
            message: error.message || 'Unable to generate AI suggestions.',
            errorDetails: error.response?.data || error
        });
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
        console.error('⚠️ Smart Bid Analyzer Controller Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Unable to analyze bid proposal.'
        });
    }
};

export default {
    improveDescription,
    analyzeBid
};
