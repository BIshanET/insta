import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const { imageUrl, caption, order } = await request.json();

    if (!params.postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const parentPost = await prisma.post.findUnique({
      where: { id: params.postId },
    });

    if (!parentPost) {
      return NextResponse.json({ error: "Parent post not found" }, { status: 404 });
    }

    if (parentPost.type !== "GROUPED") {
      return NextResponse.json(
        { error: "Post items can only be added to GROUPED posts" },
        { status: 400 }
      );
    }

    const newItem = await prisma.postItem.create({
      data: {
        parentPostId: params.postId,
        imageUrl,
        caption,
        order,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  try {
    const postItems = await prisma.postItem.findMany({
      where: { parentPostId: params.postId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(postItems);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
