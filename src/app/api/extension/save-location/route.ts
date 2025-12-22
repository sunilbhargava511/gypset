import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  transcribeAudio,
  geocodeFromContent,
  extractTags,
  generateTravelWriting,
} from '@/lib/llm';
import { fetchUrlContent, formatUrlContentForLlm, UrlContent } from '@/lib/url-fetcher';
import { getPlaceEnrichment } from '@/lib/google-places';
import { trackApiUsage } from '@/lib/cost-tracker';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'chrome-extension://*',
  'Access-Control-Allow-Credentials': 'true',
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = session.user.id;
    const formData = await request.formData();

    const tripId = formData.get('tripId') as string;
    const name = formData.get('name') as string;
    const sourceUrl = formData.get('sourceUrl') as string;
    const audioFile = formData.get('audio') as File | null;

    if (!tripId || !name) {
      return NextResponse.json(
        { error: 'Trip ID and name are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify trip belongs to user
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
    });

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Fetch URL content for better geocoding and descriptions
    let urlContent: UrlContent = { title: '', description: '', content: '' };
    let urlContentFormatted = '';

    if (sourceUrl) {
      try {
        console.log('Fetching URL content:', sourceUrl);
        urlContent = await fetchUrlContent(sourceUrl);
        urlContentFormatted = formatUrlContentForLlm(urlContent);
        console.log('URL content fetched successfully');
      } catch (error) {
        console.error('Error fetching URL content:', error);
      }
    }

    // Create initial location with all extracted data
    const location = await prisma.location.create({
      data: {
        tripId,
        userId,
        name,
        sourceUrl,
        urlTitle: urlContent.title || null,
        urlDescription: urlContent.description || null,
        urlImage: urlContent.images?.[0] || null,
        phone: urlContent.phone || null,
        hours: urlContent.hours || null,
        priceRange: urlContent.priceRange || null,
        rating: urlContent.rating || null,
        cuisine: urlContent.cuisine || null,
        reservationUrl: urlContent.reservationUrl || null,
        latitude: 0,
        longitude: 0,
      },
    });

    let rawTranscription = '';
    let polishedDescription = '';

    // Process audio if provided
    if (audioFile) {
      try {
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        const transcription = await transcribeAudio(audioBuffer, userId, location.id);
        rawTranscription = transcription.text;

        // Generate polished travel writing with URL content for richer descriptions
        const writing = await generateTravelWriting(
          name,
          urlContent.address || '',
          rawTranscription,
          urlContentFormatted, // Pass the full URL content including reviews
          userId,
          location.id
        );
        polishedDescription = writing.description;
      } catch (error) {
        console.error('Audio processing error:', error);
        // Continue without audio - don't fail the whole request
      }
    }

    // Geocode the location
    let latitude = 0;
    let longitude = 0;
    let address = '';

    try {
      const geocodeResult = await geocodeFromContent(
        sourceUrl || '',
        name,
        urlContentFormatted, // Now includes fetched page content!
        rawTranscription,
        userId,
        location.id
      );

      if (geocodeResult.coordinates) {
        latitude = geocodeResult.coordinates.lat;
        longitude = geocodeResult.coordinates.lng;
      }
      address = geocodeResult.address || '';
    } catch (error) {
      console.error('Geocoding error:', error);
    }

    // Enrich with Google Places data if we have valid coordinates
    let placesData: Awaited<ReturnType<typeof getPlaceEnrichment>> = null;
    if (latitude !== 0 && longitude !== 0) {
      try {
        console.log('Enriching with Google Places:', name);
        placesData = await getPlaceEnrichment(name, latitude, longitude);
        if (placesData) {
          // Track the API usage
          await trackApiUsage({
            userId,
            service: 'google_places',
            operation: 'text_search',
            locationId: location.id,
          });
          console.log('Places enrichment successful');
        }
      } catch (error) {
        console.error('Places enrichment error:', error);
      }
    }

    // Extract tags
    let tagIds: string[] = [];
    try {
      const existingTags = await prisma.tag.findMany({
        where: { isActive: true },
        select: { id: true, name: true, category: true },
      });

      const tagResult = await extractTags(
        name,
        polishedDescription,
        rawTranscription,
        existingTags,
        userId,
        location.id
      );

      // Process tags - create new ones if needed, get IDs for existing
      for (const tag of tagResult.tags) {
        const existingTag = existingTags.find(
          (t) => t.name.toLowerCase() === tag.name.toLowerCase()
        );

        if (existingTag) {
          tagIds.push(existingTag.id);
        } else {
          // Create new tag
          const newTag = await prisma.tag.create({
            data: {
              name: tag.name.toLowerCase(),
              category: tag.category,
              createdByLlm: true,
            },
          });
          tagIds.push(newTag.id);
        }
      }
    } catch (error) {
      console.error('Tag extraction error:', error);
    }

    // Update location with all the processed data
    const updatedLocation = await prisma.location.update({
      where: { id: location.id },
      data: {
        latitude,
        longitude,
        address: placesData?.googleFormattedAddress || address || null,
        rawTranscription: rawTranscription || null,
        polishedDescription: polishedDescription || null,
        // Google Places enrichment data
        googlePlaceId: placesData?.googlePlaceId || null,
        googleRating: placesData?.googleRating || null,
        googleReviewCount: placesData?.googleReviewCount || null,
        googleTypes: placesData?.googleTypes || [],
        googleWebsite: placesData?.googleWebsite || null,
        googleFormattedPhone: placesData?.googleFormattedPhone || null,
        googleFormattedAddress: placesData?.googleFormattedAddress || null,
        placesEnrichedAt: placesData ? new Date() : null,
        // Override with Places data if available
        phone: placesData?.googleFormattedPhone || urlContent.phone || null,
        hours: placesData?.hours || urlContent.hours || null,
        priceRange: placesData?.priceRange || urlContent.priceRange || null,
        tags: {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        },
      },
      include: {
        tags: {
          include: { tag: true },
        },
      },
    });

    return NextResponse.json(
      {
        id: updatedLocation.id,
        name: updatedLocation.name,
        address: updatedLocation.address,
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude,
        polishedDescription: updatedLocation.polishedDescription,
        tags: updatedLocation.tags.map((t) => t.tag.name),
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Save location error:', error);
    return NextResponse.json(
      { error: 'Failed to save location' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'chrome-extension://*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
