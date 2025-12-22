import * as cheerio from 'cheerio';

export interface UrlContent {
  title: string;
  description: string;
  content: string;
  address?: string;
  phone?: string;
  hours?: string;
  reviews?: string[];
  rating?: string;
  priceRange?: string;
  cuisine?: string;
  images?: string[];
  reservationUrl?: string;
}

export async function fetchUrlContent(url: string): Promise<UrlContent> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TripCurator/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style, noscript, iframe').remove();

    // Extract metadata
    const title = $('title').text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('h1').first().text().trim() || '';

    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') || '';

    // Extract main content (body text, limited) - do this early for regex searches
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000);

    // Look for address information (common patterns)
    const addressSelectors = [
      '[itemtype*="PostalAddress"]',
      '[class*="address"]',
      '[class*="location"]',
      'address',
      '[data-testid*="address"]',
    ];

    let address = '';
    for (const selector of addressSelectors) {
      const found = $(selector).first().text().trim();
      if (found && found.length > 10 && found.length < 200) {
        address = found.replace(/\s+/g, ' ');
        break;
      }
    }

    // Look for phone number (supports international formats)
    const phonePatterns = [
      /T:\s*(\+\d{1,4}[\s.-]?\d{2,4}[\s.-]?\d{3}[\s.-]?\d{3,4})/i,  // T: +66 76 327 006
      /(?:tel|phone|call)[:\s]*(\+?\d{1,4}[\s.-]?\d{2,4}[\s.-]?\d{3}[\s.-]?\d{3,4})/i,
      /(\+\d{1,4}[\s.-]?\d{2,4}[\s.-]?\d{3}[\s.-]?\d{3,4})/,  // International format
      /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/,  // US format
    ];

    let phone = '';
    for (const pattern of phonePatterns) {
      const match = html.match(pattern);
      if (match) {
        phone = match[1].trim();
        break;
      }
    }

    // Look for hours - first try selectors
    const hoursSelectors = [
      '[class*="hours"]',
      '[class*="schedule"]',
      '[itemtype*="OpeningHoursSpecification"]',
    ];

    let hours = '';
    for (const selector of hoursSelectors) {
      const found = $(selector).first().text().trim();
      if (found && found.length > 5 && found.length < 500) {
        hours = found.replace(/\s+/g, ' ');
        break;
      }
    }

    // If not found via selectors, try regex patterns in content
    if (!hours) {
      const hoursPatterns = [
        /(?:hours|open)[:\s]*(?:daily\s+)?(?:for\s+\w+\s+)?(?:from\s+)?(\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2})/i,
        /(\d{1,2}[:.]\d{2}\s*(?:am|pm)?\s*[-–]\s*\d{1,2}[:.]\d{2}\s*(?:am|pm)?)/i,
        /(?:open|hours)[:\s]*([^\n]{10,60}(?:am|pm|daily|\d{2}:\d{2}))/i,
      ];

      for (const pattern of hoursPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          hours = match[1].trim();
          break;
        }
      }
    }

    // Look for reviews
    const reviews: string[] = [];
    const reviewSelectors = [
      '[class*="review"]',
      '[itemtype*="Review"]',
      '[data-testid*="review"]',
    ];

    for (const selector of reviewSelectors) {
      $(selector).slice(0, 5).each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ');
        if (text.length > 50 && text.length < 1000) {
          reviews.push(text);
        }
      });
      if (reviews.length > 0) break;
    }

    // Look for rating
    const ratingSelectors = [
      '[class*="rating"]',
      '[itemtype*="AggregateRating"]',
      '[aria-label*="rating"]',
    ];

    let rating = '';
    for (const selector of ratingSelectors) {
      const found = $(selector).first().text().trim();
      const ratingMatch = found.match(/(\d+\.?\d*)\s*(?:\/\s*5|out of 5|stars?)?/i);
      if (ratingMatch) {
        rating = ratingMatch[1];
        break;
      }
    }

    // Look for price range
    const priceMatch = html.match(/(\$+|\$\$\$?-\$\$\$\$|\€+|£+)/);
    const priceRange = priceMatch ? priceMatch[1] : '';

    // Look for cuisine type - try selectors first
    const cuisineSelectors = [
      '[class*="cuisine"]',
      '[class*="category"]',
      '[itemtype*="Restaurant"] [class*="type"]',
    ];

    let cuisine = '';
    for (const selector of cuisineSelectors) {
      const found = $(selector).first().text().trim();
      if (found && found.length > 3 && found.length < 100) {
        cuisine = found;
        break;
      }
    }

    // If not found, try to detect common cuisines from content
    if (!cuisine) {
      const cuisineTypes = [
        'Thai', 'Italian', 'Japanese', 'Chinese', 'Indian', 'Mexican', 'French',
        'Korean', 'Vietnamese', 'Mediterranean', 'American', 'Seafood', 'Steakhouse',
        'Sushi', 'Pizza', 'BBQ', 'Greek', 'Spanish', 'Middle Eastern', 'Fusion',
      ];
      const lowerContent = bodyText.toLowerCase();
      for (const type of cuisineTypes) {
        // Look for cuisine mentions in context (e.g., "Thai cuisine", "Italian restaurant")
        const pattern = new RegExp(`${type.toLowerCase()}\\s*(?:cuisine|restaurant|food|kitchen|cooking)`, 'i');
        if (pattern.test(lowerContent)) {
          cuisine = type;
          break;
        }
      }
    }

    // Get images - prefer og:image first, then larger content images
    const images: string[] = [];

    // First try Open Graph image (usually the best hero image)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      try {
        images.push(new URL(ogImage, url).href);
      } catch {
        // Skip invalid URL
      }
    }

    // Then collect other images, filtering out small icons/logos
    $('img[src]').each((_, el) => {
      if (images.length >= 5) return false; // Stop after 5 images
      const src = $(el).attr('src');
      const width = $(el).attr('width');
      const height = $(el).attr('height');

      // Skip small images (likely icons/logos), data URIs, and SVGs
      if (!src || src.includes('data:') || src.includes('svg')) return;
      if (src.includes('logo') || src.includes('icon')) return;
      if (width && parseInt(width) < 200) return;
      if (height && parseInt(height) < 150) return;

      try {
        const absoluteUrl = new URL(src, url).href;
        if (!images.includes(absoluteUrl)) {
          images.push(absoluteUrl);
        }
      } catch {
        // Skip invalid URLs
      }
    });

    // Look for reservation links
    const reservationSelectors = [
      'a[href*="reservation"]',
      'a[href*="resy.com"]',
      'a[href*="opentable.com"]',
      'a[href*="yelp.com/reservations"]',
      'a[href*="book"]',
      '[class*="reserve"] a',
      '[class*="booking"] a',
    ];

    let reservationUrl = '';
    for (const selector of reservationSelectors) {
      const link = $(selector).first().attr('href');
      if (link) {
        try {
          reservationUrl = new URL(link, url).href;
          break;
        } catch {
          // Skip invalid URLs
        }
      }
    }

    return {
      title,
      description,
      content: bodyText,
      address: address || undefined,
      phone: phone || undefined,
      hours: hours || undefined,
      reviews: reviews.length > 0 ? reviews : undefined,
      rating: rating || undefined,
      priceRange: priceRange || undefined,
      cuisine: cuisine || undefined,
      images: images.length > 0 ? images : undefined,
      reservationUrl: reservationUrl || undefined,
    };
  } catch (error) {
    console.error('Error fetching URL content:', error);
    return {
      title: '',
      description: '',
      content: '',
    };
  }
}

export function formatUrlContentForLlm(content: UrlContent): string {
  const parts: string[] = [];

  if (content.title) {
    parts.push(`Page Title: ${content.title}`);
  }

  if (content.description) {
    parts.push(`Description: ${content.description}`);
  }

  if (content.address) {
    parts.push(`Address Found: ${content.address}`);
  }

  if (content.phone) {
    parts.push(`Phone: ${content.phone}`);
  }

  if (content.hours) {
    parts.push(`Hours: ${content.hours}`);
  }

  if (content.rating) {
    parts.push(`Rating: ${content.rating}/5`);
  }

  if (content.priceRange) {
    parts.push(`Price Range: ${content.priceRange}`);
  }

  if (content.cuisine) {
    parts.push(`Cuisine/Type: ${content.cuisine}`);
  }

  if (content.reviews && content.reviews.length > 0) {
    parts.push(`Sample Reviews:\n${content.reviews.slice(0, 3).map(r => `- ${r.substring(0, 300)}`).join('\n')}`);
  }

  if (content.content) {
    // Add truncated page content
    parts.push(`Page Content (excerpt): ${content.content.substring(0, 2000)}`);
  }

  return parts.join('\n\n');
}
