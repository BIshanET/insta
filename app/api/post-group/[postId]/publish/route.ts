// /app/api/post-group/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { PostStatus, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


export async function PATCH(req: Request, { params }: { params: Promise<{postId: string}> }) {
  try {
    const { postId } = await  params;

    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing user id" }, { status: 401 });
    }

    // Find the post group to ensure it exists and belongs to the user
    const postGroup = await prisma.postGroup.findFirst({
      where: {
        id : postId,
        userId,
      },
    });

    if (!postGroup) {
      return NextResponse.json({ error: "Post group not found" }, { status: 404 });
    }

    const updated = await prisma.postGroup.update({
      where: { id : postId },
      data: { status:PostStatus.PUBLISHED },
    });

    return NextResponse.json({ success: true, postGroup: updated }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
