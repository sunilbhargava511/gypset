import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { geocodeFromContent, extractLocationsFromText } from '@/lib/llm';

interface ImportLocation {
  name: string;
  address?: string | null;
  url?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tripId, sourceType, locations: directLocations, text, csvData } = await req.json();

    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Verify trip belongs to user
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: session.user.id },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Create import job
    const importJob = await prisma.importJob.create({
      data: {
        userId: session.user.id,
        tripId,
        sourceType,
        status: 'processing',
      },
    });

    let locationsToImport: ImportLocation[] = [];

    // Handle different import types
    if (sourceType === 'direct' && directLocations) {
      // Direct import (from Google Maps KML or similar)
      locationsToImport = directLocations;
    } else if (sourceType === 'google_docs' && text) {
      // Extract locations from text using LLM
      const extracted = await extractLocationsFromText(text, session.user.id);
      locationsToImport = extracted.map((l) => ({
        name: l.name,
        address: l.address,
        url: l.url,
        notes: l.description,
      }));
    } else if (sourceType === 'csv' && csvData) {
      // Parse CSV data
      locationsToImport = csvData;
    } else {
      await prisma.importJob.update({
        where: { id: importJob.id },
        data: { status: 'failed', errorMessage: 'Invalid import data' },
      });
      return NextResponse.json({ error: 'Invalid import data' }, { status: 400 });
    }

    // Update job with total count
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: { totalLocations: locationsToImport.length },
    });

    // Get max order index
    const maxOrder = await prisma.location.aggregate({
      where: { tripId },
      _max: { orderIndex: true },
    });
    let orderIndex = (maxOrder._max.orderIndex || 0) + 1;

    // Process each location
    let importedCount = 0;
    const errors: string[] = [];

    for (const loc of locationsToImport) {
      try {
        let latitude = loc.latitude;
        let longitude = loc.longitude;

        // Geocode if needed
        if (!latitude || !longitude) {
          const geoResult = await geocodeFromContent(
            loc.url || '',
            loc.name,
            loc.notes || '',
            loc.address || '',
            session.user.id
          );

          if (geoResult.coordinates) {
            latitude = geoResult.coordinates.lat;
            longitude = geoResult.coordinates.lng;
          }
        }

        if (latitude && longitude) {
          await prisma.location.create({
            data: {
              tripId,
              userId: session.user.id,
              name: loc.name,
              latitude,
              longitude,
              address: loc.address,
              sourceUrl: loc.url,
              rawTranscription: loc.notes,
              orderIndex,
            },
          });
          importedCount++;
          orderIndex++;
        } else {
          errors.push(`Could not geocode: ${loc.name}`);
        }

        // Update progress
        await prisma.importJob.update({
          where: { id: importJob.id },
          data: { processedLocations: { increment: 1 } },
        });
      } catch (error) {
        errors.push(`Failed to import: ${loc.name}`);
      }
    }

    // Mark job as complete
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: 'completed',
        importedLocations: importedCount,
        completedAt: new Date(),
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    return NextResponse.json({
      success: true,
      importJobId: importJob.id,
      totalLocations: locationsToImport.length,
      importedLocations: importedCount,
      errors,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
