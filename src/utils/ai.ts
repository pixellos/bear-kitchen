import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIRecipeResult {
    title: string;
    content: string;
    tags: string[];
}

export const scanRecipeWithAI = async (apiKey: string, base64Image: string): Promise<AIRecipeResult> => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    // Remove data:image/...;base64, prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
            },
        },
    ]);

    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from the response (sometimes Gemini wraps it in ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Could not parse AI response as JSON");
    }

    return JSON.parse(jsonMatch[0]) as AIRecipeResult;
};
