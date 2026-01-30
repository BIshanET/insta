import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FB_BASE_URL = "https://graph.facebook.com/v19.0";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// --- NEW HELPER: Formats caption + appends user tags ---
const buildCaption = (text: string | null | undefined, tags: string[]) => {
  let finalCaption = text || "";

  if (tags && tags.length > 0) {
    // Ensure tags start with @ and join them with a space
    const tagString = tags
      .map((t) => (t.startsWith("@") ? t : `@${t}`))
      .join(" ");
    
    // Append tags with a double newline for separation
    finalCaption += `\n\n${tagString}`;
  }

  return finalCaption;
};

async function ensureMediaReady(containerId: string) {
  for (let i = 0; i < 10; i++) { // Try for 30 seconds
    const res = await axios.get(`${FB_BASE_URL}/${containerId}`, {
      params: { fields: "status_code", access_token: ACCESS_TOKEN },
    });
    
    if (res.data.status_code === "FINISHED") return true;
    if (res.data.status_code === "ERROR") throw new Error("Meta failed to process image.");
    
    console.log(`Waiting for media... attempt ${i + 1}`);
    await delay(3000); 
  }
  throw new Error("Media processing timed out.");
}

const optimizeUrl = (url: string) => url.replace(/\.(png|webp)$/i, ".jpg");

export async function POST(request: Request) {
  try {
    const { id, type } = await request.json();

    if (type === "GROUPED") {
      return await handleCarousel(id);
    } else {
      return await handleSinglePost(id);
    }
  } catch (error: any) {
    console.error("Publish Error:", error.response?.data || error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleSinglePost(itemId: string) {
  const item = await prisma.postItem.findUnique({ where: { id: itemId } });
  if (!item || !item.imageUrl) throw new Error("Item not found");

  // --- LOGIC ADDED: Build caption with userTags ---
  const finalCaption = buildCaption(item.caption, item.userTags);

  // 1. Create Container (Converted to JPG for better compatibility)
  const container = await axios.post(`${FB_BASE_URL}/${IG_ID}/media`, {
    image_url: optimizeUrl(item.imageUrl),
    caption: finalCaption, // Use the combined caption
    access_token: ACCESS_TOKEN,
  });

  await ensureMediaReady(container.data.id);

  const publish = await axios.post(`${FB_BASE_URL}/${IG_ID}/media_publish`, {
    creation_id: container.data.id,
    access_token: ACCESS_TOKEN,
  });

  await prisma.postItem.update({ where: { id: itemId }, data: { status: "PUBLISHED" } });
  return NextResponse.json({ success: true, ig_id: publish.data.id });
}

async function handleCarousel(groupId: string) {
  const group = await prisma.postGroup.findUnique({
    where: { id: groupId },
    include: { postItems: { orderBy: { order: "asc" } } },
  });

  const allItemImageUrls = [];
  if (group?.imageUrl) {
    allItemImageUrls.push(group.imageUrl);
  }
  group?.postItems.forEach(item => {
    if (item.imageUrl) {
      allItemImageUrls.push(item.imageUrl);
    }
  });

  if (!group || allItemImageUrls.length < 2) {
    throw new Error("Carousel needs 2+ items");
  }

  // --- LOGIC ADDED: Build caption using Group Description and Group UserTags ---
  const finalCaption = buildCaption(group.description || group.title, group.userTags);

  const itemIds = await Promise.all(
    allItemImageUrls.map(async (imageUrl) => {
      const res = await axios.post(`${FB_BASE_URL}/${IG_ID}/media`, {
        image_url: optimizeUrl(imageUrl),
        is_carousel_item: true,
        access_token: ACCESS_TOKEN,
      });
      return res.data.id;
    })
  );

  await Promise.all(itemIds.map((id) => ensureMediaReady(id)));

  const carouselRes = await axios.post(`${FB_BASE_URL}/${IG_ID}/media`, {
    media_type: "CAROUSEL",
    children: itemIds,
    caption: finalCaption, // Use the combined group caption
    access_token: ACCESS_TOKEN,
  });

  await ensureMediaReady(carouselRes.data.id);

  const publish = await axios.post(`${FB_BASE_URL}/${IG_ID}/media_publish`, {
    creation_id: carouselRes.data.id,
    access_token: ACCESS_TOKEN,
  });

  await prisma.postGroup.update({ where: { id: groupId }, data: { status: "PUBLISHED" } });
  return NextResponse.json({ success: true, ig_id: publish.data.id });
}