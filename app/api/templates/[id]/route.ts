import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Handlebars from "handlebars";
import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import { uploadToBbImage } from "@/app/lib/uploadToBbImage";

const prisma = new PrismaClient();

// export async function GET(
//   req: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;

//     if (!id) {
//       return NextResponse.json(
//         { error: "Template ID is required" },
//         { status: 400 }
//       );
//     }

//     const template = await prisma.template.findUnique({ where: { id } });

//     if (!template) {
//       return NextResponse.json(
//         { error: "Template not found" },
//         { status: 404 }
//       );
//     }

//     // Parse query params
//     const url = new URL(req.url);
//     const queryVars = Object.fromEntries(url.searchParams.entries());

//     // Parse stored template variables
//     let templateVars: any[] = [];
//     try {
//       templateVars = Array.isArray(template.variables)
//         ? template.variables
//         : template.variables;
//     } catch {
//       templateVars = [];
//     }

//     // Build final variables object for Handlebars
//     const finalVars: Record<string, any> = {};
//     templateVars.forEach((v: any) => {
//       finalVars[v.key] = queryVars[v.key]
//         ? JSON.parse(queryVars[v.key])
//         : v.default ?? "";
//     });

//     // Compile HTML
//     const compiled = Handlebars.compile(template.html);
//     const renderedHTML = compiled(finalVars);

//     // ---------- PUPPETEER SECTION ----------
//     const browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });
//     const page = await browser.newPage();

//     await page.setViewport({
//       width: 900,
//       height: 900,
//       deviceScaleFactor: 1,
//     });

//     await page.setContent(renderedHTML, { waitUntil: "networkidle0" });

//     // Capture JPEG Screenshot
//     const jpegBuffer = await page.screenshot({
//       type: "jpeg",
//       quality: 80, // reduce size
//       omitBackground: false,
//     });

//     await browser.close();

//     // Convert to base64 (small & safe for JSON)
//     const imageBase64 = jpegBuffer.toString("base64");

//     // Build clean response object
//     const responseData = {
//       id: template.id,
//       name: template.name,
//       variables: templateVars,
//       imageBase64,  // <-- instead of renderedHTML
//     };

//     return NextResponse.json(responseData);
//   } catch (err: any) {
//     console.error("Error generating image:", err);
//     return NextResponse.json(
//       { error: err.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// export async function GET(
//   req: Request,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;

//     if (!id) {
//       return NextResponse.json(
//         { error: "Template ID is required" },
//         { status: 400 }
//       );
//     }

//     const template = await prisma.template.findUnique({ where: { id } });

//     if (!template) {
//       return NextResponse.json(
//         { error: "Template not found" },
//         { status: 404 }
//       );
//     }

//     const url = new URL(req.url);
//     const queryVars = Object.fromEntries(url.searchParams.entries());

//     let templateVars: any[] = [];
//     try {
//       templateVars = Array.isArray(template.variables)
//         ? template.variables
//         : template.variables;
//     } catch {
//       templateVars = [];
//     }

//     const finalVars: Record<string, any> = {};
//     templateVars.forEach((v: any) => {
//       finalVars[v.key] = queryVars[v.key]
//         ? JSON.parse(queryVars[v.key])
//         : v.default ?? "";
//     });

//     const templatesDir = path.join(process.cwd(), "uploads/templates");
//     const filePath = path.join(templatesDir, template.html);

//     const hbsSource = await fs.readFile(filePath, "utf-8");
//     const compiled = Handlebars.compile(hbsSource);
//     const renderedHTML = compiled(finalVars);

//     const browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();

//     await page.setViewport({
//       width: 1080,
//       height: 1080,
//       deviceScaleFactor: 1,
//     });

//     await page.setContent(renderedHTML, { waitUntil: "networkidle0" });

//     const jpegBuffer = await page.screenshot({
//       type: "jpeg",
//       quality: 80,
//       omitBackground: false,
//     });

//     await browser.close();

//     const imageBase64 = jpegBuffer.toString("base64");

//     const responseData = {
//       id: template.id,
//       name: template.name,
//       variables: templateVars,
//       imageBase64,
//     };

//     return NextResponse.json(responseData);
//   } catch (err: any) {
//     console.error("Error generating image:", err);
//     return NextResponse.json(
//       { error: err.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (process.env.VERCEL === "1") {
      const ngrokRes = await fetch(
        "https://cbd6d3aa733c.ngrok-free.app/api/system/ngrok",
        {
          headers: {
            Authorization: req.headers.get("Authorization") || "",
          },
        }
      );
      const { url } = await ngrokRes.json();

      const { pathname, search } = new URL(req.url);
      const forwardUrl = url + pathname + search;

      const headers = Object.fromEntries(req.headers.entries());

      // Optionally override/add headers (e.g., ensure Authorization is forwarded)
      headers["Authorization"] = req.headers.get("Authorization") || "";

      // Then pass to fetch
      const proxied = await fetch(forwardUrl, {
        method: "POST",
        headers,
        body: await req.text(),
      });

      const data = await proxied.text();
      return new NextResponse(data, { status: proxied.status });
    }
    // ===== END PROXY PART =====

    // ===== ORIGINAL LOGIC (UNCHANGED) =====
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const dataType = searchParams.get("dataType");
    const height: number = parseInt(searchParams.get("height") as string);
    const width: number = parseInt(searchParams.get("width") as string);

    if (!id || !dataType) {
      return NextResponse.json(
        { error: "Template ID and dataType are required" },
        { status: 400 }
      );
    }

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const bodyVars = await req.json();

    const finalVars: Record<string, any> = {};
    ((template.variables as any) || []).forEach((v: any) => {
      finalVars[v.key] = bodyVars?.[v.key] ?? v.default ?? "";
    });

    if (dataType === "variables") {
      return NextResponse.json({
        id: template.id,
        name: template.name,
        variables: template.variables,
      });
    }

    if (dataType !== "image") {
      return NextResponse.json({ error: "Invalid dataType" }, { status: 400 });
    }

    const templatesDir = path.join(process.cwd(), "uploads/templates");
    const filePath = path.join(templatesDir, template.html);

    const hbsSource = await fs.readFile(filePath, "utf-8");
    const compiled = Handlebars.compile(hbsSource);
    const renderedHTML = compiled(finalVars);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: width || 1080, height: height || 1080 });

    await page.setContent(renderedHTML, { waitUntil: "domcontentloaded" });

    const buffer = await page.screenshot({ type: "png" });
    await browser.close();

    const upload = await uploadToBbImage(buffer as any);

    return NextResponse.json({
      imageUrl: upload.url,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
