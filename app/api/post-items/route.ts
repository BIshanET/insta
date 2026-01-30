import { NextResponse } from "next/server";
import { PostType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, imageUrl, caption , type,userTags } = body as {postId : string,imageUrl : string , caption : string ,type : PostType,userTags:string[] };

    if (!postId && type == "GROUPED" ) {
      return NextResponse.json(
        { error: "postId are required for group post." },
        { status: 400 }
      );
    }

    if(type == "GROUPED"){
      const parentPost = await prisma.postGroup.findUnique({
        where: { id: postId },
      });
  
      if (!parentPost) {
        return NextResponse.json(
          { error: "Parent post not found." },
          { status: 404 }
        );
      }
    }

    const userId = req.headers.get("x-user-id") as any;

    const newPostItem = await prisma.postItem.create({
      data: {
        parentPostId:postId,
        imageUrl,
        caption,
        type,
        userId,
        userTags
      },
    });

    return NextResponse.json(newPostItem, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const items = await prisma.postItem.findMany({
      where: {
        userId,
        status : status as any,
        caption : {
          contains : search || "",
          mode : "insensitive"
        }
      },
      take: limit + 1, 
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, 
      orderBy: {
        createdAt: "desc",
      },
    });

    let nextCursor = null;
    if (items.length > limit) {
      const nextItem = items.pop(); 
      nextCursor = nextItem?.id || null;
    }

    return NextResponse.json(
      {
        items,
        nextCursor,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
