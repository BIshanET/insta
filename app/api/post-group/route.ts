import { NextResponse } from "next/server";
import { PostStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") || null;
    const status = url.searchParams.get("status") || null;
    const search = url.searchParams.get("search") || null;
    const limit = parseInt(url.searchParams.get("limit") || "6", 10);

    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Missing user id" },
        { status: 401 }
      );
    }


    const groups = await prisma.postGroup.findMany({
      where: {
        userId,
        status: status ? (status as PostStatus) : undefined,
        OR: search
          ? [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        postItems: true, // keep your current response structure
      },
    });


    let nextCursor: string | null = null;
    if (groups.length > limit) {
      const nextItem = groups.pop();
      nextCursor = nextItem?.id || null;
    }

    return NextResponse.json(
      {
        posts: groups,
        nextCursor,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, status , imageUrl } =
      await request.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const newPost = await prisma.postGroup.create({
      data: {
        userId,
        title,
        description,
        status: status || "DRAFT",
        imageUrl
      },
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


