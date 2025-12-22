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
  const period = searchParams.get('period') || 'month';
  const service = searchParams.get('service') || 'all';
  const userId = searchParams.get('userId') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Calculate date range
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Build where clause
  const where: {
    createdAt: { gte: Date };
    service?: string;
    userId?: string;
  } = {
    createdAt: { gte: startDate },
  };

  if (service !== 'all') {
    where.service = service;
  }

  if (userId !== 'all') {
    where.userId = userId;
  }

  // Get summary by service
  const summary = await prisma.apiUsageLog.groupBy({
    by: ['service'],
    where,
    _sum: { costUsd: true },
    _count: true,
  });

  // Get summary by user
  const userSummary = await prisma.apiUsageLog.groupBy({
    by: ['userId'],
    where,
    _sum: { costUsd: true },
    _count: true,
  });

  // Fetch user details for the summary
  const userIds = userSummary.map(u => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const userCosts = userSummary.map(u => ({
    userId: u.userId,
    user: userMap.get(u.userId),
    totalCost: u._sum.costUsd || 0,
    count: u._count,
  }));

  // Get paginated logs
  const [logs, totalCount] = await Promise.all([
    prisma.apiUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { email: true, name: true } },
      },
    }),
    prisma.apiUsageLog.count({ where }),
  ]);

  // Calculate total cost
  const totalCost = summary.reduce((acc, s) => acc + (s._sum.costUsd || 0), 0);

  return NextResponse.json({
    summary: {
      total: totalCost,
      byService: summary.map(s => ({
        service: s.service,
        cost: s._sum.costUsd || 0,
        count: s._count,
      })),
      byUser: userCosts.sort((a, b) => b.totalCost - a.totalCost),
    },
    logs,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}
