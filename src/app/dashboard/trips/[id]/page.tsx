'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  MapPin,
  ChevronLeft,
  Share2,
  LayoutGrid,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import LocationCard, { Location } from '@/components/LocationCard';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  shareToken: string;
  locations: Location[];
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Add location form
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchTrip();
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

  const handleAddLocation = async () => {
    if (!newName && !newUrl) {
      toast.error('Please provide a name or URL');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: id,
          sourceUrl: newUrl || null,
          name: newName || null,
          latitude: newLat ? parseFloat(newLat) : null,
          longitude: newLng ? parseFloat(newLng) : null,
          notes: newNotes || null,
        }),
      });

      if (res.ok) {
        toast.success('Location added!');
        setShowAddLocation(false);
        setNewUrl('');
        setNewName('');
        setNewNotes('');
        setNewLat('');
        setNewLng('');
        fetchTrip();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to add location');
      }
    } catch {
      toast.error('Failed to add location');
    } finally {
      setAdding(false);
    }
  };

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

  const copyShareLink = () => {
    if (!trip) return;
    const url = `${window.location.origin}/share/${trip.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
            {trip.description && (
              <p className="text-gray-500 mt-1">{trip.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={() => setShowAddLocation(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Place
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      {trip.locations.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {trip.locations.length} {trip.locations.length === 1 ? 'place' : 'places'}
          </p>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {trip.locations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No places yet</h3>
          <p className="text-gray-500 mb-6">Add your first place to this trip</p>
          <button
            onClick={() => setShowAddLocation(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Place
          </button>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'grid grid-cols-1 gap-4'
        }>
          {trip.locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onDelete={handleDeleteLocation}
            />
          ))}
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Place</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL (optional)
                  </label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com/place"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We&apos;ll extract location info and coordinates automatically
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Blue Bottle Coffee"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Add any notes about this place..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude (optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      placeholder="37.7749"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude (optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                      placeholder="-122.4194"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddLocation(false);
                    setNewUrl('');
                    setNewName('');
                    setNewNotes('');
                    setNewLat('');
                    setNewLng('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLocation}
                  disabled={adding}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add Place'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
