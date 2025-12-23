'use client';

import { useState } from 'react';
import {
  MapPin,
  Star,
  Clock,
  Phone,
  DollarSign,
  Utensils,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import LocationModal from './LocationModal';

interface LocationTag {
  tag: {
    id: string;
    name: string;
    category: string;
  };
}

export interface Location {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
  urlTitle: string | null;
  urlDescription: string | null;
  urlImage: string | null;
  userImage: string | null;
  phone: string | null;
  hours: string | null;
  priceRange: string | null;
  rating: string | null;
  cuisine: string | null;
  reservationUrl: string | null;
  rawTranscription: string | null;
  polishedDescription: string | null;
  tags: LocationTag[];
  orderIndex: number;
  // Google Places enrichment
  googlePlaceId?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googleTypes?: string[];
  googleWebsite?: string | null;
}

interface LocationCardProps {
  location: Location;
  tripTitle?: string;
  onDelete?: (id: string) => void;
  showTripBadge?: boolean;
}

const categoryEmojis: Record<string, string> = {
  place_type: '',
  ambience: '',
  timing: '',
  feature: '',
  cuisine: '',
  activity: '',
};

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

export default function LocationCard({
  location,
  tripTitle,
  onDelete,
  showTripBadge = false,
}: LocationCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use user-uploaded image first, then fallback to URL-scraped image
  const displayImage = location.userImage || location.urlImage;

  // Prefer Google rating over scraped rating
  const displayRating = location.googleRating || (location.rating ? parseFloat(location.rating) : null);
  const hasRating = displayRating && displayRating > 0;
  const hasPriceRange = location.priceRange && location.priceRange.length > 0;
  const hasBusinessInfo = location.phone || location.hours || location.reservationUrl;

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="group bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1"
      >
        {/* Image Section */}
        <div className="relative h-44 overflow-hidden">
          {displayImage && !imageError ? (
            <img
              src={displayImage}
              alt={location.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-white/80" />
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Trip badge */}
          {showTripBadge && tripTitle && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full shadow-lg">
                {tripTitle}
              </span>
            </div>
          )}

          {/* Rating badge */}
          {hasRating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-lg">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold text-gray-800">{displayRating?.toFixed(1)}</span>
              {location.googleReviewCount && (
                <span className="text-xs text-gray-500">({location.googleReviewCount})</span>
              )}
            </div>
          )}

          {/* Price & Cuisine badges at bottom of image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
            {hasPriceRange && (
              <span className="px-2 py-1 bg-white/95 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full shadow">
                {location.priceRange}
              </span>
            )}
            {location.cuisine && (
              <span className="px-2 py-1 bg-white/95 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full shadow flex items-center gap-1">
                <Utensils className="w-3 h-3" />
                {location.cuisine}
              </span>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">
            {location.name}
          </h3>

          {/* Address */}
          {location.address && (
            <p className="text-sm text-gray-500 mt-1 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{location.address}</span>
            </p>
          )}

          {/* Quick info row */}
          {hasBusinessInfo && (
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              {location.hours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="line-clamp-1 max-w-[100px]">{location.hours.split(' ')[0]}</span>
                </span>
              )}
              {location.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="line-clamp-1">{location.phone}</span>
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {(location.polishedDescription || location.rawTranscription) && (
            <p className="text-sm text-gray-600 mt-3 line-clamp-2 leading-relaxed">
              {location.polishedDescription || location.rawTranscription}
            </p>
          )}

          {/* Tags */}
          {location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {location.tags.slice(0, 4).map((lt) => (
                <span
                  key={lt.tag.id}
                  className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(lt.tag.category)}`}
                >
                  {lt.tag.name}
                </span>
              ))}
              {location.tags.length > 4 && (
                <span className="text-xs text-gray-400 px-1">
                  +{location.tags.length - 4}
                </span>
              )}
            </div>
          )}

          {/* CTA hint */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Click for details
            </span>
            {location.sourceUrl && (
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <LocationModal
          location={location}
          onClose={() => setShowModal(false)}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
