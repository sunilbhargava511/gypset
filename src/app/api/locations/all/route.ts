import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const tripId = searchParams.get('tripId');

  const where: { userId: string; tripId?: string } = {
    userId: session.user.id,
  };

  if (tripId) {
    where.tripId = tripId;
  }

  const locations = await prisma.location.findMany({
    where,
    include: {
      trip: { select: { id: true, title: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(locations);
}
