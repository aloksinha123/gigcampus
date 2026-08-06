import { improveProjectDescription } from '../services/aiService.js';

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

export default {
    improveDescription
};
