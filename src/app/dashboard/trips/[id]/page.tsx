'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  MapPin,
  ChevronLeft,
  Share2,
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
  Sparkles,
  MoreHorizontal,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Location } from '@/components/LocationCard';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  shareToken: string;
  homeBaseAddress: string | null;
  homeBaseUrl: string | null;
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
const CATEGORY_COLORS: Record<string, string> = {
  'Eating': 'bg-orange-100 text-orange-700 border-orange-200',
  'Drinking': 'bg-purple-100 text-purple-700 border-purple-200',
  'Cafes': 'bg-amber-100 text-amber-700 border-amber-200',
  'Temples': 'bg-red-100 text-red-700 border-red-200',
  'Sightseeing': 'bg-blue-100 text-blue-700 border-blue-200',
  'Beaches': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Snorkeling': 'bg-teal-100 text-teal-700 border-teal-200',
  'Shopping': 'bg-pink-100 text-pink-700 border-pink-200',
  'Nightlife': 'bg-violet-100 text-violet-700 border-violet-200',
  'Activities': 'bg-green-100 text-green-700 border-green-200',
  'Nature': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Museums': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Hotels': 'bg-slate-100 text-slate-700 border-slate-200',
};

const DEFAULT_COLOR = 'bg-gray-100 text-gray-700 border-gray-200';

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Group locations by category
  const categoryCounts = useMemo(() => {
    if (!trip) return {};
    const counts: Record<string, number> = {};
    trip.locations.forEach((loc) => {
      const cat = loc.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [trip]);

  // Sort categories: predefined first (in order), then custom, then uncategorized
  const sortedCategories = useMemo(() => {
    const predefined = ['Eating', 'Drinking', 'Cafes', 'Temples', 'Sightseeing', 'Beaches', 'Snorkeling', 'Shopping', 'Nightlife', 'Activities', 'Nature', 'Museums', 'Hotels'];
    const all = Object.keys(categoryCounts);

    const result: string[] = [];
    // Add predefined categories that exist
    predefined.forEach(cat => {
      if (all.includes(cat)) result.push(cat);
    });
    // Add custom categories (not in predefined, not Uncategorized)
    all.filter(cat => !predefined.includes(cat) && cat !== 'Uncategorized').forEach(cat => result.push(cat));
    // Add Uncategorized last if exists
    if (all.includes('Uncategorized')) result.push('Uncategorized');

    return result;
  }, [categoryCounts]);

  const copyShareLink = () => {
    if (!trip) return;
    const url = `${window.location.origin}/share/${trip.shareToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
  };

  const handleDeleteTrip = async () => {
    if (!confirm('Are you sure you want to delete this trip? This will also delete all places in it.')) {
      return;
    }

    try {
      const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Trip deleted');
        router.push('/dashboard');
      } else {
        toast.error('Failed to delete trip');
      }
    } catch {
      toast.error('Failed to delete trip');
    }
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

  const totalLocations = trip.locations.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{trip.title}</h1>
            {trip.description && (
              <p className="text-gray-500 mt-1">{trip.description}</p>
            )}
            {/* Home Base */}
            {trip.homeBaseAddress && (
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                <Home className="w-4 h-4 text-indigo-500" />
                <span className="font-medium">Staying at:</span>
                <span>{trip.homeBaseAddress}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <Link
            href={`/dashboard/import?tripId=${trip.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Smart Import
          </Link>
          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <Link
                    href={`/dashboard/trips/${trip.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Trip
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleDeleteTrip();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Trip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-8 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          {totalLocations} {totalLocations === 1 ? 'place' : 'places'}
        </span>
        <span className="flex items-center gap-1.5">
          <MoreHorizontal className="w-4 h-4" />
          {sortedCategories.length} {sortedCategories.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      {/* Category Tiles */}
      {totalLocations === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No places yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Use Smart Import to paste a list of places and create your first category map
          </p>
          <Link
            href={`/dashboard/import?tripId=${trip.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Sparkles className="w-4 h-4" />
            Smart Import
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedCategories.map((category) => {
            const count = categoryCounts[category];
            const Icon = CATEGORY_ICONS[category] || MapPin;
            const colorClass = CATEGORY_COLORS[category] || DEFAULT_COLOR;

            return (
              <Link
                key={category}
                href={`/dashboard/trips/${trip.id}/category/${encodeURIComponent(category)}`}
                className={`group relative p-6 rounded-2xl border-2 transition-all hover:shadow-lg hover:scale-[1.02] ${colorClass}`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg">{category}</h3>
                  <p className="text-sm opacity-80 mt-1">
                    {count} {count === 1 ? 'place' : 'places'}
                  </p>
                </div>
              </Link>
            );
          })}

          {/* Add More Card */}
          <Link
            href={`/dashboard/import?tripId=${trip.id}`}
            className="group p-6 rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center text-center text-gray-500 hover:text-indigo-600"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Add More</h3>
            <p className="text-sm opacity-80 mt-1">Import places</p>
          </Link>
        </div>
      )}
    </div>
  );
}
