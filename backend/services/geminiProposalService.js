import { GoogleGenAI } from '@google/genai';

/**
 * Service to generate AI proposals for freelancers using Google Gemini
 * @param {Object} params - { project, freelancer, tone }
 * @returns {Promise<Object>} { proposal, modelUsed, promptTokens, responseTokens }
 */
export const generateAIProposal = async ({ project, freelancer, tone = 'professional' }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is missing.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const freelancerName = freelancer?.profile?.fullName || freelancer?.username || 'Freelancer';
    const freelancerBio = freelancer?.profile?.bio || 'Experienced Software Developer';
    const freelancerSkills = Array.isArray(freelancer?.profile?.skills) && freelancer.profile.skills.length > 0
        ? freelancer.profile.skills.join(', ')
        : 'Full-Stack Development, React, Node.js';

    const projectTitle = project.title || 'Freelance Project';
    const projectDesc = project.description || '';
    const projectSkills = Array.isArray(project.skillsRequired) && project.skillsRequired.length > 0
        ? project.skillsRequired.join(', ')
        : 'Relevant Technical Skills';
    const budget = project.budget ? `₹${project.budget}` : 'specified budget';

    const prompt = `You are an expert, top-rated freelancer writing a proposal on GigCampus.
Generate a high-converting, personalized bid proposal for the project below.

Project Details:
- Title: "${projectTitle}"
- Description: "${projectDesc}"
- Required Skills: ${projectSkills}
- Budget: ${budget}

Freelancer Profile:
- Name: ${freelancerName}
- Bio/Overview: ${freelancerBio}
- Key Skills: ${freelancerSkills}

Desired Tone: ${tone}

Structure Requirements:
1. Friendly, professional greeting.
2. Concise demonstration of understanding the project goals.
3. How freelancer skills match project requirements.
4. Step-by-step delivery plan and milestone approach.
5. Polite professional closing with call-to-action for a discussion.
6. Do NOT include brackets like "[Client Name]". Write complete, natural text ready for submission.`;

    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt
            });

            const proposalText = typeof response.text === 'function' ? response.text() : (response.text || '');
            if (proposalText && proposalText.trim()) {
                const usage = response.usageMetadata || {};
                return {
                    proposal: proposalText.trim(),
                    modelUsed: modelName,
                    promptTokens: usage.promptTokenCount || null,
                    responseTokens: usage.candidatesTokenCount || null
                };
            }
        } catch (err) {
            console.warn(`⚠️ Model [${modelName}] failed in proposal generation:`, err.message);
            lastError = err;
        }
    }

    // Fallback template if Gemini API fails or model is unavailable
    const fallbackProposal = `Hi there,\n\nI am excited to submit my proposal for "${projectTitle}". Having reviewed your description and requirements (${projectSkills}), I am confident I can deliver high-quality results.\n\nMy Approach:\n1. Analyze requirements & outline key milestones.\n2. Develop robust, well-documented code.\n3. Thorough testing and timely delivery within ${budget}.\n\nI would welcome the opportunity to discuss your project further. Looking forward to working together!\n\nBest regards,\n${freelancerName}`;

    return {
        proposal: fallbackProposal,
        modelUsed: 'fallback-template',
        promptTokens: null,
        responseTokens: null,
        warning: lastError?.message || null
    };
};

export default {
    generateAIProposal
};
