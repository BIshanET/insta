import { NextResponse } from "next/server";
import { PrismaClient, PostStatus } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(req: Request, { params }: {params : Promise<{id: string}>}) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const postItem = await prisma.postItem.findUnique({
      where: { id },
    });

    if (!postItem) {
      return NextResponse.json(
        { error: "Post item not found" },
        { status: 404 }
      );
    }

    if (postItem.userId !== userId) {
      return NextResponse.json(
        { error: "Not allowed to modify this post item" },
        { status: 403 }
      );
    }

    const updated = await prisma.postItem.update({
      where: { id },
      data: {
        status: PostStatus.PUBLISHED,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
