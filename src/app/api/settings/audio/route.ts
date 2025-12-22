import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSetting } from '@/lib/settings';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const enabled = (await getSetting('audio_recording_enabled')) !== 'false';
  const maxDuration = parseInt((await getSetting('max_audio_duration_seconds')) || '0');

  return NextResponse.json({
    enabled,
    maxDuration,
  });
}
