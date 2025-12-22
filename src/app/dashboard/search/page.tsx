'use client';

import { useEffect, useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import LocationCard, { Location } from '@/components/LocationCard';

interface LocationWithTrip extends Location {
  trip: {
    id: string;
    title: string;
  };
}

interface TagItem {
  id: string;
  name: string;
  category: string;
  usageCount: number;
}

interface Trip {
  id: string;
  title: string;
}

const CATEGORIES = [
  { id: 'place_type', label: 'Place Type', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'ambience', label: 'Ambience', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'timing', label: 'Timing', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'feature', label: 'Feature', color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'cuisine', label: 'Cuisine', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'activity', label: 'Activity', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState<LocationWithTrip[]>([]);
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // Initial load to get tags and trips
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await fetch('/api/search');
      const data = await res.json();
      setAllTags(data.tags);
      setTrips(data.trips);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (selectedTrip) params.set('tripId', selectedTrip);

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setLocations(data.locations);
    } catch (error) {
      console.error('Failed to search:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedTrip('');
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find((c) => c.id === category);
    return cat?.color || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const groupedTags = CATEGORIES.map((cat) => ({
    ...cat,
    tags: allTags.filter((t) => t.category === cat.id),
  })).filter((cat) => cat.tags.length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Search Places</h1>
        <p className="text-gray-500 mt-1">Find locations across all your trips</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name, description, or address..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
            showFilters || selectedTags.length > 0 || selectedTrip
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-5 h-5" />
          Filters
          {(selectedTags.length > 0 || selectedTrip) && (
            <span className="w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
              {selectedTags.length + (selectedTrip ? 1 : 0)}
            </span>
          )}
        </button>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {(selectedTags.length > 0 || selectedTrip) && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Trip Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Trip</label>
            <select
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Trips</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Tags</label>
            <div className="space-y-4">
              {groupedTags.map((category) => (
                <div key={category.id}>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    {category.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`text-sm px-3 py-1 rounded-full border transition-all ${
                          selectedTags.includes(tag.name)
                            ? `${getCategoryColor(tag.category)} border-current`
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {tag.name}
                        {selectedTags.includes(tag.name) && (
                          <X className="w-3 h-3 ml-1 inline" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedTags.map((tagName) => {
            const tag = allTags.find((t) => t.name === tagName);
            return (
              <button
                key={tagName}
                onClick={() => toggleTag(tagName)}
                className={`text-sm px-3 py-1 rounded-full flex items-center gap-1 ${
                  tag ? getCategoryColor(tag.category) : 'bg-gray-100 text-gray-700'
                }`}
              >
                {tagName}
                <X className="w-3 h-3" />
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {locations.length} result{locations.length !== 1 ? 's' : ''}
          </p>

          {locations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  tripTitle={location.trip.title}
                  showTripBadge={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Search your places</h3>
          <p className="text-gray-500">Enter a search term or select filters to find locations</p>
        </div>
      )}
    </div>
  );
}
