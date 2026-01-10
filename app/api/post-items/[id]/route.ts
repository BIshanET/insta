import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { imageUrl, caption, order, templateId } = await request.json();

    const updatedItem = await prisma.postItem.update({
      where: { id: params.id },
      data: { imageUrl, caption, order },
    });

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    await prisma.postItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Post item deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }


    const postGroupId = (await params).id;

    if (!postGroupId) {
      return NextResponse.json(
        { error: "postGroupId is required" },
        { status: 400 }
      );
    }

    const items = await prisma.postItem.findMany({
      where: {
        parentPostId: postGroupId,
        userId: userId, 
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("itttt",items)

    return NextResponse.json(items, { status: 200 });

  } catch (error: any) {
    console.error("GET post-items error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}