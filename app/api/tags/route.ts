import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q'); 

    let tags;

    if (query) {
      tags = await prisma.userTag.findMany({
        where: {
          username: {
            contains: query,
            mode: 'insensitive', 
          },
        },
      });
    } else {
      tags = await prisma.userTag.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}