import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sourceTagId, targetTagId } = await req.json();

  if (!sourceTagId || !targetTagId) {
    return NextResponse.json(
      { error: 'Source and target tag IDs are required' },
      { status: 400 }
    );
  }

  if (sourceTagId === targetTagId) {
    return NextResponse.json(
      { error: 'Cannot merge a tag with itself' },
      { status: 400 }
    );
  }

  // Get both tags
  const [sourceTag, targetTag] = await Promise.all([
    prisma.tag.findUnique({ where: { id: sourceTagId } }),
    prisma.tag.findUnique({ where: { id: targetTagId } }),
  ]);

  if (!sourceTag || !targetTag) {
    return NextResponse.json({ error: 'One or both tags not found' }, { status: 404 });
  }

  // Find all locations using the source tag
  const locationTags = await prisma.locationTag.findMany({
    where: { tagId: sourceTagId },
  });

  // Move each location tag to target, skipping if already exists
  for (const lt of locationTags) {
    const existing = await prisma.locationTag.findUnique({
      where: {
        locationId_tagId: {
          locationId: lt.locationId,
          tagId: targetTagId,
        },
      },
    });

    if (!existing) {
      await prisma.locationTag.create({
        data: {
          locationId: lt.locationId,
          tagId: targetTagId,
        },
      });
    }
  }

  // Delete all source tag associations
  await prisma.locationTag.deleteMany({
    where: { tagId: sourceTagId },
  });

  // Update target tag usage count
  const newUsageCount = await prisma.locationTag.count({
    where: { tagId: targetTagId },
  });

  await prisma.tag.update({
    where: { id: targetTagId },
    data: { usageCount: newUsageCount },
  });

  // Delete the source tag
  await prisma.tag.delete({
    where: { id: sourceTagId },
  });

  return NextResponse.json({
    success: true,
    mergedCount: locationTags.length,
    targetTag: await prisma.tag.findUnique({ where: { id: targetTagId } }),
  });
}
