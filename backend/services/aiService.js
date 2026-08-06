import { GoogleGenAI } from '@google/genai';

/**
 * Generates an improved, structured project description using official Google GenAI SDK and gemini-2.5-flash model
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
2. Do NOT use markdown code blocks (do NOT use \`\`\`json or \`\`\`).
3. Do NOT include any intro text, explanations, or commentary outside the JSON object.`;

    let responseText = '';

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        responseText = response.text || '';
    } catch (modelErr) {
        console.warn('⚠️ gemini-2.5-flash model call failed, trying fallback gemini-2.0-flash model:', modelErr.message);
        try {
            const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });
            responseText = fallbackResponse.text || '';
        } catch (fallbackErr) {
            console.error('⚠️ Fallback model failed as well:', fallbackErr.message);
            throw modelErr;
        }
    }

    // Clean any markdown formatting if present
    const cleanedText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    try {
        const parsedJSON = JSON.parse(cleanedText);
        return parsedJSON;
    } catch (parseError) {
        console.error('⚠️ Failed to parse GenAI response as JSON:', responseText);
        throw new Error('Invalid JSON format received from AI model.');
    }
};

export default {
    improveProjectDescription
};
