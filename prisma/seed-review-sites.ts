import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ReviewSiteRow {
  country: string;
  platform: string;
  url: string;
  hasRatings: boolean;
  hasReviews: boolean;
  hasMenus: boolean;
  notes: string | null;
}

function parseCSV(content: string): ReviewSiteRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    // Handle CSV properly (commas within quotes)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    // Map to object
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header.trim()] = values[i] || '';
    });

    return {
      country: row['Country'] || 'Global',
      platform: row['Platform'] || '',
      url: row['Website/App URL'] || '',
      hasRatings: row['Ratings']?.toLowerCase().includes('yes') ?? true,
      hasReviews: row['Written reviews']?.toLowerCase().includes('yes') ?? true,
      hasMenus: row['Menus']?.toLowerCase().includes('yes') ?? false,
      notes: row['Notes'] || null,
    };
  }).filter(row => row.platform && row.url);
}

async function main() {
  console.log('Seeding review sites...');

  const csvPath = join(__dirname, 'data', 'restaurant_review_sites.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');
  const reviewSites = parseCSV(csvContent);

  console.log(`Found ${reviewSites.length} review sites in CSV`);

  let created = 0;
  let updated = 0;

  for (const site of reviewSites) {
    const existing = await prisma.reviewSite.findFirst({
      where: {
        country: site.country,
        platform: site.platform,
      },
    });

    if (existing) {
      await prisma.reviewSite.update({
        where: { id: existing.id },
        data: site,
      });
      updated++;
    } else {
      await prisma.reviewSite.create({
        data: site,
      });
      created++;
    }
  }

  console.log(`Created ${created} new review sites`);
  console.log(`Updated ${updated} existing review sites`);
  console.log('Review sites seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
