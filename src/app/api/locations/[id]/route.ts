import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const location = await prisma.location.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      tags: { include: { tag: true } },
      trip: { select: { id: true, title: true } },
    },
  });

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  return NextResponse.json(location);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const location = await prisma.location.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  const {
    name,
    latitude,
    longitude,
    address,
    sourceUrl,
    rawTranscription,
    polishedDescription,
    orderIndex,
    tagIds,
  } = await req.json();

  const updated = await prisma.location.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(address !== undefined && { address }),
      ...(sourceUrl !== undefined && { sourceUrl }),
      ...(rawTranscription !== undefined && { rawTranscription }),
      ...(polishedDescription !== undefined && { polishedDescription }),
      ...(orderIndex !== undefined && { orderIndex }),
    },
  });

  // Update tags if provided
  if (tagIds !== undefined) {
    // Remove existing tags
    await prisma.locationTag.deleteMany({
      where: { locationId: id },
    });

    // Add new tags
    for (const tagId of tagIds) {
      await prisma.locationTag.create({
        data: { locationId: id, tagId },
      });
    }

    // Update tag usage counts
    await prisma.$executeRaw`
      UPDATE tags SET usage_count = (
        SELECT COUNT(*) FROM location_tags WHERE tag_id = tags.id
      )
    `;
  }

  const completeLocation = await prisma.location.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(completeLocation);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const location = await prisma.location.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  await prisma.location.delete({ where: { id } });

  // Update tag usage counts
  await prisma.$executeRaw`
    UPDATE tags SET usage_count = (
      SELECT COUNT(*) FROM location_tags WHERE tag_id = tags.id
    )
  `;

  return NextResponse.json({ success: true });
}
