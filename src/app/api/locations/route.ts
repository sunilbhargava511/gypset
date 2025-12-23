import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { geocodeFromContent, extractTags } from '@/lib/llm';
import { fetchUrlContent, formatUrlContentForLlm, UrlContent } from '@/lib/url-fetcher';
import { getPlaceEnrichment } from '@/lib/google-places';
import { trackApiUsage } from '@/lib/cost-tracker';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const { tripId, sourceUrl, name: providedName } = await req.json();

  if (!tripId) {
    return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
  }

  if (!sourceUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Verify trip belongs to user
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
  });

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // Fetch URL content for better geocoding and descriptions
  let urlContent: UrlContent = { title: '', description: '', content: '' };
  let urlContentFormatted = '';

  try {
    console.log('Fetching URL content:', sourceUrl);
    urlContent = await fetchUrlContent(sourceUrl);
    urlContentFormatted = formatUrlContentForLlm(urlContent);
    console.log('URL content fetched successfully');
  } catch (error) {
    console.error('Error fetching URL content:', error);
  }

  // Extract name from URL content if not provided
  let name = providedName;
  if (!name || name.trim() === '') {
    // Try to get name from URL content title, then fall back to URL
    if (urlContent.title && urlContent.title.trim()) {
      // Clean up the title - remove common suffixes like " - TripAdvisor", " | Yelp", etc.
      name = urlContent.title
        .replace(/\s*[-|–—]\s*(TripAdvisor|Yelp|Google Maps|OpenTable|Resy|Zomato|TheFork|Google|Facebook|Instagram).*$/i, '')
        .replace(/\s*[-|–—]\s*Reviews.*$/i, '')
        .replace(/\s*[-|–—]\s*Restaurant.*$/i, '')
        .trim();
    }

    // If still no name, use a cleaned version of the URL
    if (!name || name.trim() === '') {
      try {
        const urlObj = new URL(sourceUrl);
        // Get the pathname and clean it up
        name = urlObj.pathname
          .split('/')
          .filter(Boolean)
          .pop() || urlObj.hostname;
        // Replace dashes/underscores with spaces and capitalize
        name = name
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());
      } catch {
        name = 'Saved Location';
      }
    }
  }

  // Get max order index
  const maxOrder = await prisma.location.aggregate({
    where: { tripId },
    _max: { orderIndex: true },
  });

  // Create initial location with URL-extracted data
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
      orderIndex: (maxOrder._max.orderIndex || 0) + 1,
    },
  });

  // Geocode the location
  let latitude = 0;
  let longitude = 0;
  let address = '';

  try {
    const geocodeResult = await geocodeFromContent(
      sourceUrl,
      name,
      urlContentFormatted,
      '',
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
      urlContent.description || '',
      '',
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
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json(updatedLocation);
}
