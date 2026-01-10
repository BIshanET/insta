export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import { uploadToBbImage } from "@/app/lib/uploadToBbImage";
import nodeHtmlToImage from "node-html-to-image";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const dataType = url.searchParams.get("dataType");
    const width = parseInt(url.searchParams.get("width") || "1080");
    const height = parseInt(url.searchParams.get("height") || "1080");

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
      return NextResponse.json(
        { error: "Invalid dataType" },
        { status: 400 }
      );
    }

    const templatesDir = path.join(process.cwd(), "uploads/templates");
    const filePath = path.join(templatesDir, template.html);
    const hbsSource = await fs.readFile(filePath, "utf-8");
    const compiled = Handlebars.compile(hbsSource);
    const renderedHTML = compiled(finalVars);

    // ---------------- HTML-to-Image Logic ----------------
    const buffer = await nodeHtmlToImage({
      html: renderedHTML,
      type: 'png',
      quality: 100,
      puppeteerArgs: ['--no-sandbox', '--disable-setuid-sandbox'] as any,
      // custom viewport
      content: renderedHTML as any,
      encoding: 'buffer' as any,
      transparent: false,
      waitUntil: 'domcontentloaded',
    });

    const upload = await uploadToBbImage(buffer as any);

    return NextResponse.json({ imageUrl: upload.url });
  } catch (err: any) {
    console.error("Error generating image:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
