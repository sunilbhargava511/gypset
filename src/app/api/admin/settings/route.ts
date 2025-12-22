import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await prisma.systemSetting.findMany();

  const settingsMap = settings.reduce((acc, s) => {
    // Mask API keys for security
    if (s.key.includes('api_key') && s.value) {
      acc[s.key] = {
        value: s.value.substring(0, 8) + '...' + s.value.substring(s.value.length - 4),
        hasValue: true,
        description: s.description,
      };
    } else {
      acc[s.key] = {
        value: s.value,
        hasValue: !!s.value,
        description: s.description,
      };
    }
    return acc;
  }, {} as Record<string, { value: string; hasValue: boolean; description: string | null }>);

  return NextResponse.json(settingsMap);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key, value } = await req.json();

  if (!key) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: value || '' },
    create: { key, value: value || '' },
  });

  return NextResponse.json({ success: true, setting });
}
