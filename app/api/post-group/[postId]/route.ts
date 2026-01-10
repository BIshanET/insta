import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "PostGroup ID is required" },
        { status: 400 }
      );
    }

    // Check if PostGroup exists
    const group = await prisma.postGroup.findUnique({
      where: { id: postId },
    });

    if (!group) {
      return NextResponse.json(
        { error: "PostGroup not found" },
        { status: 404 }
      );
    }

    // 1️⃣ Delete all PostItems belonging to this group
    await prisma.postItem.deleteMany({
      where: { parentPostId: postId },
    });

    // 2️⃣ Delete the PostGroup itself
    await prisma.postGroup.delete({
      where: { id: postId },
    });

    return NextResponse.json(
      { message: "PostGroup and related PostItems deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
