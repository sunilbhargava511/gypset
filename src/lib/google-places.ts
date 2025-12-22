import { getSetting } from './settings';
import prisma from './prisma';

// Google Places API (New) types
interface PlaceSearchResult {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    types?: string[];
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    regularOpeningHours?: {
      weekdayDescriptions?: string[];
    };
    priceLevel?: string;
  }>;
}

interface PlaceDetails {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  priceLevel?: string;
}

export interface PlaceEnrichmentData {
  googlePlaceId: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleTypes: string[];
  googleWebsite: string | null;
  googleFormattedPhone: string | null;
  googleFormattedAddress: string | null;
  hours: string | null;
  priceRange: string | null;
}

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

/**
 * Search for a place by name near given coordinates
 */
export async function searchPlace(
  name: string,
  lat: number,
  lng: number,
  radiusMeters: number = 500
): Promise<PlaceDetails | null> {
  const apiKey = await getSetting('google_api_key');
  if (!apiKey) {
    console.warn('Google API key not configured');
    return null;
  }

  try {
    // Use Text Search with location bias
    const response = await fetch(`${PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.regularOpeningHours,places.priceLevel',
      },
      body: JSON.stringify({
        textQuery: name,
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API search error:', response.status, errorText);
      return null;
    }

    const data: PlaceSearchResult = await response.json();

    if (data.places && data.places.length > 0) {
      return data.places[0] as PlaceDetails;
    }

    return null;
  } catch (error) {
    console.error('Error searching place:', error);
    return null;
  }
}

/**
 * Get detailed information about a place by its ID
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const apiKey = await getSetting('google_api_key');
  if (!apiKey) {
    console.warn('Google API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${PLACES_API_BASE}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types,rating,userRatingCount,websiteUri,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,priceLevel',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API details error:', response.status, errorText);
      return null;
    }

    const data: PlaceDetails = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

/**
 * Convert price level to dollar signs
 */
function formatPriceLevel(priceLevel: string | undefined): string | null {
  if (!priceLevel) return null;

  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return 'Free';
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '$';
    case 'PRICE_LEVEL_MODERATE':
      return '$$';
    case 'PRICE_LEVEL_EXPENSIVE':
      return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '$$$$';
    default:
      return null;
  }
}

/**
 * Extract enrichment data from a place details response
 */
export function extractEnrichmentData(place: PlaceDetails): PlaceEnrichmentData {
  const hours = place.regularOpeningHours?.weekdayDescriptions?.join('; ') || null;

  return {
    googlePlaceId: place.id,
    googleRating: place.rating || null,
    googleReviewCount: place.userRatingCount || null,
    googleTypes: place.types || [],
    googleWebsite: place.websiteUri || null,
    googleFormattedPhone: place.internationalPhoneNumber || place.nationalPhoneNumber || null,
    googleFormattedAddress: place.formattedAddress || null,
    hours,
    priceRange: formatPriceLevel(place.priceLevel),
  };
}

/**
 * Enrich a location with Google Places data
 * Returns true if enrichment was successful
 */
export async function enrichLocationWithPlaces(locationId: string): Promise<boolean> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
  });

  if (!location) {
    console.error('Location not found:', locationId);
    return false;
  }

  // Skip if already enriched recently (within 30 days)
  if (location.placesEnrichedAt) {
    const daysSinceEnriched = (Date.now() - location.placesEnrichedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceEnriched < 30) {
      console.log('Location already enriched recently, skipping');
      return true;
    }
  }

  // Search for the place
  const place = await searchPlace(location.name, location.latitude, location.longitude);

  if (!place) {
    console.log('No matching place found for:', location.name);
    return false;
  }

  // Extract enrichment data
  const enrichment = extractEnrichmentData(place);

  // Update location with enriched data
  // Google data takes priority for structured fields, but only if we got data
  await prisma.location.update({
    where: { id: locationId },
    data: {
      googlePlaceId: enrichment.googlePlaceId,
      googleRating: enrichment.googleRating,
      googleReviewCount: enrichment.googleReviewCount,
      googleTypes: enrichment.googleTypes,
      googleWebsite: enrichment.googleWebsite,
      googleFormattedPhone: enrichment.googleFormattedPhone,
      googleFormattedAddress: enrichment.googleFormattedAddress,
      // Update these fields only if we got better data from Google
      phone: enrichment.googleFormattedPhone || location.phone,
      hours: enrichment.hours || location.hours,
      priceRange: enrichment.priceRange || location.priceRange,
      address: enrichment.googleFormattedAddress || location.address,
      placesEnrichedAt: new Date(),
    },
  });

  console.log('Location enriched with Places data:', location.name);
  return true;
}

/**
 * Enrich location data directly (without database update)
 * Used during location creation flow
 */
export async function getPlaceEnrichment(
  name: string,
  lat: number,
  lng: number
): Promise<PlaceEnrichmentData | null> {
  const place = await searchPlace(name, lat, lng);

  if (!place) {
    return null;
  }

  return extractEnrichmentData(place);
}
