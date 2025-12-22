import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Create admin user with password "1234"
  const hashedPassword = await bcrypt.hash('1234', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin' },
    update: {},
    create: {
      email: 'admin',
      password: hashedPassword,
      name: 'Administrator',
      isAdmin: true,
    },
  });

  console.log('Created admin user:', adminUser.email);

  // Create initial system settings
  const settings = [
    { key: 'google_api_key', value: '', description: 'Google API key for Gemini AI and Maps' },
    { key: 'gemini_model', value: 'gemini-2.0-flash', description: 'Gemini model to use for AI features' },
    { key: 'max_audio_duration_seconds', value: '0', description: 'Maximum audio recording duration in seconds (0 = unlimited)' },
    { key: 'audio_recording_enabled', value: 'true', description: 'Enable/disable audio recording feature' },
    { key: 'cost_alert_threshold_usd', value: '100', description: 'Alert when monthly costs exceed this amount' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('Created system settings');

  // Create initial tag categories with some default tags
  const defaultTags = [
    // Place types
    { name: 'restaurant', category: 'place_type' },
    { name: 'cafe', category: 'place_type' },
    { name: 'bar', category: 'place_type' },
    { name: 'museum', category: 'place_type' },
    { name: 'park', category: 'place_type' },
    { name: 'beach', category: 'place_type' },
    { name: 'hotel', category: 'place_type' },
    { name: 'viewpoint', category: 'place_type' },
    { name: 'shopping', category: 'place_type' },
    { name: 'landmark', category: 'place_type' },

    // Ambience
    { name: 'romantic', category: 'ambience' },
    { name: 'lively', category: 'ambience' },
    { name: 'quiet', category: 'ambience' },
    { name: 'cozy', category: 'ambience' },
    { name: 'upscale', category: 'ambience' },
    { name: 'casual', category: 'ambience' },
    { name: 'family-friendly', category: 'ambience' },

    // Timing
    { name: 'late-night', category: 'timing' },
    { name: 'early-morning', category: 'timing' },
    { name: 'sunset', category: 'timing' },
    { name: 'weekend-only', category: 'timing' },
    { name: 'reservation-required', category: 'timing' },

    // Features
    { name: 'outdoor-seating', category: 'feature' },
    { name: 'wifi', category: 'feature' },
    { name: 'pet-friendly', category: 'feature' },
    { name: 'vegetarian-options', category: 'feature' },
    { name: 'live-music', category: 'feature' },
    { name: 'ocean-view', category: 'feature' },
    { name: 'rooftop', category: 'feature' },

    // Cuisine
    { name: 'italian', category: 'cuisine' },
    { name: 'japanese', category: 'cuisine' },
    { name: 'mexican', category: 'cuisine' },
    { name: 'thai', category: 'cuisine' },
    { name: 'indian', category: 'cuisine' },
    { name: 'french', category: 'cuisine' },
    { name: 'local-cuisine', category: 'cuisine' },

    // Activities
    { name: 'hiking', category: 'activity' },
    { name: 'swimming', category: 'activity' },
    { name: 'photography', category: 'activity' },
    { name: 'shopping', category: 'activity' },
    { name: 'sightseeing', category: 'activity' },
  ];

  for (const tag of defaultTags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: {
        ...tag,
        createdByLlm: false,
      },
    });
  }

  console.log('Created default tags');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
