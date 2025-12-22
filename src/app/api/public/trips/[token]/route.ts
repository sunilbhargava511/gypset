import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const trip = await prisma.trip.findFirst({
    where: {
      shareToken: token,
    },
    include: {
      user: {
        select: { name: true },
      },
      locations: {
        orderBy: { orderIndex: 'asc' },
        include: {
          tags: {
            include: { tag: true },
          },
        },
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // Return sanitized data (no user IDs, etc.)
  return NextResponse.json({
    id: trip.id,
    title: trip.title,
    description: trip.description,
    createdBy: trip.user.name,
    locations: trip.locations.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      latitude: l.latitude,
      longitude: l.longitude,
      sourceUrl: l.sourceUrl,
      urlTitle: l.urlTitle,
      urlDescription: l.urlDescription,
      urlImage: l.urlImage,
      phone: l.phone,
      hours: l.hours,
      priceRange: l.priceRange,
      rating: l.rating,
      cuisine: l.cuisine,
      reservationUrl: l.reservationUrl,
      rawTranscription: l.rawTranscription,
      polishedDescription: l.polishedDescription,
      orderIndex: l.orderIndex,
      tags: l.tags.map((lt) => ({
        tag: {
          id: lt.tag.id,
          name: lt.tag.name,
          category: lt.tag.category,
        },
      })),
    })),
  });
}
