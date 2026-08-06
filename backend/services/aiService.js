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

export default {
    improveProjectDescription,
    analyzeBidProposal
};
