import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "NGROK_URL" },
  });

  return NextResponse.json({
    url: config?.value || null,
  });
}


export async function POST(req: Request) {
  const { url } = await req.json();

  if (!url) {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400 }
    );
  }

  const config = await prisma.systemConfig.upsert({
    where: { key: "NGROK_URL" },
    update: { value: url },
    create: { key: "NGROK_URL", value: url },
  });

  return NextResponse.json({
    success: true,
    url: config.value,
  });
}

