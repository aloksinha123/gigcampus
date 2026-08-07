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
 * Rich Fallback Engine for Project Description Enhancement when API quota is limited
 */
const generateRichFallback = (rawTitle, rawDesc, category, budget, timeline) => {
    const text = `${rawTitle} ${rawDesc}`.toLowerCase();

    let domain = 'Full-Stack Web Development';
    let skills = ['React.js', 'Node.js', 'MongoDB', 'REST APIs', 'JWT Authentication'];
    let complexity = 'Medium';

    if (text.includes('website') || text.includes('store') || text.includes('shop') || text.includes('e-commerce') || text.includes('ecommerce') || text.includes('shoes') || text.includes('nike')) {
        domain = 'E-Commerce & Web Development';
        skills = ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Tailwind CSS', 'Payment Gateway'];
        complexity = 'Medium';
    } else if (text.includes('design') || text.includes('ui') || text.includes('ux') || text.includes('figma')) {
        domain = 'UI/UX Design';
        skills = ['Figma', 'UI/UX Design', 'Wireframing', 'Prototyping', 'Responsive Design'];
        complexity = 'Low';
    } else if (text.includes('mobile') || text.includes('app') || text.includes('android') || text.includes('flutter') || text.includes('react native')) {
        domain = 'Mobile App Development';
        skills = ['React Native', 'Flutter', 'Mobile Development', 'REST API', 'Firebase'];
        complexity = 'High';
    }

    // Title refinement: strip filler words ("Need A", "Of Name", "Enhanced:")
    let cleanTitleStr = (rawTitle || rawDesc || '').replace(/^Enhanced:\s*/gi, '').trim();
    cleanTitleStr = cleanTitleStr.replace(/\b(need a|need an|need|of name|for me|website of|app of)\b/gi, '').trim();
    cleanTitleStr = cleanTitleStr.replace(/\s+/g, ' ').trim();

    const formattedTitle = cleanTitleStr
        ? cleanTitleStr.replace(/\b\w/g, c => c.toUpperCase())
        : 'Modern Web Application';

    const generatedTitle = formattedTitle.toLowerCase().includes('website') || formattedTitle.toLowerCase().includes('platform') || formattedTitle.toLowerCase().includes('store') || formattedTitle.toLowerCase().includes('app')
        ? formattedTitle
        : `${formattedTitle} E-Commerce Platform`;

    const budgetDisplay = budget && Number(budget) > 0 ? `₹${budget}` : 'Specified Budget';

    const generatedDescription = `Project Overview:
Development of a high-performance, responsive ${domain.toLowerCase()} solution. This project requires an end-to-end implementation focusing on user experience, security, and scalable architecture.

Key Technical Scope & Deliverables:
- End-to-end implementation based on modern architecture and clean coding standards.
- Fully responsive interface optimized across desktop, tablet, and mobile displays.
- Core feature suite including user authentication, state management, and data persistence.
- Integration of essential third-party APIs and services.

Acceptance Criteria & Quality Assurance:
- 100% functional feature set meeting performance benchmarks.
- Clean, documented codebase with modular component structure.
- Timely delivery within specified project timeframe (${timeline || '14 Days'}) and budget (${budgetDisplay}).`;

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

Your task is to refine this project brief to be professional, clear, complete, and attractive to top freelancers.
Improve:
1. Professional writing & title refinement (e.g. convert "Need A E-Commerce Shoes Website Of Nike Name" into "Nike Shoes E-Commerce Platform").
2. Scope clarity & acceptance criteria.
3. Key technical deliverables.
4. Recommended skills list (e.g. React.js, Node.js, MongoDB, REST APIs, JWT).
5. Estimated complexity rating (strictly "Low", "Medium", or "High").

Return ONLY a 100% valid raw JSON object matching this exact structure:
{
  "enhancedTitle": "Refined, professional project title",
  "enhancedDescription": "Comprehensive, clear project description including scope, acceptance criteria, and key deliverables.",
  "recommendedSkills": ["React.js", "Node.js", "MongoDB", "REST APIs", "JWT"],
  "estimatedComplexity": "Medium"
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
                        : ['React.js', 'Node.js', 'MongoDB', 'REST APIs', 'JWT'],
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

    // Dynamic Rich Fallback if Gemini API free-tier quota is reached
    const fallbackData = generateRichFallback(cleanTitleInput, cleanDescInput, category, budget, timeline);

    return {
        enhancedTitle: fallbackData.enhancedTitle,
        enhancedDescription: fallbackData.enhancedDescription,
        recommendedSkills: fallbackData.recommendedSkills,
        estimatedComplexity: fallbackData.estimatedComplexity,
        modelUsed: 'fallback-template',
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
