import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { extractLocationsFromText, geocodeParsedLocations, suggestCategory } from '@/lib/llm';

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

    console.log('Parsing text, length:', text.length);

    // Extract locations and suggest category in parallel
    const [parsedLocations, categorySuggestion] = await Promise.all([
      extractLocationsFromText(text, session.user.id),
      suggestCategory(text, session.user.id),
    ]);

    console.log('Parsed locations count:', parsedLocations.length);
    console.log('Suggested category:', categorySuggestion);

    if (parsedLocations.length === 0) {
      return NextResponse.json({
        locations: [],
        suggestedCategory: categorySuggestion,
        message: 'No locations found in the text'
      });
    }

    // Optionally geocode the locations
    if (geocode) {
      console.log('Geocoding locations...');
      const geocodedLocations = await geocodeParsedLocations(parsedLocations, session.user.id);
      console.log('Geocoded locations:', geocodedLocations.length);
      return NextResponse.json({
        locations: geocodedLocations,
        suggestedCategory: categorySuggestion,
      });
    }

    return NextResponse.json({
      locations: parsedLocations,
      suggestedCategory: categorySuggestion,
    });
  } catch (error) {
    console.error('Parse text error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse text';
    console.error('Error message:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
