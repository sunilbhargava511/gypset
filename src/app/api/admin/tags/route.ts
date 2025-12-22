import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const where: {
    category?: string;
    name?: { contains: string; mode: 'insensitive' };
    isActive?: boolean;
  } = {};

  if (category) {
    where.category = category;
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (!includeInactive) {
    where.isActive = true;
  }

  const tags = await prisma.tag.findMany({
    where,
    orderBy: [{ category: 'asc' }, { usageCount: 'desc' }],
  });

  // Group by category
  const categories = ['place_type', 'ambience', 'timing', 'feature', 'cuisine', 'activity'];
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = tags.filter(t => t.category === cat);
    return acc;
  }, {} as Record<string, typeof tags>);

  return NextResponse.json({ tags, grouped, categories });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, category } = await req.json();

  if (!name || !category) {
    return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
  }

  const normalizedName = name.toLowerCase().trim().replace(/\s+/g, '-');

  const existing = await prisma.tag.findUnique({ where: { name: normalizedName } });
  if (existing) {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 400 });
  }

  const tag = await prisma.tag.create({
    data: {
      name: normalizedName,
      category,
      createdByLlm: false,
    },
  });

  return NextResponse.json(tag);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, category, isActive } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
  }

  const normalizedName = name ? name.toLowerCase().trim().replace(/\s+/g, '-') : undefined;

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(normalizedName && { name: normalizedName }),
      ...(category && { category }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(tag);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
  }

  // Check if tag is in use
  const usageCount = await prisma.locationTag.count({
    where: { tagId: id },
  });

  if (usageCount > 0) {
    // Soft delete by marking inactive
    await prisma.tag.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true, softDeleted: true });
  }

  // Hard delete if not in use
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
