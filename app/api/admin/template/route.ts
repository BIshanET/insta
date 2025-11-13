import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client";
import { uploadToCloudinary } from "@/app/lib/upload";
import puppeteer from "puppeteer";
import Handlebars from "handlebars";


const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, html, variables } = body;

    if (!name || !html) {
      return NextResponse.json({ error: "Name and HTML are required" }, { status: 400 });
    }
    
    const testVariables: Record<string, any> = {};
    if (Array.isArray(variables)) {
      variables.forEach((v: any) => {
        testVariables[v.key] = v.default || "Sample Text";
      });
    }

    // ✅ 2️⃣ Compile the HTML template using Handlebars
    const compile = Handlebars.compile(html.replaceAll("\n", ""));
    const renderedHTML = compile(testVariables);

    // ✅ 3️⃣ Render the HTML to a screenshot thumbnail
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(renderedHTML, { waitUntil: "networkidle0" });
    await page.setViewport({ width: 800, height: 600 }); // Thumbnail size

    const buffer = await page.screenshot({ type: "png" });
    await browser.close();

    // ✅ 4️⃣ Upload thumbnail to Cloudinary
    const uploadResult: any = await uploadToCloudinary(buffer);
    const thumbnailUrl = uploadResult.secure_url;

    // ✅ 5️⃣ Save to database with thumbnail
    const template = await prisma.template.create({
      data: {
        name,
        html,
        variables: variables || [],
        thumbnail: thumbnailUrl,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
