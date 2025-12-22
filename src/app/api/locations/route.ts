import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { geocodeFromContent, extractTags } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    tripId,
    sourceUrl,
    name,
    latitude,
    longitude,
    address,
    urlTitle,
    urlDescription,
    urlImage,
    notes,
  } = await req.json();

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  // Verify trip belongs to user
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: session.user.id },
  });

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // Get max order index
  const maxOrder = await prisma.location.aggregate({
    where: { tripId },
    _max: { orderIndex: true },
  });

  let finalName = name;
  let finalLat = latitude;
  let finalLng = longitude;
  let finalAddress = address;

  // If we have a URL but no coordinates, try to geocode
  if (sourceUrl && (!latitude || !longitude)) {
    try {
      const geoResult = await geocodeFromContent(
        sourceUrl,
        urlTitle || '',
        urlDescription || '',
        notes || '',
        session.user.id
      );

      if (!finalName) {
        finalName = geoResult.location_name;
      }

      if (geoResult.coordinates) {
        finalLat = geoResult.coordinates.lat;
        finalLng = geoResult.coordinates.lng;
      }

      if (!finalAddress && geoResult.address) {
        finalAddress = geoResult.address;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  }

  if (!finalName) {
    return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
  }

  if (!finalLat || !finalLng) {
    return NextResponse.json(
      { error: 'Could not determine location coordinates. Please provide them manually.' },
      { status: 400 }
    );
  }

  const location = await prisma.location.create({
    data: {
      tripId,
      userId: session.user.id,
      sourceUrl,
      name: finalName,
      latitude: finalLat,
      longitude: finalLng,
      address: finalAddress,
      urlTitle,
      urlDescription,
      urlImage,
      rawTranscription: notes,
      orderIndex: (maxOrder._max.orderIndex || 0) + 1,
    },
  });

  // Extract and assign tags if we have any content
  if (notes || urlDescription) {
    try {
      const existingTags = await prisma.tag.findMany({
        where: { isActive: true },
        select: { name: true, category: true },
      });

      const tagResult = await extractTags(
        finalName,
        urlDescription || '',
        notes || '',
        existingTags,
        session.user.id,
        location.id
      );

      for (const tagData of tagResult.tags) {
        let tag = await prisma.tag.findUnique({
          where: { name: tagData.name },
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagData.name,
              category: tagData.category,
              createdByLlm: true,
            },
          });
        }

        await prisma.locationTag.create({
          data: {
            locationId: location.id,
            tagId: tag.id,
          },
        });

        // Update usage count
        await prisma.tag.update({
          where: { id: tag.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    } catch (error) {
      console.error('Tag extraction error:', error);
    }
  }

  // Fetch the complete location with tags
  const completeLocation = await prisma.location.findUnique({
    where: { id: location.id },
    include: {
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json(completeLocation);
}
