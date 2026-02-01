export interface AIRecipeResult {
    title: string;
    content: string;
    tags: string[];
}

/**
 * Uses Pollinations.ai (Free) to structure and clean up raw OCR text into a recipe.
 * Optimized to prevent hallucinations and strictly follow the source text.
 */
export const cleanRecipeTextFree = async (rawText: string): Promise<AIRecipeResult> => {
    const prompt = `
    TASK: Act as a recipe transcription assistant. 
    INPUT: Raw OCR text from one or more recipe photos.
    
    GOAL: 
    1. Extract the dish title.
    2. Extract ingredients and instructions strictly from the text.
    3. Format the recipe in clean, beautiful Markdown.
    4. Provide 3-5 relevant tags (e.g., breakfast, dessert, quick).

    CONSTRAINTS:
    - DO NOT add extra steps, ingredients, or commentary that are not in the raw text.
    - If the text is messy or missing parts, just do your best with what's available.
    - Output MUST be a valid JSON object.

    OUTPUT STRUCTURE:
    {
      "title": "Exact Recipe Name",
      "content": "Full recipe in Markdown (Ingredients & Steps)",
      "tags": ["tag1", "tag2", "tag3"]
    }

    RAW TEXT TO PROCESS:
    ---
    ${rawText}
    ---
    
    Return ONLY the JSON object.
    `;

    const url = 'https://text.pollinations.ai/';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                model: 'openai',
                jsonMode: true
            })
        });

        if (!response.ok) {
            throw new Error(`AI Service Error: ${response.statusText}`);
        }

        const text = await response.text();

        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                title: "Scanned Recipe",
                content: rawText,
                tags: ["scanned"]
            };
        }

        const result = JSON.parse(jsonMatch[0]) as AIRecipeResult;

        // Ensure values are strings/arrays as expected
        return {
            title: result.title || "Untitled Recipe",
            content: result.content || rawText,
            tags: Array.isArray(result.tags) ? result.tags : []
        };
    } catch (e) {
        console.error("Free AI Error:", e);
        return {
            title: "Scanned Recipe (Error)",
            content: rawText,
            tags: ["error"]
        };
    }
};
