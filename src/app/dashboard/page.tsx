'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Trash2, Edit2, Share2, MoreVertical, Download, Chrome, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  _count: { locations: number };
  locations: Array<{ id: string; name: string; urlImage: string | null }>;
}

export default function DashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTripTitle, setNewTripTitle] = useState('');
  const [newTripDescription, setNewTripDescription] = useState('');
  const [newHomeBase, setNewHomeBase] = useState('');
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await fetch('/api/trips');
      const data = await res.json();
      setTrips(data);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    if (!newTripTitle.trim()) {
      toast.error('Please enter a trip title');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTripTitle,
          description: newTripDescription,
          homeBaseAddress: newHomeBase || null,
        }),
      });

      if (res.ok) {
        toast.success('Trip created!');
        setShowNewTrip(false);
        setNewTripTitle('');
        setNewTripDescription('');
        setNewHomeBase('');
        fetchTrips();
      } else {
        toast.error('Failed to create trip');
      }
    } catch {
      toast.error('Failed to create trip');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Trip deleted');
        fetchTrips();
      } else {
        toast.error('Failed to delete trip');
      }
    } catch {
      toast.error('Failed to delete trip');
    }
  };

  const copyShareLink = (shareToken: string) => {
    const url = `${window.location.origin}/share/${shareToken}`;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500 mt-1">Curate and organize your travel discoveries</p>
        </div>
        <button
          onClick={() => setShowNewTrip(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          New Trip
        </button>
      </div>

      {/* New Trip Modal */}
      {showNewTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Trip</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    value={newTripTitle}
                    onChange={(e) => setNewTripTitle(e.target.value)}
                    placeholder="e.g., Summer in Italy"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTripDescription}
                    onChange={(e) => setNewTripDescription(e.target.value)}
                    placeholder="A brief description of your trip..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-indigo-500" />
                      Where are you staying? (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newHomeBase}
                    onChange={(e) => setNewHomeBase(e.target.value)}
                    placeholder="e.g., Hotel Roma, Via dei Condotti 45, Rome or Airbnb URL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be the center of your maps. You can add an address or paste an Airbnb/Booking link.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowNewTrip(false);
                    setNewTripTitle('');
                    setNewTripDescription('');
                    setNewHomeBase('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTrip}
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extension Banner */}
      <div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Chrome className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Get the Chrome Extension</h3>
              <p className="text-white/80 text-sm mt-1">
                Save places from any website with one click. Add voice notes for personalized recommendations.
              </p>
            </div>
          </div>
          <Link
            href="/extension"
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Download Extension
          </Link>
        </div>
      </div>

      {/* Trips Grid */}
      {trips.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trips yet</h3>
          <p className="text-gray-500 mb-6">Start by creating your first trip</p>
          <button
            onClick={() => setShowNewTrip(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Create Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Preview images */}
              <Link href={`/dashboard/trips/${trip.id}`}>
                <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  {trip.locations.length > 0 && trip.locations[0].urlImage ? (
                    <img
                      src={trip.locations[0].urlImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MapPin className="w-8 h-8 text-indigo-300" />
                  )}
                </div>
              </Link>

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/trips/${trip.id}`} className="flex-1">
                    <h3 className="font-semibold text-gray-900 hover:text-indigo-600">
                      {trip.title}
                    </h3>
                  </Link>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === trip.id ? null : trip.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {menuOpen === trip.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <Link
                          href={`/dashboard/trips/${trip.id}/edit`}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setMenuOpen(null)}
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </Link>
                        <button
                          onClick={() => {
                            copyShareLink(trip.shareToken);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Share2 className="w-4 h-4" />
                          Copy Share Link
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteTrip(trip.id);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {trip.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{trip.description}</p>
                )}

                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <span>{trip._count.locations} places</span>
                  <span>{format(new Date(trip.updatedAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
