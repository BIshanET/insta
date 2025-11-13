import { NextResponse } from "next/server"
import Handlebars from "handlebars"
import puppeteer from "puppeteer"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();// import { uploadToCloudinary } from "@/lib/upload" // create this helper

// ✅ POST /api/templates/generate
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
    await page.setContent(renderedHTML, { waitUntil: "networkidle0" })

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
