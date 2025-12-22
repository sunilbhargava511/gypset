import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { transcribeAudio, generateTravelWriting, extractTags } from '@/lib/llm';
import { getSetting } from '@/lib/settings';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if audio recording is enabled
  const audioEnabled = await getSetting('audio_recording_enabled');
  if (audioEnabled === 'false') {
    return NextResponse.json(
      { error: 'Audio recording is disabled' },
      { status: 403 }
    );
  }

  const location = await prisma.location.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!location) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Check duration limit
    const maxDuration = parseInt((await getSetting('max_audio_duration_seconds')) || '0');
    const audioDuration = parseFloat(formData.get('duration') as string) || 0;

    if (maxDuration > 0 && audioDuration > maxDuration) {
      return NextResponse.json(
        { error: `Audio duration exceeds maximum of ${maxDuration} seconds` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Transcribe audio
    const transcription = await transcribeAudio(audioBuffer, session.user.id, id);

    // Update location with raw transcription
    await prisma.location.update({
      where: { id },
      data: { rawTranscription: transcription.text },
    });

    // Generate polished description
    const travelWriting = await generateTravelWriting(
      location.name,
      location.address || '',
      transcription.text,
      location.urlDescription || '',
      session.user.id,
      id
    );

    // Update with polished description
    await prisma.location.update({
      where: { id },
      data: { polishedDescription: travelWriting.description },
    });

    // Extract and update tags
    const existingTags = await prisma.tag.findMany({
      where: { isActive: true },
      select: { name: true, category: true },
    });

    const tagResult = await extractTags(
      location.name,
      travelWriting.description,
      transcription.text,
      existingTags,
      session.user.id,
      id
    );

    // Clear existing tags for this location
    await prisma.locationTag.deleteMany({
      where: { locationId: id },
    });

    // Add new tags
    for (const tagData of tagResult.tags) {
      let tag = await prisma.tag.findUnique({
        where: { name: tagData.name },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagData.name,
            category: tagData.category,
            createdByLlm: true,
          },
        });
      }

      await prisma.locationTag.create({
        data: {
          locationId: id,
          tagId: tag.id,
        },
      });
    }

    // Update tag usage counts
    await prisma.$executeRaw`
      UPDATE tags SET usage_count = (
        SELECT COUNT(*) FROM location_tags WHERE tag_id = tags.id
      )
    `;

    // Fetch updated location
    const updatedLocation = await prisma.location.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      description: travelWriting.description,
      tags: tagResult.tags,
      location: updatedLocation,
    });
  } catch (error) {
    console.error('Audio processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process audio' },
      { status: 500 }
    );
  }
}
