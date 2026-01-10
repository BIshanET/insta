import { NextResponse } from "next/server"
import Handlebars from "handlebars"
import puppeteer from "puppeteer"
import { PrismaClient } from "@prisma/client";
import { url } from "inspector";

const prisma = new PrismaClient();// import { uploadToCloudinary } from "@/lib/upload" // create this helper

export async function POST(req: Request) {
  try {
    
    const { templateId, variables } = await req.json()
        


    if (!templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 })
    }

    // 1️⃣ Fetch the template from DB
    const template = await prisma.template.findUnique({ where: { id: templateId } })
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // 2️⃣ Compile the Handlebars template with user variables
    const compile = Handlebars.compile(template.html.replaceAll("\n",""))
    const renderedHTML = compile(variables || {})

    // 3️⃣ Render the HTML to an image using Puppeteer
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(renderedHTML, { waitUntil: "domcontentloaded" })

    // Adjust screenshot size (optional)
    const buffer = await page.screenshot({ type: "png" })
    await browser.close()

    // 4️⃣ Upload the image to Cloudinary (or S3)
    // const imageUrl = await uploadToCloudinary(buffer)

    // 5️⃣ Return the URL to the client
    return NextResponse.json({ renderedHTML })
  } catch (error) {
    console.error("Error generating image:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(req:Request) {
 
  try {
     const {searchParams } = new URL(req.url)
  const type = searchParams.get("type");


    const templates = await prisma.template.findMany({
      where:{
        type : type as any
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(templates, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}