import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generates an improved, structured project description using Google Gemini API
 * @param {string} rawDescription - The initial raw project description from the user
 * @returns {Object} Parsed JSON object containing title, summary, requirements, skills, timeline, budget, deliverables
 */
export const improveProjectDescription = async (rawDescription) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in backend/.env.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    // Clean any markdown formatting if present
    const cleanedText = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    try {
        const parsedJSON = JSON.parse(cleanedText);
        return parsedJSON;
    } catch (parseError) {
        console.error('⚠️ Failed to parse Gemini response as JSON:', responseText);
        throw new Error('Invalid JSON format received from AI model.');
    }
};

export default {
    improveProjectDescription
};
