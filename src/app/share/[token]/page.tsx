'use client';

import { useEffect, useState, use } from 'react';
import { MapPin, User } from 'lucide-react';
import LocationCard, { Location } from '@/components/LocationCard';

interface SharedTrip {
  id: string;
  title: string;
  description: string | null;
  createdBy: string | null;
  locations: Location[];
}

export default function SharedTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrip();
  }, [token]);

  const fetchTrip = async () => {
    try {
      const res = await fetch(`/api/public/trips/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Trip not found');
        } else {
          setError('Failed to load trip');
        }
        return;
      }
      const data = await res.json();
      setTrip(data);
    } catch {
      setError('Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Trip not found'}
          </h1>
          <p className="text-gray-500">
            This trip may have been deleted or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <MapPin className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
              {trip.description && (
                <p className="text-gray-500 mt-1">{trip.description}</p>
              )}
              {trip.createdBy && (
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Curated by {trip.createdBy}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-500 mb-6">
          {trip.locations.length} {trip.locations.length === 1 ? 'place' : 'places'}
        </p>

        {trip.locations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No places in this trip yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trip.locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Created with Trip Curator
          </p>
        </div>
      </footer>
    </div>
  );
}
