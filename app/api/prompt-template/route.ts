import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const PROMPT_TEMPLATES: Record<string, string> = {
  movie_recommendations: `
    Research the movie: "{{text}}".
    Return a JSON object following this EXACT structure and format:
    {
      "number": "#00",
      "main_image": "Direct URL to a high-quality movie backdrop or poster",
      "movie_name": "Title in lowercase with | pipes | around the most important words (e.g., 'the | matrix |')",
      "year": "Release Year",
      "duration": "Duration (e.g., 2h 16m)",
      "genres": ["Genre1", "Genre2"],
      "director": "Director Name",
      "stars": "Comma separated top 3-4 actors",
      "description": "A compelling 1-2 sentence description. Use | pipes | around the most crucial plot point or keyword (e.g., 'A hacker discovers his reality is a | simulation |').",
      "screenshots": ["High quality movie still URL 1", "High quality movie still URL 2"]
    }
    
    Rules:
    - Return ONLY valid JSON.
    - If you cannot find high-quality image URLs, provide empty strings for images.
    - No markdown formatting, no code blocks, just the raw JSON string.
  `,
  soundtracks_list: `
    Research the official soundtrack (OST) or popular songs from the movie or TV show: "{{text}}".
    Return a JSON object following this EXACT structure and format:
    {
      "coverImage": "Direct URL to a high-quality album cover or movie poster",
      "headerTitle": "The official name of the Movie or Show",
      "songs": ["Song Title 1", "Song Title 2", "Song Title 3", "Song Title 4", "Song Title 5"],
      "artists": ["Artist 1", "Artist 2", "Artist 3", "Artist 4", "Artist 5"]
    }

    Rules:
    - The "songs" and "artists" arrays MUST have the exact same length.
    - Match each song title with its corresponding artist by the same index.
    - Return at least 5-8 most iconic tracks.
    - Return ONLY valid JSON.
    - If you cannot find high-quality image URLs, provide an empty string for coverImage.
    - No markdown formatting, no code blocks, just the raw JSON string.
  `
};

export async function POST(req: NextRequest) {
  try {
    const { key, text } = await req.json();

    if (!key || !PROMPT_TEMPLATES[key]) {
      return NextResponse.json({ error: `Invalid or missing key: ${key}` }, { status: 400 });
    }
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview", 
    });

    const basePrompt = PROMPT_TEMPLATES[key];
    const finalPrompt = basePrompt.replace("{{text}}", text);

    const result = await model.generateContent(finalPrompt);
    const responseText = result.response.text();

  
    const cleanJson = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const jsonData = JSON.parse(cleanJson);
      return NextResponse.json(jsonData);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", cleanJson);
      return NextResponse.json({ error: "AI returned invalid JSON format" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}