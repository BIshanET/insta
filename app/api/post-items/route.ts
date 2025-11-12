import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postId, imageUrl, caption } = body;

    // Validate required fields
    if (!postId || !imageUrl) {
      return NextResponse.json(
        { error: "postId and imageUrl are required." },
        { status: 400 }
      );
    }

    // Check if post exists
    const parentPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!parentPost) {
      return NextResponse.json(
        { error: "Parent post not found." },
        { status: 404 }
      );
    }

    // Create post item
    const newPostItem = await prisma.postItem.create({
      data: {
        parentPostId:postId,
        imageUrl,
        caption,
      },
    });

    return NextResponse.json(newPostItem, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
