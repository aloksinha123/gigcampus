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
        : (Array.isArray(project.skills) ? project.skills.join(', ') : 'Relevant Technical Skills');
    const budget = project.budget ? `₹${project.budget.max || project.budget.min || project.budget}` : 'specified budget';

    const toneInstructions = {
        professional: `Tone Instructions (PROFESSIONAL):
- Write a formal, structured, highly technical, and objective proposal.
- Opening: "Hello," or "Dear Client,"
- Provide a detailed 4-step technical delivery roadmap with quality assurance standards.
- Word count target: 150 - 200 words.`,

        persuasive: `Tone Instructions (PERSUASIVE):
- Write a high-converting, enthusiastic, value-driven, and persuasive proposal.
- Opening: "Hi there! I'm thrilled to submit my proposal for your project!"
- Emphasize ROI, speed of delivery, proactive solutions, and client satisfaction guarantees.
- Strong closing with high urgency: "Let's connect today so we can kick off immediately!"
- Word count target: 140 - 180 words.`,

        concise: `Tone Instructions (CONCISE):
- Write an ULTRA-SHORT, direct, bulleted proposal under 80 words maximum.
- Opening: "Hi,"
- Exactly 3 short bullet points summarizing tech stack, core deliverables, and speed.
- Closing: "Available immediately. Let's discuss!"
- Word count target: 50 - 75 words maximum.`
    };

    const toneKey = (tone || 'professional').toLowerCase();
    const selectedToneGuide = toneInstructions[toneKey] || toneInstructions.professional;

    const prompt = `You are a top 1% freelancer writing a proposal on GigCampus.
Generate a custom proposal matching the EXACT tone requirements specified below.

Project Details:
- Title: "${projectTitle}"
- Description: "${projectDesc}"
- Required Skills: ${projectSkills}
- Budget: ${budget}

Freelancer Profile:
- Name: ${freelancerName}
- Bio/Overview: ${freelancerBio}
- Key Skills: ${freelancerSkills}

${selectedToneGuide}

CRITICAL RULES:
1. Adhere STRICTLY to the requested tone style and length guidelines.
2. Do NOT use placeholder brackets like "[Client Name]". Write 100% complete, natural text.`;

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

    // Dynamic Tone-Specific Fallbacks
    let fallbackProposal = '';

    if (toneKey === 'concise') {
        fallbackProposal = `Hi,\n\nI am ready to deliver "${projectTitle}" with high quality.\n\nQuick Highlights:\n• Stack: ${projectSkills}\n• Scope: Complete implementation as requested\n• Timeline: Fast turnaround within ${budget}\n\nAvailable immediately. Let's discuss details!\n\nBest,\n${freelancerName}`;
    } else if (toneKey === 'persuasive') {
        fallbackProposal = `Hi there!\n\nI would love to help you build "${projectTitle}"! Having delivered similar high-impact projects using ${projectSkills}, I can guarantee a top-tier result that exceeds your expectations.\n\nWhy Choose Me:\n1. Rapid Execution: Fast development without compromising code quality.\n2. Clean Architecture: Fully responsive & scalable code.\n3. Continuous Updates: Daily progress reports until 100% completion.\n\nLet's connect right now so I can get started on your project today!\n\nWarm regards,\n${freelancerName}`;
    } else {
        fallbackProposal = `Hello,\n\nI am submitting my formal proposal for "${projectTitle}". Based on your specifications, my technical background in ${projectSkills} aligns perfectly with your requirements.\n\nEngineering Roadmap:\n1. Architecture Review & Technical Planning\n2. Modular Component Development & State Management\n3. Quality Assurance & Performance Optimization\n4. Final Deployment & Post-Launch Verification\n\nI look forward to discussing the project milestones with you.\n\nSincerely,\n${freelancerName}`;
    }

    return {
        proposal: fallbackProposal,
        modelUsed: 'tone-aware-fallback',
        promptTokens: null,
        responseTokens: null,
        warning: lastError?.message || null
    };
};

export default {
    generateAIProposal
};
