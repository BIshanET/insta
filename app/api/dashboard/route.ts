import { NextResponse } from "next/server";
import { PrismaClient, PostStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Missing user id" },
        { status: 401 }
      );
    }

    // Instagram Credentials
    const instaToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const instaId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    // Execute all queries in parallel for speed
    const [dbUser, groupStats, itemStats, instaResponse] = await Promise.all([
      // 1. Fetch Basic DB User Details (Fallback)
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      }),

      // 2. Get PostGroup Counts by Status
      prisma.postGroup.groupBy({
        by: ["status"],
        where: { userId },
        _count: { status: true },
      }),

      // 3. Get PostItem Counts by Status
      prisma.postItem.groupBy({
        by: ["status"],
        where: { userId },
        _count: { status: true },
      }),

      // 4. Fetch Instagram Graph API
      fetch(
        `https://graph.facebook.com/v19.0/${instaId}?fields=name,username,profile_picture_url,followers_count,follows_count,media_count&access_token=${instaToken}`
      )
        .then((res) => res.json())
        .catch((err) => {
          console.error("Instagram Fetch Error:", err);
          return null;
        }),
    ]);

    // --- Process Instagram Data ---
    // Check if Instagram returned valid data or an error
    const isInstaValid = instaResponse && !instaResponse.error && instaResponse.id;
    
    const userProfile = {
      name: isInstaValid ? instaResponse.name : dbUser?.name || "User",
      handle: isInstaValid ? `@${instaResponse.username}` : "Not Connected",
      avatar: isInstaValid
        ? instaResponse.profile_picture_url
        : "https://via.placeholder.com/150", // Fallback image
      stats: {
        posts: isInstaValid ? instaResponse.media_count : 0,
        followers: isInstaValid ? instaResponse.followers_count : 0,
        following: isInstaValid ? instaResponse.follows_count : 0,
      },
    };

    // --- Process Database Stats ---
    
    // Helper function to extract count from Prisma groupBy result
    const getCount = (
      arr: { status: PostStatus; _count: { status: number } }[],
      status: PostStatus
    ) => {
      const found = arr.find((i) => i.status === status);
      return found ? found._count.status : 0;
    };

    // Calculate Group Stats
    const groups = {
      published: getCount(groupStats, "PUBLISHED"),
      draft: getCount(groupStats, "DRAFT"),
      scheduled: getCount(groupStats, "SCHEDULED"),
    };
    const totalGroups = groups.published + groups.draft + groups.scheduled;

    // Calculate Item Stats
    const items = {
      published: getCount(itemStats, "PUBLISHED"),
      draft: getCount(itemStats, "DRAFT"),
      scheduled: getCount(itemStats, "SCHEDULED"),
    };
    const totalItems = items.published + items.draft + items.scheduled;

    // Return combined data structure
    return NextResponse.json(
      {
        profile: userProfile,
        content: {
          postGroups: {
            total: totalGroups,
            ...groups,
          },
          postItems: {
            total: totalItems,
            ...items,
          },
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}