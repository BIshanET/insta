import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
  });

  const prompt = `
Rephrase the following text in clear, natural English.
Keep the original meaning.
Do not add emojis.
Do not add hashtags.
Return only the rewritten sentence.

Text:
"${text}"
`;

  const result = await model.generateContent(prompt);
  const rewritten = result.response.text();

  return NextResponse.json({ rewritten: rewritten.trim() });
}
