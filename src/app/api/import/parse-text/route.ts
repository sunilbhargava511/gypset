import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractLocationsFromText, geocodeParsedLocations } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { text, geocode = true } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Extract locations from text using AI
    const parsedLocations = await extractLocationsFromText(text, session.user.id);

    if (parsedLocations.length === 0) {
      return NextResponse.json({
        locations: [],
        message: 'No locations found in the text'
      });
    }

    // Optionally geocode the locations
    if (geocode) {
      const geocodedLocations = await geocodeParsedLocations(parsedLocations, session.user.id);
      return NextResponse.json({ locations: geocodedLocations });
    }

    return NextResponse.json({ locations: parsedLocations });
  } catch (error) {
    console.error('Parse text error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse text' },
      { status: 500 }
    );
  }
}
