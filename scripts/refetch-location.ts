import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { fetchUrlContent } from '../src/lib/url-fetcher';
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
  console.error('Usage: npx tsx scripts/refetch-location.ts <locationId>');
  process.exit(1);
}

async function main() {
  console.log('Re-fetching URL content for location:', locationId);

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    console.error('Location not found');
    process.exit(1);
  }

  if (!location.sourceUrl) {
    console.error('Location has no source URL');
    process.exit(1);
  }

  console.log('Location:', location.name);
  console.log('Fetching content from:', location.sourceUrl);

  const urlContent = await fetchUrlContent(location.sourceUrl);
  console.log('\nExtracted content:');
  console.log(JSON.stringify(urlContent, null, 2));

  // Update the location with the fetched content
  const updated = await prisma.location.update({
    where: { id: locationId },
    data: {
      urlTitle: urlContent.title || null,
      urlDescription: urlContent.description || null,
      urlImage: urlContent.images?.[0] || location.urlImage,
      phone: urlContent.phone || null,
      hours: urlContent.hours || null,
      priceRange: urlContent.priceRange || null,
      rating: urlContent.rating || null,
      cuisine: urlContent.cuisine || null,
      reservationUrl: urlContent.reservationUrl || null,
    },
  });

  console.log('\n--- Location Updated ---');
  console.log('Name:', updated.name);
  console.log('Phone:', updated.phone || '(not found)');
  console.log('Hours:', updated.hours || '(not found)');
  console.log('Rating:', updated.rating || '(not found)');
  console.log('Cuisine:', updated.cuisine || '(not found)');
  console.log('Price Range:', updated.priceRange || '(not found)');
  console.log('Reservation URL:', updated.reservationUrl || '(not found)');
  console.log('Image:', updated.urlImage || '(not found)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
