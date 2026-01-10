import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await params;
    const user = await prisma.user.findUnique({
      where: { id: id as any },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ UPDATE user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string } >}
) {
  try {
    const id = await params;
    const body = await request.json();
    const { name, email } = body;

    const updatedUser = await prisma.user.update({
      where: { id: id as any },
      data: { name, email },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = await params;
    await prisma.user.delete({
      where: { id: id as any },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
