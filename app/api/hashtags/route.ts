import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { caption } = await req.json();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
  });

  const prompt = `
Generate 30 viral and trending Instagram hashtags for the following caption.

Caption:
"${caption}"

Requirements:
- If the caption has multiple words, make sure hashtags cover all important keywords.
- If it is a single word, generate related and trending hashtags for that word.
- Return exactly 40 hashtags.
- Only return hashtags.
- Space separated.
- No explanation.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return NextResponse.json({ hashtags: text.trim() });
}
