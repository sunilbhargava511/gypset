import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const locationId = process.argv[2];

if (!locationId) {
  console.error('Usage: npx tsx scripts/reprocess-location.ts <locationId>');
  process.exit(1);
}

async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value || null;
}

async function main() {
  console.log('Reprocessing location:', locationId);

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    include: { user: true },
  });

  if (!location) {
    console.error('Location not found');
    process.exit(1);
  }

  console.log('Found location:', location.name);
  console.log('Source URL:', location.sourceUrl);
  console.log('User:', location.user.email);

  const apiKey = await getSetting('google_api_key');
  const model = (await getSetting('gemini_model')) || 'gemini-2.5-flash';

  if (!apiKey) {
    console.error('Google API key not configured');
    process.exit(1);
  }

  console.log('Using model:', model);

  // Get additional context from command line
  const additionalContext = process.argv[3] || '';

  // Geocode using the URL and name
  const geocodePrompt = `Extract the geographic location from this content. Return only valid JSON, no other text.

URL: ${location.sourceUrl}
Location Name: ${location.name}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Return JSON in this exact format:
{
  "location_name": "Name of the place",
  "address": "Full address if available, or null",
  "coordinates": { "lat": 00.0000, "lng": 00.0000 },
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of how location was determined"
}

If coordinates cannot be determined with reasonable confidence, set coordinates to null.
For well-known places like restaurants, use your knowledge to provide coordinates.`;

  console.log('\nCalling Gemini for geocoding...');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geocodePrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    process.exit(1);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('\nGemini response:', text);

  // Parse the JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON found in response');
    process.exit(1);
  }

  const geocodeResult = JSON.parse(jsonMatch[0]);
  console.log('\nParsed result:', geocodeResult);

  // Update the location
  if (geocodeResult.coordinates) {
    await prisma.location.update({
      where: { id: locationId },
      data: {
        latitude: geocodeResult.coordinates.lat,
        longitude: geocodeResult.coordinates.lng,
        address: geocodeResult.address,
        name: geocodeResult.location_name || location.name,
      },
    });
    console.log('\nLocation updated successfully!');
    console.log('New coordinates:', geocodeResult.coordinates.lat, geocodeResult.coordinates.lng);
    console.log('Address:', geocodeResult.address);
  } else {
    console.log('\nNo coordinates found in response');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
