import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSetting } from '@/lib/settings';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use Google API key for maps
  const apiKey = await getSetting('google_api_key');

  return NextResponse.json({ apiKey: apiKey || '' });
}
