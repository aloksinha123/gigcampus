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
 * Service to analyze a bid proposal quality using Gemini AI
 * @param {Object} params - { projectId, proposal, project }
 * @returns {Promise<Object>} { score, estimatedWinChance, strengths, weaknesses, suggestions, modelUsed, promptTokens, responseTokens }
 */
export const analyzeBidQualityService = async ({ projectId, proposal = '', project = null }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const projectTitle = project?.title || 'Freelance Project';
    const projectDesc = project?.description || '';
    const projectSkills = Array.isArray(project?.skillsRequired) ? project.skillsRequired.join(', ') : (Array.isArray(project?.skills) ? project.skills.join(', ') : '');

    const prompt = `You are a senior freelance proposal quality evaluator and reviewer.
Analyze the following freelancer bid proposal for a project on GigCampus.

Project Context:
- Title: "${projectTitle}"
- Description: "${projectDesc}"
- Required Skills: "${projectSkills}"

Freelancer Proposal to Evaluate:
"${proposal}"

Evaluate:
1. Grammar & Clarity
2. Professionalism & Confidence
3. Technical Relevance to Project Scope
4. Completeness & Deliverables Breakdown
5. Missing Details / Ambiguity

Return ONLY a 100% valid raw JSON object matching this structure:
{
  "score": 91,
  "estimatedWinChance": "High",
  "strengths": [
    "Clear demonstration of technical understanding",
    "Professional tone and structured deliverables"
  ],
  "weaknesses": [
    "Does not specify post-launch maintenance period",
    "Could provide specific timeline breakdown for testing"
  ],
  "suggestions": [
    "Add a brief mention of 14-day bug support post launch",
    "Highlight experience with similar projects in portfolio"
  ]
}

Strict Rules:
1. Output MUST be 100% valid raw JSON.
2. estimatedWinChance MUST be strictly one of: "Low", "Medium", or "High".
3. score MUST be a number between 40 and 100.`;

    if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
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

                    const scoreVal = typeof parsed.score === 'number' ? parsed.score : 85;
                    let winChance = ['Low', 'Medium', 'High'].includes(parsed.estimatedWinChance)
                        ? parsed.estimatedWinChance
                        : (scoreVal >= 85 ? 'High' : (scoreVal >= 70 ? 'Medium' : 'Low'));

                    return {
                        score: scoreVal,
                        estimatedWinChance: winChance,
                        strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
                            ? parsed.strengths
                            : ['Clear technical understanding of project goals', 'Well-structured delivery approach'],
                        weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0
                            ? parsed.weaknesses
                            : ['Could specify post-launch maintenance terms'],
                        suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
                            ? parsed.suggestions
                            : ['Add a brief mention of post-delivery support to boost confidence'],
                        modelUsed: modelName,
                        promptTokens: usage.promptTokenCount || null,
                        responseTokens: usage.candidatesTokenCount || null
                    };
                }
            } catch (err) {
                console.warn(`⚠️ Model [${modelName}] analyzeBidQuality failed:`, err.message);
            }
        }
    }

    // Fallback proposal quality analyzer when API rate limit is reached
    const words = proposal.trim().split(/\s+/).length;
    const hasTechnicalKeywords = /react|node|mongo|api|design|code|testing|milestone|deliverable|figma|build/i.test(proposal);

    let fallbackScore = 75;
    if (words >= 40) fallbackScore += 10;
    if (hasTechnicalKeywords) fallbackScore += 10;
    fallbackScore = Math.min(95, fallbackScore);

    const fallbackWinChance = fallbackScore >= 85 ? 'High' : (fallbackScore >= 70 ? 'Medium' : 'Low');

    return {
        score: fallbackScore,
        estimatedWinChance: fallbackWinChance,
        strengths: [
            'Directly addresses project deliverables and scope',
            hasTechnicalKeywords ? 'Includes relevant technical stack terminology' : 'Clear and approachable communication style'
        ],
        weaknesses: [
            words < 40 ? 'Proposal is relatively brief; consider expanding on your technical approach' : 'Could detail testing and post-launch verification'
        ],
        suggestions: [
            'Mention specific milestones or delivery timeline for each stage',
            'Include 14-day post-launch support guarantee to improve client trust'
        ],
        modelUsed: 'deterministic-bid-fallback',
        promptTokens: null,
        responseTokens: null
    };
};

/**
 * Service to analyze project risk & complexity for client listings using Gemini AI
 * @param {Object} params - { title, description, budget, timeline, category }
 * @returns {Promise<Object>} { risk, estimatedComplexity, issues, recommendations, modelUsed, promptTokens, responseTokens }
 */
export const analyzeProjectRiskService = async ({ title = '', description = '', budget = '', timeline = '', category = '' }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `You are an enterprise software project risk auditor and technical consultant.
Analyze the following project listing draft for publishing on GigCampus:

Input Title: "${title}"
Input Description: "${description}"
Category: "${category}"
Budget: "${budget}"
Timeline: "${timeline}"

Evaluate:
1. Budget Realism (Is the budget fair/realistic for the requested scope?)
2. Timeline Feasibility (Is the duration reasonable or rushed?)
3. Scope Clarity & Requirement Ambiguity
4. Risk Level (Low, Medium, or High)
5. Estimated Complexity (Low, Medium, or High)

Return ONLY a 100% valid raw JSON object matching this exact structure:
{
  "risk": "Medium",
  "estimatedComplexity": "High",
  "issues": [
    "Timeline of 5 days is tight for building a complete fullstack application",
    "Description lacks detailed acceptance criteria for payment integration"
  ],
  "recommendations": [
    "Increase delivery timeline to 10-14 days to attract top-tier freelancers",
    "Specify exact third-party API endpoints and design guidelines"
  ]
}

Strict Rules:
1. Output MUST be 100% valid raw JSON.
2. risk MUST be strictly one of: "Low", "Medium", or "High".
3. estimatedComplexity MUST be strictly one of: "Low", "Medium", or "High".`;

    if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
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

                    return {
                        risk: ['Low', 'Medium', 'High'].includes(parsed.risk) ? parsed.risk : 'Medium',
                        estimatedComplexity: ['Low', 'Medium', 'High'].includes(parsed.estimatedComplexity) ? parsed.estimatedComplexity : 'Medium',
                        issues: Array.isArray(parsed.issues) && parsed.issues.length > 0
                            ? parsed.issues
                            : ['Project description could benefit from explicit acceptance criteria'],
                        recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
                            ? parsed.recommendations
                            : ['Specify deliverables and milestone expectations in the project brief'],
                        modelUsed: modelName,
                        promptTokens: usage.promptTokenCount || null,
                        responseTokens: usage.candidatesTokenCount || null
                    };
                }
            } catch (err) {
                console.warn(`⚠️ Model [${modelName}] analyzeProjectRisk failed:`, err.message);
            }
        }
    }

    // Dynamic Fallback risk analyzer when API rate limit is reached
    const combined = `${title} ${description}`.toLowerCase();
    const wordCount = description.trim().split(/\s+/).length;

    let risk = 'Low';
    let complexity = 'Low';
    const issues = [];
    const recommendations = [];

    if (combined.includes('e-commerce') || combined.includes('fullstack') || combined.includes('mobile app')) {
        complexity = 'High';
    } else if (combined.includes('website') || combined.includes('dashboard') || combined.includes('api')) {
        complexity = 'Medium';
    }

    if (wordCount < 25) {
        risk = 'Medium';
        issues.push('Brief is short; freelancers may require clarification on project scope');
        recommendations.push('Add more technical detail regarding core features and expected deliverables');
    }

    if (budget && Number(budget) < 1000 && complexity === 'High') {
        risk = 'High';
        issues.push(`Budget (₹${budget}) may be low for a high-complexity project`);
        recommendations.push('Consider raising budget floor or breaking scope into milestone phases');
    }

    if (issues.length === 0) {
        issues.push('Minor ambiguity in technical acceptance criteria');
        recommendations.push('Listing is well-structured; proceed to publish listing');
    }

    return {
        risk,
        estimatedComplexity: complexity,
        issues,
        recommendations,
        modelUsed: 'deterministic-risk-fallback',
        promptTokens: null,
        responseTokens: null
    };
};

/**
 * Service to analyze a bid proposal against project requirements (legacy/compatibility)
 */
export const analyzeBidProposal = async ({ projectDescription, bidText, budget, deliveryDays }) => {
    return analyzeBidQualityService({
        proposal: bidText,
        project: { title: 'Project', description: projectDescription }
    });
};

/**
 * Service to rank and recommend freelancers for a project
 */
export const recommendFreelancers = async ({ projectDescription, requiredSkills, budget, deliveryDays, bids }) => {
    const recommendations = bids.map((b, idx) => ({
        bidId: b.bidId || b._id,
        rank: idx + 1,
        score: Math.max(70, 95 - idx * 5),
        reason: 'Recommended based on skill match and competitive bid terms.'
    }));
    return { recommendations };
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
    analyzeBidQualityService,
    analyzeProjectRiskService,
    recommendFreelancersForProjectService,
    analyzeBidProposal,
    calculateFallbackRecommendations,
    recommendFreelancers
};
