import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Handlebars from "handlebars";
import path from "path";
import fs from "fs/promises";
import { uploadToBbImage } from "@/app/lib/uploadToBbImage";

// IMPORTANT: Use puppeteer-core and sparticuz/chromium
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const prisma = new PrismaClient();

// Optional: Helper to determine if we are local or on Vercel
const isLocal = process.env.NODE_ENV === 'development';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const dataType = searchParams.get("dataType");
    const height: number = parseInt(searchParams.get("height") || "1080");
    const width: number = parseInt(searchParams.get("width") || "1080");

    // ... (Your existing Prisma and Handlebars logic stays the same) ...
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const bodyVars = await req.json();
    const finalVars: Record<string, any> = {};
    (template.variables as any || []).forEach((v: any) => {
      finalVars[v.key] = bodyVars?.[v.key] ?? v.default ?? "";
    });

    const templatesDir = path.join(process.cwd(), "uploads/templates");
    const filePath = path.join(templatesDir, template.html as string);
    const hbsSource = await fs.readFile(filePath, "utf-8");
    const compiled = Handlebars.compile(hbsSource);
    const renderedHTML = compiled(finalVars);

    // ---------- UPDATED PUPPETEER SECTION ----------
    let browser;

    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width, height },
        executablePath: true ? process.env.CHROME_PATH  : await chromium.executablePath(),
        headless: true,
        // ignoreHTTPSErrors: true,
      });

      const page = await browser.newPage();
      await page.setContent(renderedHTML, { waitUntil: "networkidle0" });

      const buffer = await page.screenshot({ type: "png" });
      await browser.close();

      const upload = await uploadToBbImage(buffer as any);

      return NextResponse.json({ imageUrl: upload.url });
    } catch (browserError) {
      console.error("Browser Error:", browserError);
      throw browserError;
    } finally {
      if (browser) await browser.close();
    }

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}