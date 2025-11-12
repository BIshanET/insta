// src/app/api/post-items/[id]/route.ts
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
      data: { imageUrl, caption, order, templateId },
    });

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.postItem.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Post item deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
