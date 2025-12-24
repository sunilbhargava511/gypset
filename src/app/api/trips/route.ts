import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { v4 as uuid } from 'uuid';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { locations: true } },
      locations: {
        take: 4,
        orderBy: { orderIndex: 'asc' },
        select: { id: true, name: true, urlImage: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, homeBaseAddress, homeBaseUrl, homeBaseLatitude, homeBaseLongitude } = await req.json();

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const trip = await prisma.trip.create({
    data: {
      userId: session.user.id,
      title,
      description,
      homeBaseAddress,
      homeBaseUrl,
      homeBaseLatitude,
      homeBaseLongitude,
      shareToken: uuid().replace(/-/g, '').substring(0, 16),
    },
  });

  return NextResponse.json(trip);
}
