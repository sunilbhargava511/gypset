'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapView, MapLocation } from '@/components/MapView';
import { X, ExternalLink, Tag, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationTag {
  tag: {
    id: string;
    name: string;
    category: string;
  };
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
  urlImage: string | null;
  polishedDescription: string | null;
  rawTranscription: string | null;
  tags: LocationTag[];
  trip: {
    id: string;
    title: string;
  };
}

interface Trip {
  id: string;
  title: string;
}

export default function MapPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
    fetchMapboxToken();
  }, [selectedTrip]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTrip) {
        params.set('tripId', selectedTrip);
      }

      const [locationsRes, tripsRes] = await Promise.all([
        fetch(`/api/locations/all?${params}`),
        fetch('/api/trips'),
      ]);

      const locationsData = await locationsRes.json();
      const tripsData = await tripsRes.json();

      setLocations(locationsData);
      setTrips(tripsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMapboxToken = async () => {
    try {
      const res = await fetch('/api/settings/mapbox');
      if (res.ok) {
        const data = await res.json();
        setMapboxToken(data.token);
      }
    } catch (error) {
      console.error('Failed to fetch mapbox token:', error);
    }
  };

  const handleLocationClick = (mapLocation: MapLocation) => {
    const fullLocation = locations.find(l => l.id === mapLocation.id);
    if (fullLocation) {
      setSelectedLocation(fullLocation);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'place_type':
        return 'bg-blue-100 text-blue-700';
      case 'ambience':
        return 'bg-purple-100 text-purple-700';
      case 'timing':
        return 'bg-orange-100 text-orange-700';
      case 'feature':
        return 'bg-green-100 text-green-700';
      case 'cuisine':
        return 'bg-red-100 text-red-700';
      case 'activity':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <MapView
            locations={locations}
            onLocationClick={handleLocationClick}
            accessToken={mapboxToken}
          />
        )}

        {/* Filter Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filter
            {selectedTrip && (
              <span className="w-2 h-2 bg-indigo-600 rounded-full" />
            )}
          </button>

          {showFilters && (
            <div className="absolute top-12 left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3">Filter by Trip</h3>
              <select
                value={selectedTrip}
                onChange={(e) => setSelectedTrip(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Trips</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Location count */}
        <div className="absolute bottom-4 left-4 z-10 px-3 py-1 bg-white rounded-lg shadow-md text-sm text-gray-600">
          {locations.length} places
        </div>
      </div>

      {/* Selected Location Panel */}
      {selectedLocation && (
        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
            <h3 className="font-semibold text-gray-900">Location Details</h3>
            <button
              onClick={() => setSelectedLocation(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedLocation.urlImage && (
            <img
              src={selectedLocation.urlImage}
              alt=""
              className="w-full h-48 object-cover"
            />
          )}

          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-indigo-600 mb-1">
                {selectedLocation.trip.title}
              </p>
              <h4 className="text-lg font-semibold text-gray-900">
                {selectedLocation.name}
              </h4>
              {selectedLocation.address && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedLocation.address}
                </p>
              )}
            </div>

            {selectedLocation.sourceUrl && (
              <a
                href={selectedLocation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <ExternalLink className="w-4 h-4" />
                View Source
              </a>
            )}

            {selectedLocation.polishedDescription && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-1">
                  Description
                </h5>
                <p className="text-sm text-gray-600">
                  {selectedLocation.polishedDescription}
                </p>
              </div>
            )}

            {selectedLocation.tags.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Tags
                </h5>
                <div className="flex flex-wrap gap-2">
                  {selectedLocation.tags.map((lt) => (
                    <span
                      key={lt.tag.id}
                      className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(lt.tag.category)}`}
                    >
                      {lt.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push(`/dashboard/locations/${selectedLocation.id}`)}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View Full Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
