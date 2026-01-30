import { NextResponse } from "next/server";
import { contentType, PrismaClient } from "@prisma/client";
import { uploadToCloudinary } from "@/app/lib/upload";
import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// export async function POST(req: Request) {
//   try {
//     const body = await req.json();
//     const { name, html, variables } = body;

//     if (!name || !html) {
//       return NextResponse.json({ error: "Name and HTML are required" }, { status: 400 });
//     }

//     const testVariables: Record<string, any> = {};
//     if (Array.isArray(variables)) {
//       variables.forEach((v: any) => {
//         testVariables[v.key] = v.default || "Sample Text";
//       });
//     }

//     const compile = Handlebars.compile(html.replaceAll("\n", ""));
//     const renderedHTML = compile(testVariables);

//     const browser = await puppeteer.launch({
//       headless: true,
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();
//     await page.setContent(renderedHTML, { waitUntil: "networkidle0" });
//     await page.setViewport({ width: 800, height: 600 }); // Thumbnail size

//     const buffer = await page.screenshot({ type: "png" });
//     await browser.close();

//     const uploadResult: any = await uploadToCloudinary(buffer);
//     const thumbnailUrl = uploadResult.secure_url;

//     const template = await prisma.template.create({
//       data: {
//         name,
//         html,
//         variables: variables || [],
//         thumbnail: thumbnailUrl,
//       },
//     });

//     return NextResponse.json(template);
//   } catch (error) {
//     console.error("Error creating template:", error);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const variablesRaw = formData.get("variables") as string;
    const file = formData.get("file") as File;
   
    const type: "Post" | "PostGroup" = formData.get("type") as
      | "Post"
      | "PostGroup";
    const contentType:contentType = formData.get("contentType") as contentType

    const height: number = contentType == "Reel" ? 1920 : 1080
    const width: number = 1080;

    if (!name || !file) {
      return NextResponse.json(
        { error: "Name and Handlebars file are required" },
        { status: 400 },
      );
    }

    if (!file.name.endsWith(".hbs")) {
      return NextResponse.json(
        { error: "Invalid template file" },
        { status: 400 },
      );
    }

    const variables = variablesRaw ? JSON.parse(variablesRaw) : [];

    const uploadDir = path.join(process.cwd(), "uploads/templates");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const testVariables: Record<string, any> = {};
    if (Array.isArray(variables)) {
      variables.forEach((v: any) => {
        testVariables[v.key] = v.default || "Sample Text";
      });
    }

    const templateSource = await fs.readFile(filePath, "utf-8");
    const compile = Handlebars.compile(templateSource);
    const renderedHTML = compile(testVariables);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: width || 1080,
      height: height || 1080,
      deviceScaleFactor: 1,
    });
    await page.setContent(renderedHTML, { waitUntil: "networkidle0" });

    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
    });
    await browser.close();

    const uploadResult: any = await uploadToCloudinary(screenshotBuffer as any);
    const thumbnailUrl = uploadResult.secure_url;

    /**
     * --------------------------------------
     * Save to DB
     * --------------------------------------
     */
    const template = await prisma.template.create({
      data: {
        name,
        html: fileName, // store .hbs file name
        variables,
        thumbnail: thumbnailUrl,
        type,
        contentType
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
