import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

const IG_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FB_BASE_URL = "https://graph.facebook.com/v19.0";

// Helper to wait
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Polls the Instagram API to check if the media container is ready.
 * This prevents the "Media Not Found" error.
 */
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

/**
 * Cloudinary Optimization:
 * Instagram prefers JPG. We can transform your URL from .png to .jpg 
 * simply by replacing the extension.
 */
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

  // 1. Create Container (Converted to JPG for better compatibility)
  const container = await axios.post(`${FB_BASE_URL}/${IG_ID}/media`, {
    image_url: optimizeUrl(item.imageUrl),
    caption: item.caption,
    access_token: ACCESS_TOKEN,
  });

  // 2. WAIT for Meta to download the image
  await ensureMediaReady(container.data.id);

  // 3. Publish
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

  if (!group || group.postItems.length < 2) throw new Error("Carousel needs 2+ items");

  // 1. Create individual item containers
  const itemIds = await Promise.all(
    group.postItems.map(async (item) => {
      const res = await axios.post(`${FB_BASE_URL}/${IG_ID}/media`, {
        image_url: optimizeUrl(item.imageUrl!),
        is_carousel_item: true,
        access_token: ACCESS_TOKEN,
      });
      return res.data.id;
    })
  );

  // 2. Wait for ALL items to be ready (Meta processes them in parallel)
  await Promise.all(itemIds.map((id) => ensureMediaReady(id)));

  // 3. Create the Carousel container
  const carouselRes = await axios.post(`${FB_BASE_URL}/${IG_ID}/media`, {
    media_type: "CAROUSEL",
    children: itemIds,
    caption: group.description || group.title,
    access_token: ACCESS_TOKEN,
  });

  // 4. Wait for carousel container to be ready
  await ensureMediaReady(carouselRes.data.id);

  // 5. Final Publish
  const publish = await axios.post(`${FB_BASE_URL}/${IG_ID}/media_publish`, {
    creation_id: carouselRes.data.id,
    access_token: ACCESS_TOKEN,
  });

  await prisma.postGroup.update({ where: { id: groupId }, data: { status: "PUBLISHED" } });
  return NextResponse.json({ success: true, ig_id: publish.data.id });
}