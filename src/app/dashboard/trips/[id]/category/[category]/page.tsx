'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  MapPin,
  Home,
  Utensils,
  Wine,
  Coffee,
  Building2,
  Camera,
  Umbrella,
  Waves,
  ShoppingBag,
  PartyPopper,
  Compass,
  TreePine,
  Landmark,
  Hotel,
  LayoutGrid,
  Map as MapIcon,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LocationCard, { Location } from '@/components/LocationCard';
import { MapView, MapLocation } from '@/components/MapView';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  homeBaseAddress: string | null;
  homeBaseLatitude: number | null;
  homeBaseLongitude: number | null;
  locations: Location[];
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Eating': Utensils,
  'Drinking': Wine,
  'Cafes': Coffee,
  'Temples': Building2,
  'Sightseeing': Camera,
  'Beaches': Umbrella,
  'Snorkeling': Waves,
  'Shopping': ShoppingBag,
  'Nightlife': PartyPopper,
  'Activities': Compass,
  'Nature': TreePine,
  'Museums': Landmark,
  'Hotels': Hotel,
};

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Eating': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  'Drinking': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  'Cafes': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  'Temples': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  'Sightseeing': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'Beaches': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  'Snorkeling': { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
  'Shopping': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  'Nightlife': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  'Activities': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  'Nature': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  'Museums': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  'Hotels': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

const DEFAULT_COLORS = { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };

export default function CategoryPage({
  params,
}: {
  params: Promise<{ id: string; category: string }>;
}) {
  const { id, category: encodedCategory } = use(params);
  const category = decodeURIComponent(encodedCategory);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrip();
    fetchGoogleMapsApiKey();
  }, [id]);

  const fetchTrip = async () => {
    try {
      const res = await fetch(`/api/trips/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch trip');
      }
      const data = await res.json();
      setTrip(data);
    } catch (error) {
      console.error('Failed to fetch trip:', error);
      toast.error('Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleMapsApiKey = async () => {
    try {
      const res = await fetch('/api/settings/maps');
      if (res.ok) {
        const data = await res.json();
        setGoogleMapsApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Failed to fetch Google Maps API key:', error);
    }
  };

  // Filter locations by category
  const categoryLocations = useMemo(() => {
    if (!trip) return [];
    return trip.locations.filter((loc) => {
      if (category === 'Uncategorized') {
        return !loc.category;
      }
      return loc.category === category;
    });
  }, [trip, category]);

  // Convert to map locations
  const mapLocations: MapLocation[] = useMemo(() => {
    return categoryLocations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      sourceUrl: loc.sourceUrl,
      urlImage: loc.userImage || loc.urlImage,
      polishedDescription: loc.polishedDescription,
    }));
  }, [categoryLocations]);

  const handleDeleteLocation = async (locationId: string) => {
    try {
      const res = await fetch(`/api/locations/${locationId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Location deleted');
        fetchTrip();
      } else {
        toast.error('Failed to delete location');
      }
    } catch {
      toast.error('Failed to delete location');
    }
  };

  const handleMapLocationClick = (mapLoc: MapLocation) => {
    setSelectedLocationId(mapLoc.id);
    // In map view, scroll to the location in the side panel
    const element = document.getElementById(`location-${mapLoc.id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const Icon = CATEGORY_ICONS[category] || MapPin;
  const colors = CATEGORY_COLORS[category] || DEFAULT_COLORS;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className={`border-b ${colors.border} ${colors.bg} px-4 py-4`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/trips/${trip.id}`}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${colors.text}`}>{category}</h1>
                <p className="text-sm text-gray-500">
                  {categoryLocations.length} {categoryLocations.length === 1 ? 'place' : 'places'} in {trip.title}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Home base indicator */}
            {trip.homeBaseAddress && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 bg-white/70 px-3 py-1.5 rounded-full">
                <Home className="w-4 h-4 text-indigo-500" />
                <span className="max-w-[200px] truncate">{trip.homeBaseAddress}</span>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 bg-white rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 ${viewMode === 'map' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Add more button */}
            <Link
              href={`/dashboard/import?tripId=${trip.id}&category=${encodeURIComponent(category)}`}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Add More
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {categoryLocations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center mx-auto mb-4`}>
              <Icon className={`w-8 h-8 ${colors.text}`} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No places in {category}</h3>
            <p className="text-gray-500 mb-6">Import some places to see them on the map</p>
            <Link
              href={`/dashboard/import?tripId=${trip.id}&category=${encodeURIComponent(category)}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Sparkles className="w-4 h-4" />
              Smart Import
            </Link>
          </div>
        </div>
      ) : viewMode === 'map' ? (
        // Map View with side panel
        <div className="flex-1 flex overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            {googleMapsApiKey ? (
              <MapView
                locations={mapLocations}
                onLocationClick={handleMapLocationClick}
                apiKey={googleMapsApiKey}
                center={
                  trip.homeBaseLatitude && trip.homeBaseLongitude
                    ? { lat: trip.homeBaseLatitude, lng: trip.homeBaseLongitude }
                    : undefined
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Google Maps API key not configured</p>
              </div>
            )}
          </div>

          {/* Side Panel - Location Cards */}
          <div className="w-96 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-4 space-y-4">
              {categoryLocations.map((location) => (
                <div
                  key={location.id}
                  id={`location-${location.id}`}
                  className={`transition-all ${
                    selectedLocationId === location.id
                      ? 'ring-2 ring-indigo-500 rounded-2xl'
                      : ''
                  }`}
                >
                  <LocationCard
                    location={location}
                    onDelete={handleDeleteLocation}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Grid View
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryLocations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                onDelete={handleDeleteLocation}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
