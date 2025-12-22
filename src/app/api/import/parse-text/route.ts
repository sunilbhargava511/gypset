import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractLocationsFromText } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const locations = await extractLocationsFromText(text, session.user.id);

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Parse text error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse text' },
      { status: 500 }
    );
  }
}
