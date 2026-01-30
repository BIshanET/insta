import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tags = await prisma.userTag.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const existingTag = await prisma.userTag.findUnique({
      where: { username },
    });

    if (existingTag) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
    }

    const newTag = await prisma.userTag.create({
      data: { username },
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.userTag.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Tag deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}