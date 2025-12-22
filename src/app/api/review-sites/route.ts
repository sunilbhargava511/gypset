import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');

    // Get sites for the specified country and global sites
    const sites = await prisma.reviewSite.findMany({
      where: {
        OR: [
          { country: 'Global' },
          ...(country ? [{ country }] : []),
        ],
      },
      orderBy: [
        { country: 'asc' }, // Global first
        { platform: 'asc' },
      ],
    });

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching review sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review sites' },
      { status: 500 }
    );
  }
}
