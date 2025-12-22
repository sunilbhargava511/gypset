import { getSetting } from './settings';
import { trackApiUsage } from './cost-tracker';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeocodingResult {
  location_name: string;
  address: string | null;
  coordinates: { lat: number; lng: number } | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface TagExtractionResult {
  tags: Array<{
    name: string;
    category: string;
    existing: boolean;
  }>;
}

interface TravelWritingResult {
  description: string;
}

export async function callGemini(
  prompt: string,
  userId: string,
  operation: string,
  locationId?: string
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const apiKey = await getSetting('google_api_key');
  const model = (await getSetting('gemini_model')) || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('Google API key not configured. Please add it in the admin panel.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data: GeminiResponse = await response.json();

  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

  // Track usage
  await trackApiUsage({
    userId,
    service: 'google_gemini',
    operation,
    inputTokens,
    outputTokens,
    model,
    locationId,
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    text,
    inputTokens,
    outputTokens,
  };
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  userId: string,
  locationId?: string
): Promise<{ text: string; duration: number }> {
  const apiKey = await getSetting('google_api_key');

  if (!apiKey) {
    throw new Error('Google API key not configured. Please add it in the admin panel.');
  }

  // Convert audio buffer to base64
  const audioBase64 = audioBuffer.toString('base64');

  // Use Gemini's multimodal capability for audio transcription
  const model = 'gemini-2.0-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/webm',
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe this audio recording exactly as spoken. Return only the transcription text, nothing else.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Speech API error: ${error}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Estimate duration from buffer size (rough approximation for webm)
  const estimatedDuration = Math.round(audioBuffer.length / 16000); // rough estimate

  // Track usage
  await trackApiUsage({
    userId,
    service: 'google_gemini',
    operation: 'transcribe',
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    audioDurationSeconds: estimatedDuration,
    model,
    locationId,
  });

  return {
    text: text.trim(),
    duration: estimatedDuration,
  };
}

export async function geocodeFromContent(
  url: string,
  title: string,
  content: string,
  userNotes: string,
  userId: string,
  locationId?: string
): Promise<GeocodingResult> {
  const prompt = `Extract the geographic location from this content. Return only valid JSON, no other text.

URL: ${url}
Page Title: ${title}
Page Content (excerpt): ${content.substring(0, 2000)}
User Notes: ${userNotes}

Return JSON in this exact format:
{
  "location_name": "Name of the place",
  "address": "Full address if available, or null",
  "coordinates": { "lat": 00.0000, "lng": 00.0000 },
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of how location was determined"
}

If coordinates cannot be determined with reasonable confidence, set coordinates to null.
For well-known places, use your knowledge to provide coordinates.`;

  const result = await callGemini(prompt, userId, 'geocode', locationId);

  try {
    // Extract JSON from the response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]) as GeocodingResult;
  } catch {
    return {
      location_name: title || 'Unknown Location',
      address: null,
      coordinates: null,
      confidence: 'low',
      reasoning: 'Failed to parse geocoding response',
    };
  }
}

export async function extractTags(
  locationName: string,
  description: string,
  transcription: string,
  existingTags: Array<{ name: string; category: string }>,
  userId: string,
  locationId?: string
): Promise<TagExtractionResult> {
  const tagsByCategory = existingTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag.name);
    return acc;
  }, {} as Record<string, string[]>);

  const prompt = `Analyze this location and extract relevant tags. Prefer using existing tags when applicable. Return only valid JSON.

Location: ${locationName}
Description: ${description}
User Notes: ${transcription}

Existing tags by category:
${Object.entries(tagsByCategory)
  .map(([cat, tags]) => `${cat}: ${tags.join(', ')}`)
  .join('\n')}

Categories: place_type, ambience, timing, feature, cuisine, activity

Return JSON in this exact format:
{
  "tags": [
    { "name": "tag-name", "category": "category", "existing": true/false }
  ]
}

Guidelines:
- Use lowercase with hyphens for tag names
- Mark "existing": true if the tag already exists in the system
- Only create new tags if truly unique and useful
- Extract 3-8 relevant tags`;

  const result = await callGemini(prompt, userId, 'extract_tags', locationId);

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]) as TagExtractionResult;
  } catch {
    return { tags: [] };
  }
}

export async function generateTravelWriting(
  locationName: string,
  address: string,
  transcription: string,
  urlMetadata: string,
  userId: string,
  locationId?: string
): Promise<TravelWritingResult> {
  const prompt = `Transform this information into engaging travel writing. Write in the style of a seasoned travel writer - evocative but concise. Return only valid JSON.

Location: ${locationName}
Address: ${address}
${transcription ? `User's voice note: ${transcription}` : ''}

Website Information:
${urlMetadata || 'No website content available'}

Write 2-3 paragraphs that:
- Capture the essence and atmosphere of the place
- Include practical details (address, price range, cuisine type if available)
- Incorporate highlights from reviews if provided
- Use sensory language to bring the place to life
- Include the user's personal observations if they recorded a voice note
- Mention any notable dishes, features, or must-try experiences

Keep it under 250 words.

Return JSON in this exact format:
{
  "description": "Your polished travel writing here..."
}`;

  const result = await callGemini(prompt, userId, 'generate_description', locationId);

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]) as TravelWritingResult;
  } catch {
    return { description: transcription };
  }
}

export async function extractLocationsFromText(
  text: string,
  userId: string
): Promise<
  Array<{
    name: string;
    address: string | null;
    url: string | null;
    notes: string | null;
  }>
> {
  const prompt = `Extract all locations/places mentioned in this text. Return only valid JSON.

Text:
${text.substring(0, 5000)}

Return JSON in this exact format:
{
  "locations": [
    {
      "name": "Place name",
      "address": "Address if mentioned, or null",
      "url": "URL if mentioned, or null",
      "notes": "Any notes or descriptions mentioned, or null"
    }
  ]
}

Extract all identifiable places, restaurants, hotels, attractions, etc.`;

  const result = await callGemini(prompt, userId, 'extract_locations');

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.locations || [];
  } catch {
    return [];
  }
}
