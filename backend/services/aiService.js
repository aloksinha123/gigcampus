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

    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
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
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
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
 * Ranks and recommends freelancers for a project based on their bids, skills, and past performance using Google Gemini AI
 * @param {Object} params - Contains projectDescription, requiredSkills, budget, deliveryDays, bids
 * @returns {Object} JSON object containing recommendations array sorted by rank/score
 */
export const recommendFreelancers = async ({ projectDescription, requiredSkills = [], budget, deliveryDays, bids = [] }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
    }

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
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
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
                console.log(`✨ AI Freelancer Recommendation Engine completed using model [${modelName}]`);
                break;
            }
        } catch (err) {
            console.warn(`⚠️ Freelancer Recommendation Engine model [${modelName}] failed:`, err.message);
            lastError = err;
        }
    }

    if (!responseText || !responseText.trim()) {
        throw lastError || new Error('Failed to generate response from Gemini AI models.');
    }

    // Extract JSON substring between first '{' and last '}'
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

        if (parsedJSON && Array.isArray(parsedJSON.recommendations)) {
            // Guarantee all input bids exist in recommendations
            const existingIds = new Set(parsedJSON.recommendations.map(r => r.freelancerId));
            
            bids.forEach(bid => {
                const idStr = bid.freelancerId || bid._id;
                if (idStr && !existingIds.has(idStr)) {
                    parsedJSON.recommendations.push({
                        freelancerId: idStr,
                        score: 50,
                        rank: parsedJSON.recommendations.length + 1,
                        strengths: ["Submitted bid proposal"],
                        concerns: ["Needs further evaluation"],
                        reason: "Candidate evaluated."
                    });
                }
            });

            // Sort descending by score
            parsedJSON.recommendations.sort((a, b) => (b.score || 0) - (a.score || 0));
            parsedJSON.recommendations.forEach((item, index) => {
                item.rank = index + 1;
            });
        }

        return parsedJSON;
    } catch (parseError) {
        console.error('⚠️ Freelancer Recommendation JSON parse error:', parseError.message);
        console.error('⚠️ Cleaned text attempted:', cleanedText);
        throw new Error('Invalid JSON format received from AI model.');
    }
};

export default {
    improveProjectDescription,
    analyzeBidProposal,
    recommendFreelancers
};
