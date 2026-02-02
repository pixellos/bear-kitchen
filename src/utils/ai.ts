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

/**
 * Generates a consolidated shopping list from a list of recipes.
 */
export const generateShoppingList = async (recipes: { title: string; content: string }[]): Promise<string> => {
    if (recipes.length === 0) return "No recipes selected. 🍯";

    const recipeData = recipes.map(r => `Title: ${r.title}\nContent: ${r.content}`).join('\n\n---\n\n');

    const prompt = `
    TASK: Act as a cooking assistant.
    INPUT: A set of recipes (titles and content).
    
    GOAL: 
    1. Extract all ingredients from the recipes.
    2. Consolidate them into a single, organized shopping list (e.g., Produce, Dairy, Pantry).
    3. Sum up quantities where possible (e.g., if two recipes need 2 eggs, list "4 Eggs").
    4. **CRITICAL: Use Polish units (kg, gramy, litry/ml)**. Convert smaller units to larger ones where appropriate (e.g., 1000g -> 1kg).
    5. Format the output in clean, readable Markdown with checkboxes [ ].
    
    CONSTRAINTS:
    - Keep it concise.
    - If quantities are unclear, just list the ingredient.
    - DO NOT add items that aren't in the recipes unless they are obvious staples.
    
    RECIPES TO PROCESS:
    ---
    ${recipeData}
    ---
    
    Return ONLY the Markdown shopping list.
    `;

    const url = 'https://text.pollinations.ai/';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                model: 'openai'
            })
        });

        if (!response.ok) {
            throw new Error(`AI Service Error: ${response.statusText}`);
        }

        return await response.text();
    } catch (e) {
        console.error("Shopping List Error:", e);
        return "Failed to generate shopping list. Please try again later. 🐻";
    }
};
