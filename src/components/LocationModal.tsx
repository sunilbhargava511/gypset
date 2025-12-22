'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  MapPin,
  Star,
  Clock,
  Phone,
  ExternalLink,
  Utensils,
  Calendar,
  Mic,
  Trash2,
  Navigation,
  Tag,
  Globe,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Location } from './LocationCard';

interface ReviewSite {
  id: string;
  country: string;
  platform: string;
  url: string;
  hasRatings: boolean;
  hasReviews: boolean;
  hasMenus: boolean;
}

interface LocationModalProps {
  location: Location;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'place_type':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'ambience':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'timing':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'feature':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'cuisine':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'activity':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

// Extract country from address (simple heuristic)
function extractCountryFromAddress(address: string | null): string | null {
  if (!address) return null;

  // Common country patterns at end of address
  const countryPatterns: Record<string, string> = {
    'thailand': 'Thailand',
    'usa': 'United States',
    'united states': 'United States',
    'uk': 'United Kingdom',
    'united kingdom': 'United Kingdom',
    'france': 'France',
    'italy': 'Italy',
    'spain': 'Spain',
    'germany': 'Germany',
    'japan': 'Japan',
    'india': 'India',
    'singapore': 'Singapore',
    'hong kong': 'Hong Kong',
    'indonesia': 'Indonesia',
    'philippines': 'Philippines',
    'mexico': 'Mexico',
    'brazil': 'Brazil',
    'canada': 'Canada',
    'australia': 'Australia',
  };

  const lowerAddress = address.toLowerCase();
  for (const [pattern, country] of Object.entries(countryPatterns)) {
    if (lowerAddress.includes(pattern)) {
      return country;
    }
  }
  return null;
}

// Build search URL for review site
function buildSearchUrl(site: ReviewSite, locationName: string, address: string | null): string {
  const searchQuery = encodeURIComponent(locationName + (address ? ' ' + address.split(',')[0] : ''));

  // Platform-specific search URL patterns
  const searchPatterns: Record<string, string> = {
    'Yelp': `${site.url}/search?find_desc=${searchQuery}`,
    'Tripadvisor': `${site.url}/Search?q=${searchQuery}`,
    'OpenTable': `${site.url}/s?term=${searchQuery}`,
    'Google Maps': `https://www.google.com/maps/search/${searchQuery}`,
    'Zomato': `${site.url}/search?q=${searchQuery}`,
    'TheFork': `${site.url}/search?query=${searchQuery}`,
  };

  return searchPatterns[site.platform] || `${site.url}/search?q=${searchQuery}`;
}

export default function LocationModal({ location, onClose, onDelete }: LocationModalProps) {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewSites, setReviewSites] = useState<ReviewSite[]>([]);

  // Fetch review sites based on location's country
  const fetchReviewSites = useCallback(async () => {
    try {
      const country = extractCountryFromAddress(location.address);
      const params = country ? `?country=${encodeURIComponent(country)}` : '';
      const res = await fetch(`/api/review-sites${params}`);
      if (res.ok) {
        const data = await res.json();
        setReviewSites(data.sites || []);
      }
    } catch (error) {
      console.error('Failed to fetch review sites:', error);
    }
  }, [location.address]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch review sites on mount
  useEffect(() => {
    fetchReviewSites();
  }, [fetchReviewSites]);

  // Prefer Google rating over scraped rating
  const displayRating = location.googleRating || (location.rating ? parseFloat(location.rating) : null);
  const hasRating = displayRating && displayRating > 0;

  const copyAddress = () => {
    if (location.address) {
      navigator.clipboard.writeText(location.address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInMaps = () => {
    const query = location.address || `${location.latitude},${location.longitude}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this location?')) {
      onDelete(location.id);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div className="relative h-56 sm:h-72 overflow-hidden">
          {location.urlImage && !imageError ? (
            <img
              src={location.urlImage}
              alt={location.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <MapPin className="w-20 h-20 text-white/50" />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title and rating on image */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  {location.name}
                </h2>
                {location.cuisine && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full">
                    <Utensils className="w-3.5 h-3.5" />
                    {location.cuisine}
                  </span>
                )}
              </div>
              {hasRating && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl shadow-lg">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-lg font-bold text-gray-800">{displayRating?.toFixed(1)}</span>
                  {location.googleReviewCount && (
                    <span className="text-sm text-gray-500">({location.googleReviewCount})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-18rem)]">
          {/* Quick Actions Row */}
          <div className="flex flex-wrap gap-2 mb-6">
            {location.reservationUrl && (
              <a
                href={location.reservationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-200"
              >
                <Calendar className="w-4 h-4" />
                Make Reservation
              </a>
            )}
            <button
              onClick={openInMaps}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>
            {location.sourceUrl && (
              <a
                href={location.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Address Card */}
            {location.address && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Address</p>
                      <p className="text-sm text-gray-700 mt-1">{location.address}</p>
                    </div>
                  </div>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Hours Card */}
            {location.hours && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hours</p>
                    <p className="text-sm text-gray-700 mt-1">{location.hours}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Phone Card */}
            {location.phone && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone</p>
                    <a
                      href={`tel:${location.phone}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 mt-1 block"
                    >
                      {location.phone}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Price Card */}
            {location.priceRange && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <span className="text-lg font-bold text-emerald-600">$</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Price Range</p>
                    <p className="text-sm text-gray-700 mt-1 font-medium">{location.priceRange}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {(location.polishedDescription || location.rawTranscription) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-indigo-600 rounded-full" />
                About this place
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {location.polishedDescription || location.rawTranscription}
              </p>
            </div>
          )}

          {/* Find Reviews Section */}
          {reviewSites.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                Find Reviews
              </h3>
              <div className="flex flex-wrap gap-2">
                {reviewSites.slice(0, 6).map((site) => (
                  <a
                    key={site.id}
                    href={buildSearchUrl(site, location.name, location.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {site.platform}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {location.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {location.tags.map((lt) => (
                  <span
                    key={lt.tag.id}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getCategoryColor(lt.tag.category)}`}
                  >
                    {lt.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
            <Link
              href={`/dashboard/locations/${location.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              <Mic className="w-4 h-4" />
              Add Voice Note
            </Link>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
