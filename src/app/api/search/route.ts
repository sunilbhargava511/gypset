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
  const query = searchParams.get('q') || '';
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const tripId = searchParams.get('tripId') || '';

  // Build where clause
  const where: {
    userId: string;
    tripId?: string;
    OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; polishedDescription?: { contains: string; mode: 'insensitive' }; rawTranscription?: { contains: string; mode: 'insensitive' }; address?: { contains: string; mode: 'insensitive' } }>;
    tags?: { some: { tag: { name: { in: string[] } } } };
  } = {
    userId: session.user.id,
  };

  if (tripId) {
    where.tripId = tripId;
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { polishedDescription: { contains: query, mode: 'insensitive' } },
      { rawTranscription: { contains: query, mode: 'insensitive' } },
      { address: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          name: { in: tags },
        },
      },
    };
  }

  const locations = await prisma.location.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      sourceUrl: true,
      urlTitle: true,
      urlDescription: true,
      urlImage: true,
      phone: true,
      hours: true,
      priceRange: true,
      rating: true,
      cuisine: true,
      reservationUrl: true,
      rawTranscription: true,
      polishedDescription: true,
      orderIndex: true,
      trip: { select: { id: true, title: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Get all available tags for filtering
  const allTags = await prisma.tag.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { usageCount: 'desc' }],
  });

  // Get trips for filtering
  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    select: { id: true, title: true },
    orderBy: { title: 'asc' },
  });

  return NextResponse.json({
    locations,
    tags: allTags,
    trips,
  });
}
