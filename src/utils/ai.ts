export interface AIRecipeResult {
    title: string;
    content: string;
    tags: string[];
}

export const scanRecipeWithAI = async (tokenOrKey: string, base64Image: string, isOAuth: boolean = false): Promise<AIRecipeResult> => {
    // Remove data:image/...;base64, prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const prompt = `
    Extract the food recipe from this image. 
    Return the result strictly as a JSON object with the following structure:
    {
      "title": "Recipe Name",
      "content": "Recipe content in clean Markdown format including ingredients and steps",
      "tags": ["tag1", "tag2"]
    }
    Use common tags like: breakfast, lunch, dinner, meal, dessert, snack, meat, veg.
    Only return the JSON object, no other text.
  `;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Data
                    }
                }
            ]
        }]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent${isOAuth ? '' : `?key=${tokenOrKey}`}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (isOAuth) {
        headers['Authorization'] = `Bearer ${tokenOrKey}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        console.error("Gemini API Error:", err);
        throw new Error(err.error?.message || "Gemini API request failed");
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error("No response from Gemini");
    }

    // Try to parse JSON from the response (sometimes Gemini wraps it in ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Could not parse AI response as JSON");
    }

    return JSON.parse(jsonMatch[0]) as AIRecipeResult;
};
