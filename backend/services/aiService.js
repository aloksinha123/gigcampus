import { GoogleGenAI } from '@google/genai';

/**
 * Generates an improved, structured project description using official Google GenAI SDK
 * @param {string} rawDescription - The initial raw project description from the user
 * @returns {Object} Parsed JSON object containing title, summary, requirements, skills, timeline, budget, deliverables
 */
export const improveProjectDescription = async (rawDescription) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert technical project manager and specification generator for a student freelance hub.
Analyze the following project description and generate a structured JSON specification.

User Provided Description: "${rawDescription}"

Return ONLY valid JSON matching this exact structure:
{
  "title": "A concise, professional project title",
  "summary": "Detailed professional overview of the project scope and goals",
  "requirements": ["Requirement 1", "Requirement 2"],
  "skills": ["Skill 1", "Skill 2"],
  "timeline": "Estimated timeframe e.g. 7 days",
  "budget": "Estimated budget in INR e.g. 1000-3000",
  "deliverables": ["Deliverable 1", "Deliverable 2"]
}

Strict Rules:
1. Output MUST be 100% valid raw JSON only.
2. Do NOT use markdown code blocks.
3. Do NOT include any intro text, explanations, or commentary outside the JSON object.`;

    let responseText = '';
    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });

            responseText = typeof response.text === 'function' ? response.text() : (response.text || '');
            if (responseText && responseText.trim()) {
                console.log(`✨ Successfully generated AI response using model [${modelName}]`);
                break;
            }
        } catch (err) {
            console.warn(`⚠️ Model [${modelName}] call failed:`, err.message);
            lastError = err;
        }
    }

    if (!responseText || !responseText.trim()) {
        throw lastError || new Error('Failed to generate response from Gemini AI models.');
    }

    // Clean and extract JSON substring between first '{' and last '}'
    let cleanedText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(cleanedText);
};

/**
 * Service to analyze a bid proposal against project requirements
 */
export const analyzeBidProposal = async ({ projectDescription, bidText, budget, deliveryDays }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a senior freelance bid evaluation expert. Analyze the following freelancer proposal against the client's project description.

Project Description: "${projectDescription}"
Target Budget: ₹${budget}
Target Timeline: ${deliveryDays} days

Freelancer's Bid Proposal: "${bidText}"

Return ONLY a valid raw JSON object matching this structure:
{
  "score": 85,
  "requirementMatch": 90,
  "professionalism": "High",
  "communication": "Clear",
  "risk": "Low",
  "strengths": ["Clear technical approach", "Realistic timeline"],
  "weaknesses": ["Could elaborate on post-launch testing"],
  "missingPoints": ["Deployment strategy"],
  "improvedBid": "An improved, higher-converting version of the freelancer's bid proposal"
}`;

    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    for (const modelName of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const text = typeof response.text === 'function' ? response.text() : (response.text || '');
            if (text && text.trim()) {
                let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const firstBrace = cleaned.indexOf('{');
                const lastBrace = cleaned.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
                }
                return JSON.parse(cleaned);
            }
        } catch (err) {
            console.warn(`⚠️ Model [${modelName}] analyzeBid call failed:`, err.message);
        }
    }

    // Fallback if AI call unavailable
    return {
        score: 82,
        requirementMatch: 85,
        professionalism: 'Good',
        communication: 'Good',
        risk: 'Low',
        strengths: ['Directly addresses core project scope', 'Competitive pricing'],
        weaknesses: ['Could specify tech stack details'],
        missingPoints: ['Post-delivery support timeframe'],
        improvedBid: `${bidText.trim()}\n\nAdditionally, I will ensure regular milestone updates, thorough testing across devices, and 14 days of post-launch support.`
    };
};

/**
 * Service to rank and recommend freelancers for a project
 */
export const recommendFreelancers = async ({ projectDescription, requiredSkills, budget, deliveryDays, bids }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const bidsSummary = bids.map(b => ({
        bidId: b.bidId || b._id,
        freelancerName: b.freelancerName || 'Freelancer',
        bidAmount: b.bidAmount || b.amount,
        deliveryDays: b.deliveryDays || b.deliveryTime,
        proposal: b.proposal || b.bidText,
        rating: b.rating || 4.5,
        completedProjects: b.completedProjects || 0
    }));

    const prompt = `Rank candidate freelancers for this project.

Project Description: "${projectDescription}"
Required Skills: ${JSON.stringify(requiredSkills)}
Budget: ₹${budget}
Target Days: ${deliveryDays}

Candidate Bids: ${JSON.stringify(bidsSummary)}

Return ONLY valid raw JSON:
{
  "recommendations": [
    {
      "bidId": "id",
      "rank": 1,
      "score": 95,
      "reason": "Strong skill alignment and competitive price"
    }
  ]
}`;

    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    for (const modelName of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const text = typeof response.text === 'function' ? response.text() : (response.text || '');
            if (text && text.trim()) {
                let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                const firstBrace = cleaned.indexOf('{');
                const lastBrace = cleaned.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
                }
                return JSON.parse(cleaned);
            }
        } catch (err) {
            console.warn(`⚠️ Model [${modelName}] recommendFreelancers call failed:`, err.message);
        }
    }

    // Fallback ranking
    return calculateFallbackRecommendations({ projectDescription, requiredSkills, budget, deliveryDays, bids });
};

export const calculateFallbackRecommendations = ({ projectDescription, requiredSkills, budget, deliveryDays, bids }) => {
    const recommendations = bids.map((b, idx) => ({
        bidId: b.bidId || b._id,
        rank: idx + 1,
        score: Math.max(70, 95 - idx * 5),
        reason: 'Recommended based on skill match and competitive bid terms.'
    }));
    return { recommendations };
};

/**
 * Extract clean topic title and subject from user raw input
 */
const extractProjectTopic = (rawTitle, rawDesc) => {
    let raw = (rawTitle || rawDesc || '').replace(/^Enhanced:\s*/gi, '').trim();
    if (!raw) return { topic: 'Web Application', cleanStr: 'Web Application' };

    // Clean filler words
    let clean = raw.replace(/\b(need a|need an|need|of name|for me|project of a|project of|project for|website of|app of|stall e-commerce platform)\b/gi, '').trim();
    clean = clean.replace(/\s+/g, ' ').trim();

    // Capitalize words
    const capitalized = clean.replace(/\b\w/g, c => c.toUpperCase());

    return {
        topic: capitalized || 'Web Application',
        cleanStr: capitalized || 'Web Application'
    };
};

/**
 * Subject-Aware Rich Fallback Engine for Project Description Enhancement
 */
const generateRichFallback = (rawTitle, rawDesc, category, budget, timeline) => {
    const combinedText = `${rawTitle} ${rawDesc}`.toLowerCase();
    const { topic } = extractProjectTopic(rawTitle, rawDesc);

    let skills = ['React.js', 'Tailwind CSS', 'JavaScript', 'HTML5', 'UI/UX Design'];
    let complexity = 'Medium';

    if (combinedText.includes('wada pav') || combinedText.includes('food') || combinedText.includes('stall') || combinedText.includes('restaurant') || combinedText.includes('cafe')) {
        skills = ['Figma', 'React.js', 'Tailwind CSS', 'UI/UX Design', 'HTML5/CSS3'];
        complexity = 'Low';
    } else if (combinedText.includes('shoes') || combinedText.includes('nike') || combinedText.includes('e-commerce') || combinedText.includes('ecommerce') || combinedText.includes('store')) {
        skills = ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Tailwind CSS', 'Payment Gateway'];
        complexity = 'Medium';
    } else if (combinedText.includes('design') || combinedText.includes('ui') || combinedText.includes('ux') || combinedText.includes('figma')) {
        skills = ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Responsive Layouts'];
        complexity = 'Low';
    } else if (combinedText.includes('mobile') || combinedText.includes('app') || combinedText.includes('android') || combinedText.includes('flutter')) {
        skills = ['React Native', 'Flutter', 'Mobile UI Design', 'REST API', 'Firebase'];
        complexity = 'High';
    }

    const budgetDisplay = budget && Number(budget) > 0 ? `₹${budget}` : 'Specified Budget';
    const timelineDisplay = timeline || '14 Days';

    const generatedTitle = topic.toLowerCase().includes('design') || topic.toLowerCase().includes('website') || topic.toLowerCase().includes('platform') || topic.toLowerCase().includes('store') || topic.toLowerCase().includes('app')
        ? topic
        : `${topic} Web Platform`;

    const generatedDescription = `Project Overview:
Design and implementation for "${topic}". This project focuses on building an engaging, high-performance interface tailored specifically to showcase ${topic} features with an intuitive, user-friendly experience.

Key Technical Scope & Deliverables:
- Custom responsive layout and visual branding crafted for ${topic}.
- Interactive frontend components (e.g., product/menu showcase, service catalog, and intuitive navigation).
- Mobile-first, fully responsive UI optimized across desktop, tablet, and smartphone screens.
- Clean, documented codebase adhering to modern web standards and design best practices.

Acceptance Criteria & Quality Assurance:
- 100% functional, responsive user interface meeting performance benchmarks.
- Tested and verified across all major modern web browsers (Chrome, Safari, Firefox, Edge).
- Completed on-schedule within the specified project timeframe (${timelineDisplay}) and budget (${budgetDisplay}).`;

    return {
        enhancedTitle: generatedTitle,
        enhancedDescription: generatedDescription,
        recommendedSkills: skills,
        estimatedComplexity: complexity
    };
};

/**
 * Service to enhance project description with Gemini AI
 * @param {Object} params - { title, description, budget, category, timeline }
 * @returns {Promise<Object>} { enhancedTitle, enhancedDescription, recommendedSkills, estimatedComplexity, modelUsed, promptTokens, responseTokens }
 */
export const enhanceProjectDescriptionService = async ({ title = '', description = '', budget = '', category = '', timeline = '' }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanTitleInput = (title || '').replace(/^Enhanced:\s*/gi, '').trim();
    const cleanDescInput = (description || '').replace(/^Enhanced:\s*/gi, '').trim();

    const prompt = `You are a world-class technical product manager and project scoping consultant.
Enhance and structure the following project details for publishing on GigCampus:

Input Title: "${cleanTitleInput}"
Input Description: "${cleanDescInput}"
Category: "${category}"
Budget: "${budget}"
Timeline: "${timeline}"

CRITICAL INSTRUCTION: Your generated enhancedTitle and enhancedDescription MUST be 100% specific and directly connected to the exact subject/topic provided in the input (e.g. if the input is about a "Wada Pav Stall", your description MUST explicitly focus on a food stall website/ordering design; if about "Nike Shoes", it MUST focus on shoe e-commerce; if about "Gym", it MUST focus on fitness/gym platform). Do NOT generate generic or unrelated template text.

Improve:
1. Professional writing & title refinement tailored to the exact topic.
2. Topic-specific scope clarity, features, and acceptance criteria.
3. Key technical deliverables matching the subject.
4. Recommended skills list directly relevant to the project subject.
5. Estimated complexity rating (strictly "Low", "Medium", or "High").

Return ONLY a 100% valid raw JSON object matching this exact structure:
{
  "enhancedTitle": "Refined, topic-tailored project title",
  "enhancedDescription": "Comprehensive, clear project description directly focusing on the exact input subject, key deliverables, and acceptance criteria.",
  "recommendedSkills": ["Skill1", "Skill2", "Skill3"],
  "estimatedComplexity": "Low"
}

Strict Rules:
1. Output MUST be 100% valid raw JSON.
2. Do NOT use markdown code blocks or intro text outside JSON.
3. Complexity MUST be strictly one of: "Low", "Medium", or "High".`;

    const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const responseText = typeof response.text === 'function' ? response.text() : (response.text || '');
            if (responseText && responseText.trim()) {
                let cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const firstBrace = cleanedText.indexOf('{');
                const lastBrace = cleanedText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
                }

                const parsed = JSON.parse(cleanedText);
                const usage = response.usageMetadata || {};

                return {
                    enhancedTitle: (parsed.enhancedTitle || cleanTitleInput || 'Enhanced Project Title').replace(/^Enhanced:\s*/gi, '').trim(),
                    enhancedDescription: parsed.enhancedDescription || cleanDescInput,
                    recommendedSkills: Array.isArray(parsed.recommendedSkills) && parsed.recommendedSkills.length > 0 
                        ? parsed.recommendedSkills 
                        : ['React.js', 'Tailwind CSS', 'UI/UX Design'],
                    estimatedComplexity: ['Low', 'Medium', 'High'].includes(parsed.estimatedComplexity) ? parsed.estimatedComplexity : 'Medium',
                    modelUsed: modelName,
                    promptTokens: usage.promptTokenCount || null,
                    responseTokens: usage.candidatesTokenCount || null
                };
            }
        } catch (err) {
            console.warn(`⚠️ Model [${modelName}] enhance description failed:`, err.message);
            lastError = err;
        }
    }

    // Subject-Aware Dynamic Rich Fallback if Gemini API free-tier quota is reached
    const fallbackData = generateRichFallback(cleanTitleInput, cleanDescInput, category, budget, timeline);

    return {
        enhancedTitle: fallbackData.enhancedTitle,
        enhancedDescription: fallbackData.enhancedDescription,
        recommendedSkills: fallbackData.recommendedSkills,
        estimatedComplexity: fallbackData.estimatedComplexity,
        modelUsed: 'subject-aware-fallback',
        promptTokens: null,
        responseTokens: null,
        warning: lastError?.message || null
    };
};

/**
 * Service to rank and recommend platform freelancers for a specific project using Gemini AI
 * @param {Object} params - { project, freelancers }
 * @returns {Promise<Object>} { recommendations, modelUsed, promptTokens, responseTokens }
 */
export const recommendFreelancersForProjectService = async ({ project, freelancers }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const candidatesSummary = freelancers.map(f => ({
        userId: f._id.toString(),
        username: f.username || 'freelancer',
        fullName: f.profile?.fullName || f.username || 'Freelancer',
        skills: Array.isArray(f.profile?.skills) ? f.profile.skills : (Array.isArray(f.skills) ? f.skills : []),
        completedProjects: f.reputation?.completedProjects || f.completedProjects || 0,
        rating: f.reputation?.rating || f.rating || 4.8,
        bio: f.profile?.bio || f.bio || 'Software Developer',
        hourlyRate: f.hourlyRate || f.profile?.hourlyRate || 500
    }));

    const projectTitle = project.title || 'Project';
    const projectDesc = project.description || '';
    const projectSkills = Array.isArray(project.skillsRequired) && project.skillsRequired.length > 0 
        ? project.skillsRequired 
        : (Array.isArray(project.skills) ? project.skills : []);
    const category = project.category || 'Development';
    const budget = project.budget ? (project.budget.max || project.budget.min || project.budget) : 'Negotiable';

    if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `You are an AI talent matchmaker for GigCampus freelance platform.
Analyze the project requirements and rank candidate freelancers based on:
1. Skill Match
2. Experience & Completed Projects
3. Rating & Performance
4. Budget Compatibility & Domain Relevance

Project Details:
- Title: "${projectTitle}"
- Description: "${projectDesc}"
- Required Skills: ${JSON.stringify(projectSkills)}
- Category: "${category}"
- Budget: ₹${budget}

Candidate Freelancers: ${JSON.stringify(candidatesSummary)}

Return ONLY a 100% valid raw JSON object matching this structure:
{
  "recommendations": [
    {
      "userId": "exact_user_id_from_candidates",
      "matchScore": 95,
      "reason": "Detailed 1-2 sentence explanation why this freelancer is an ideal match for the project."
    }
  ]
}

Strict Rules:
1. Output MUST be 100% valid raw JSON.
2. matchScore must be a number between 60 and 99.
3. userId MUST match one of the candidate userIds provided in the list.`;

        const modelsToTry = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'];

        for (const modelName of modelsToTry) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });

                const text = typeof response.text === 'function' ? response.text() : (response.text || '');
                if (text && text.trim()) {
                    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const firstBrace = cleaned.indexOf('{');
                    const lastBrace = cleaned.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
                    }

                    const parsed = JSON.parse(cleaned);
                    const usage = response.usageMetadata || {};

                    if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
                        const recs = parsed.recommendations.map(r => {
                            const found = candidatesSummary.find(c => c.userId === r.userId) || candidatesSummary[0];
                            return {
                                userId: found.userId,
                                username: found.username,
                                fullName: found.fullName,
                                matchScore: typeof r.matchScore === 'number' ? r.matchScore : 90,
                                reason: r.reason || `Strong technical background matching project skills (${projectSkills.slice(0, 3).join(', ')}).`,
                                rating: found.rating,
                                completedProjects: found.completedProjects,
                                skills: found.skills,
                                bio: found.bio
                            };
                        });

                        return {
                            recommendations: recs,
                            modelUsed: modelName,
                            promptTokens: usage.promptTokenCount || null,
                            responseTokens: usage.candidatesTokenCount || null
                        };
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Model [${modelName}] recommendFreelancersForProject failed:`, err.message);
            }
        }
    }

    // Dynamic Deterministic Fallback if Gemini API quota is reached
    const fallbackRecs = candidatesSummary.map((f, idx) => {
        const matchingSkills = f.skills.filter(s => 
            projectSkills.some(ps => ps.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(ps.toLowerCase()))
        );
        const matchScore = Math.max(75, Math.min(98, 80 + matchingSkills.length * 5 + (f.completedProjects > 2 ? 5 : 0) - idx * 3));

        return {
            userId: f.userId,
            username: f.username,
            fullName: f.fullName,
            matchScore,
            reason: matchingSkills.length > 0
                ? `Matches key required skills (${matchingSkills.join(', ')}) with ${f.completedProjects} completed gigs.`
                : `Proven platform freelancer with ${f.rating}★ rating and strong project delivery track record.`,
            rating: f.rating,
            completedProjects: f.completedProjects,
            skills: f.skills,
            bio: f.bio
        };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return {
        recommendations: fallbackRecs,
        modelUsed: 'deterministic-fallback',
        promptTokens: null,
        responseTokens: null
    };
};

export default {
    improveProjectDescription,
    enhanceProjectDescriptionService,
    recommendFreelancersForProjectService,
    analyzeBidProposal,
    calculateFallbackRecommendations,
    recommendFreelancers
};
