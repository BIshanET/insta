import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Handlebars from "handlebars";
import puppeteer from "puppeteer-core"; // <-- changed
import chromium from "@sparticuz/chromium"; // <-- added
import fs from "fs/promises";
import path from "path";
import { uploadToBbImage } from "@/app/lib/uploadToBbImage";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (process.env.VERCEL === "1") {
      const config = await prisma.systemConfig.findUnique({
        where: { key: "NGROK_URL" },
      });

      const ngRokUrl = config?.value;

      const { pathname, search } = new URL(req.url);
      const forwardUrl = ngRokUrl + pathname + search;

      const proxied = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          Authorization: req.headers.get("Authorization") || "",
        },

        body: await req.text(),
      });

      const data = await proxied.text();
      return new NextResponse(data, { status: proxied.status });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const dataType = searchParams.get("dataType");

    if (!id || !dataType) {
      return NextResponse.json(
        { error: "Template ID and dataType are required" },
        { status: 400 },
      );
    }

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const dimentions = {
      Post: { height: 1080, width: 1080 },
      Reel: { height: 1920, width: 1080 },
      Story: { height: 1920, width: 1080 },
    };

    const height = dimentions[template.contentType].height;
    const width = dimentions[template.contentType].width;

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

    // -------------------- PUPPETEER --------------------
    const browser = await puppeteer.launch({
      executablePath: process.env.NODE_ENV == "development" ? process.env.CHROME_PATH : await chromium.executablePath(), // <-- critical
      headless: true,                      // <-- stable for Render
      args: chromium.args,                              // <-- sandbox/dev shm flags
    });

    const page = await browser.newPage();
    await page.setViewport({ width: width, height: height });

    await page.setContent(renderedHTML, { waitUntil: "networkidle0" });

    const buffer = await page.screenshot({ type: "png" });
    await browser.close();
    // -----------------------------------------------------

    const upload = await uploadToBbImage(buffer as any);

    return NextResponse.json({
      imageUrl: upload.url,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
