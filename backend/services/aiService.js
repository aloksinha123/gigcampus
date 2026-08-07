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
    const modelsToTry = ['gemini-3.5-flash', 'gemini-2.0-flash'];
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

    try {
        const parsedJSON = JSON.parse(cleanedText);
        return parsedJSON;
    } catch (parseError) {
        console.error('⚠️ JSON parse error detail:', parseError.message);
        console.error('⚠️ Cleaned string attempted to parse:', cleanedText);
        throw new Error('Invalid JSON format received from AI model.');
    }
};

/**
 * Analyzes a freelancer's bid proposal against a project description using Google Gemini AI
 * @param {Object} params - Object containing projectDescription, bidText, budget, deliveryDays
 * @returns {Object} Parsed JSON analysis with score, requirementMatch, professionalism, communication, risk, strengths, weaknesses, missingPoints, improvedBid
 */
export const analyzeBidProposal = async ({ projectDescription, bidText, budget, deliveryDays }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert freelance bid auditor and technical project consultant for a campus marketplace.
Analyze the following project description and freelancer bid proposal.

Project Description:
"${projectDescription}"

Freelancer Proposed Bid Details:
- Bid Message: "${bidText}"
- Proposed Amount: ₹${budget}
- Proposed Delivery Timeframe: ${deliveryDays} days

Perform a rigorous bid analysis and return ONLY valid JSON with this exact structure:
{
  "score": 85,
  "requirementMatch": 90,
  "professionalism": "Excellent",
  "communication": "Very Good",
  "risk": "Low",
  "strengths": [
    "Specific technical alignment with project requirements",
    "Realistic delivery timeline"
  ],
  "weaknesses": [
    "Could clarify milestone breakdown"
  ],
  "missingPoints": [
    "Did not mention post-delivery support"
  ],
  "improvedBid": "An improved, highly persuasive rewrite of the freelancer's bid proposal..."
}

Strict Rules:
1. Output MUST be 100% valid raw JSON matching the schema.
2. "score" and "requirementMatch" MUST be integers between 0 and 100.
3. "professionalism" MUST be one of: "Excellent", "Good", "Fair", "Needs Improvement".
4. "communication" MUST be one of: "Very Good", "Good", "Fair", "Poor".
5. "risk" MUST be one of: "Low", "Medium", "High".
6. "strengths", "weaknesses", and "missingPoints" MUST be non-empty arrays of strings.
7. "improvedBid" MUST be a professional, complete rewrite of the bid text.
8. Do NOT use markdown code blocks or any text outside the JSON object.`;

    let responseText = '';
    const modelsToTry = ['gemini-3.5-flash', 'gemini-2.0-flash'];
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
                console.log(`✨ Smart Bid Analyzer completed using model [${modelName}]`);
                break;
            }
        } catch (err) {
            console.warn(`⚠️ Smart Bid Analyzer model [${modelName}] failed:`, err.message);
            lastError = err;
        }
    }

    if (!responseText || !responseText.trim()) {
        throw lastError || new Error('Failed to generate response from Gemini AI models.');
    }

    // Extract JSON string between first '{' and last '}'
    let cleanedText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    try {
        const parsedJSON = JSON.parse(cleanedText);
        return parsedJSON;
    } catch (parseError) {
        console.error('⚠️ Smart Bid Analyzer JSON parse error:', parseError.message);
        console.error('⚠️ Cleaned text attempted:', cleanedText);
        throw new Error('Invalid JSON format received from AI model.');
    }
};

/**
 * Deterministic Fallback Recommendation Engine when AI models are unavailable/rate-limited
 */
export const calculateFallbackRecommendations = ({ projectDescription, requiredSkills = [], budget, deliveryDays, bids = [] }) => {
    console.log("===== USING FALLBACK RECOMMENDATION ENGINE =====");

    const recommendations = bids.map((bid) => {
        const freelancerId = (bid.freelancerId || bid._id || bid.id || '').toString();
        const username = bid.username || 'Freelancer';
        const bidSkills = Array.isArray(bid.skills) ? bid.skills.map(s => s.toLowerCase().trim()) : [];
        const reqSkills = Array.isArray(requiredSkills) ? requiredSkills.map(s => s.toLowerCase().trim()) : [];

        // 1. Skill Match Score (50%)
        let matchedSkillsCount = 0;
        const missingSkillsList = [];
        if (reqSkills.length > 0) {
            reqSkills.forEach(reqSkill => {
                if (bidSkills.some(bs => bs.includes(reqSkill) || reqSkill.includes(bs))) {
                    matchedSkillsCount++;
                } else {
                    missingSkillsList.push(reqSkill);
                }
            });
        }
        const skillScore = reqSkills.length > 0
            ? (matchedSkillsCount / reqSkills.length) * 50
            : 50;

        // 2. Average Rating Score (20%)
        const avgRating = Number(bid.averageRating) || 0;
        const ratingScore = Math.min(20, (avgRating / 5) * 20);

        // 3. Completed Projects Score (15%)
        const completedProjects = Number(bid.completedProjects) || 0;
        const projectsScore = Math.min(15, (completedProjects / 10) * 15);

        // 4. Budget Competitiveness Score (10%)
        const bidAmount = Number(bid.bidAmount || bid.price) || 0;
        const targetBudget = Number(budget) || 0;
        let budgetScore = 10;
        if (targetBudget > 0 && bidAmount > targetBudget) {
            budgetScore = Math.max(0, 10 - (((bidAmount - targetBudget) / targetBudget) * 10));
        }

        // 5. Delivery Time Score (5%)
        const bidDays = Number(bid.deliveryDays || bid.timeline) || 0;
        const targetDays = Number(deliveryDays) || 0;
        let deliveryScore = 5;
        if (targetDays > 0 && bidDays > targetDays) {
            deliveryScore = Math.max(0, 5 - (((bidDays - targetDays) / targetDays) * 5));
        }

        // Total Score (0 - 100)
        const totalScore = Math.min(100, Math.max(0, Math.round(skillScore + ratingScore + projectsScore + budgetScore + deliveryScore)));

        // Strengths Generator
        const strengths = [];
        if (reqSkills.length > 0 && matchedSkillsCount === reqSkills.length) {
            strengths.push(`Perfect skill match (${matchedSkillsCount}/${reqSkills.length} required skills matched)`);
        } else if (matchedSkillsCount > 0) {
            strengths.push(`Strong skill alignment (${matchedSkillsCount}/${reqSkills.length} required skills matched)`);
        }
        if (avgRating >= 4.5) {
            strengths.push(`High user rating (${avgRating.toFixed(1)}/5.0)`);
        }
        if (completedProjects >= 5) {
            strengths.push(`Extensive portfolio with ${completedProjects} completed projects`);
        }
        if (targetBudget > 0 && bidAmount <= targetBudget) {
            strengths.push(`Competitive budget proposal (₹${bidAmount})`);
        }
        if (targetDays > 0 && bidDays <= targetDays) {
            strengths.push(`Fast delivery timeline (${bidDays} days)`);
        }
        if (strengths.length === 0) {
            strengths.push("Submitted valid proposal for project");
        }

        // Concerns Generator
        const concerns = [];
        if (missingSkillsList.length > 0) {
            concerns.push(`Missing skills: ${missingSkillsList.slice(0, 3).join(', ')}`);
        }
        if (avgRating > 0 && avgRating < 4.0) {
            concerns.push(`User rating is ${avgRating.toFixed(1)}/5.0`);
        }
        if (completedProjects < 3) {
            concerns.push(`Limited completed projects on platform (${completedProjects})`);
        }
        if (targetBudget > 0 && bidAmount > targetBudget) {
            concerns.push(`Proposed price (₹${bidAmount}) exceeds target budget (₹${targetBudget})`);
        }
        if (targetDays > 0 && bidDays > targetDays) {
            concerns.push(`Proposed timeline (${bidDays} days) exceeds target (${targetDays} days)`);
        }

        // Concise Reason
        const reason = `${username} scored ${totalScore}/100 based on ${matchedSkillsCount}/${reqSkills.length || 0} skills matched and a ${avgRating ? avgRating.toFixed(1) : 'N/A'} star rating.`;

        return {
            freelancerId,
            score: totalScore,
            rank: 1,
            strengths,
            concerns,
            reason
        };
    });

    // Sort descending by score
    recommendations.sort((a, b) => b.score - a.score);
    recommendations.forEach((item, index) => {
        item.rank = index + 1;
    });

    console.log("===== PARSED RECOMMENDATIONS ARRAY (FALLBACK) =====");
    console.dir(recommendations, { depth: null });

    return {
        recommendations
    };
};

/**
 * Ranks and recommends freelancers for a project based on their bids, skills, and past performance using Google Gemini AI
 * @param {Object} params - Contains projectDescription, requiredSkills, budget, deliveryDays, bids
 * @returns {Object} JSON object containing recommendations array sorted by rank/score
 */
export const recommendFreelancers = async ({ projectDescription, requiredSkills = [], budget, deliveryDays, bids = [] }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `You are an expert AI talent acquisition specialist and freelancer auditor for a campus marketplace.
Evaluate the following project requirements and candidate freelancer bids.

Project Details:
- Description: "${projectDescription}"
- Required Skills: ${Array.isArray(requiredSkills) ? requiredSkills.join(', ') : 'Not specified'}
- Project Budget: ₹${budget}
- Max Delivery Days: ${deliveryDays}

Candidate Freelancer Bids (${bids.length} total candidates):
${JSON.stringify(bids, null, 2)}

CRITICAL INSTRUCTIONS:
1. You MUST evaluate and include an entry in "recommendations" for EVERY SINGLE freelancer provided in the input bids array.
2. If there are ${bids.length} input bids, there MUST be EXACTLY ${bids.length} recommendation objects in the "recommendations" array. Do NOT skip or omit any candidate.
3. Rank every freelancer from highest to lowest score (Rank 1 = highest score).

Return ONLY valid JSON matching this exact structure:
{
  "recommendations": [
    {
      "freelancerId": "exact_freelancerId_from_bid_input",
      "score": 95,
      "rank": 1,
      "strengths": [
        "Strong skill match",
        "High rating and completed projects count"
      ],
      "concerns": [
        "Delivery timeframe is tight"
      ],
      "reason": "Detailed summary explaining why this freelancer is recommended for the project."
    }
  ]
}

Strict Rules:
1. Output MUST be 100% valid raw JSON only.
2. Include ALL ${bids.length} freelancers from the input bids array in the recommendations array.
3. Sort the "recommendations" array in descending order by "score" (highest score first).
4. "score" MUST be an integer between 0 and 100.
5. "rank" MUST be an integer starting from 1 for top candidate.
6. "strengths" and "concerns" MUST be arrays of strings.
7. Do NOT use markdown code blocks or any commentary outside the JSON.`;

        let responseText = '';
        const modelsToTry = ['gemini-3.5-flash', 'gemini-2.0-flash'];

        for (const modelName of modelsToTry) {
            try {
                console.log(`🤖 Trying model: ${modelName}...`);
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json'
                    }
                });

                responseText = typeof response.text === 'function' ? response.text() : (response.text || '');
                if (responseText && responseText.trim()) {
                    console.log(`✨ AI Freelancer Recommendation Engine completed using model [${modelName}]`);
                    break;
                }
            } catch (err) {
                console.warn(`⚠️ Freelancer Recommendation Engine model [${modelName}] failed:`, err.message);
            }
        }

        if (responseText && responseText.trim()) {
            console.log("===== RAW GEMINI RECOMMENDATIONS RESPONSE =====");
            console.log(responseText);

            let cleanedText = responseText
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim();

            const firstBrace = cleanedText.indexOf('{');
            const lastBrace = cleanedText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
            }

            try {
                const parsedJSON = JSON.parse(cleanedText);
                const recommendations = parsedJSON.recommendations || [];

                if (Array.isArray(recommendations) && recommendations.length > 0) {
                    console.log("===== USING AI RECOMMENDATION =====");

                    const inputIds = bids.map(b => (b.freelancerId || b._id || b.id || '').toString());
                    const returnedIds = recommendations.map(r => (r.freelancerId || r.id || '').toString());

                    console.log("===== PARSED RECOMMENDATIONS ARRAY =====");
                    console.dir(recommendations, { depth: null });

                    console.log("Input Bids Length:", bids.length);
                    console.log("Output Recommendations Length:", recommendations.length);
                    console.log("Input Freelancer IDs:", inputIds);
                    console.log("Returned Freelancer IDs:", returnedIds);

                    if (recommendations.length < bids.length) {
                        const missingIds = inputIds.filter(id => !returnedIds.includes(id));
                        console.warn("⚠️ MISSING FREELANCER IDs IN AI RESPONSE:", missingIds);
                    }

                    parsedJSON.recommendations.sort((a, b) => (b.score || 0) - (a.score || 0));
                    parsedJSON.recommendations.forEach((item, index) => {
                        item.rank = index + 1;
                    });

                    return parsedJSON;
                }
            } catch (parseErr) {
                console.warn('⚠️ Failed to parse AI response as JSON, falling back to deterministic engine:', parseErr.message);
            }
        }
    }

    // Trigger Fallback Engine if AI models are unavailable, rate-limited, or failed
    return calculateFallbackRecommendations({ projectDescription, requiredSkills, budget, deliveryDays, bids });
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

    const prompt = `You are a world-class technical product manager and project scoping consultant.
Enhance and structure the following project details for publishing on GigCampus:

Input Title: "${title}"
Input Description: "${description}"
Category: "${category}"
Budget: "${budget}"
Timeline: "${timeline}"

Your task is to refine this project brief to be professional, clear, complete, and attractive to top freelancers.
Improve:
1. Professional writing & tone.
2. Scope clarity & acceptance criteria.
3. Key technical deliverables.
4. Recommended skills list.
5. Estimated complexity rating (Low, Medium, or High).

Return ONLY a 100% valid raw JSON object matching this exact structure:
{
  "enhancedTitle": "Refined, professional project title",
  "enhancedDescription": "Comprehensive, clear project description including scope, acceptance criteria, and key deliverables.",
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
                    enhancedTitle: parsed.enhancedTitle || title || 'Enhanced Project Title',
                    enhancedDescription: parsed.enhancedDescription || description,
                    recommendedSkills: Array.isArray(parsed.recommendedSkills) ? parsed.recommendedSkills : ['JavaScript', 'Web Development'],
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

    // Fallback template if Gemini API is exhausted/unavailable
    const fallbackDescription = `${description.trim()}\n\nKey Scope & Deliverables:\n- Well-structured, fully responsive implementation.\n- Clean, documented codebase adhering to best practices.\n- Timely completion within the specified budget (${budget || 'Negotiable'}).\n\nAcceptance Criteria:\n- 100% functional feature set.\n- Tested across modern browsers.`;

    return {
        enhancedTitle: title ? `Enhanced: ${title}` : 'Enhanced Project Title',
        enhancedDescription: fallbackDescription,
        recommendedSkills: ['Web Development', 'Software Architecture', 'REST API'],
        estimatedComplexity: 'Medium',
        modelUsed: 'fallback-template',
        promptTokens: null,
        responseTokens: null,
        warning: lastError?.message || null
    };
};

export default {
    improveProjectDescription,
    enhanceProjectDescriptionService,
    analyzeBidProposal,
    calculateFallbackRecommendations,
    recommendFreelancers
};
