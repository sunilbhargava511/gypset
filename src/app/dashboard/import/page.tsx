'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Loader2,
  MapPin,
  Star,
  DollarSign,
  Clock,
  Sparkles,
  Check,
  X,
  Trash2,
  Save,
  Map as MapIcon,
  List,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MapView, MapLocation } from '@/components/MapView';

interface ParsedLocation {
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  url: string | null;
  rating: string | null;
  reviewCount: string | null;
  priceRange: string | null;
  cuisine: string | null;
  description: string | null;
  highlights: string[];
  bestFor: string | null;
  timing: string | null;
  vibes: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeConfidence: 'high' | 'medium' | 'low' | null;
  selected: boolean;
  id: string; // Generated client-side for tracking
}

interface Trip {
  id: string;
  title: string;
}

export default function SmartImportPage() {
  const router = useRouter();
  const [textInput, setTextInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedLocations, setParsedLocations] = useState<ParsedLocation[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string>('');
  const [newTripName, setNewTripName] = useState('');
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [importComplete, setImportComplete] = useState(false);
  const [importedTripId, setImportedTripId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrips();
    fetchGoogleMapsApiKey();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await fetch('/api/trips');
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
        if (data.length > 0) {
          setSelectedTrip(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
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

  const handleParse = async () => {
    if (!textInput.trim()) {
      toast.error('Please paste some text to parse');
      return;
    }

    setParsing(true);
    try {
      const res = await fetch('/api/import/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, geocode: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse text');
      }

      if (!data.locations || data.locations.length === 0) {
        toast.error(data.message || 'No locations found in the text');
        return;
      }

      // Add IDs and selection state
      const locationsWithIds = data.locations.map((loc: Omit<ParsedLocation, 'selected' | 'id'>, index: number) => ({
        ...loc,
        id: `loc-${index}-${Date.now()}`,
        selected: true,
      }));

      setParsedLocations(locationsWithIds);
      toast.success(`Found ${locationsWithIds.length} places`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse text');
    } finally {
      setParsing(false);
    }
  };

  const toggleLocation = (id: string) => {
    setParsedLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, selected: !loc.selected } : loc
      )
    );
  };

  const removeLocation = (id: string) => {
    setParsedLocations((prev) => prev.filter((loc) => loc.id !== id));
    if (selectedLocationId === id) {
      setSelectedLocationId(null);
    }
  };

  const handleCreateTrip = async () => {
    if (!newTripName.trim()) {
      toast.error('Please enter a trip name');
      return;
    }

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTripName.trim() }),
      });

      if (res.ok) {
        const newTrip = await res.json();
        setTrips((prev) => [newTrip, ...prev]);
        setSelectedTrip(newTrip.id);
        setNewTripName('');
        setShowNewTrip(false);
        toast.success('Trip created');
      } else {
        throw new Error('Failed to create trip');
      }
    } catch (error) {
      console.error('Create trip error:', error);
      toast.error('Failed to create trip');
    }
  };

  const handleImport = async () => {
    const selected = parsedLocations.filter((loc) => loc.selected && loc.latitude && loc.longitude);

    if (selected.length === 0) {
      toast.error('No valid locations selected');
      return;
    }

    if (!selectedTrip) {
      toast.error('Please select a trip');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip,
          sourceType: 'direct',
          locations: selected.map((loc) => ({
            name: loc.name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
            notes: [
              loc.description,
              loc.highlights?.length ? `Highlights: ${loc.highlights.join(', ')}` : null,
              loc.bestFor ? `Best for: ${loc.bestFor}` : null,
              loc.vibes ? `Vibes: ${loc.vibes}` : null,
            ]
              .filter(Boolean)
              .join('\n\n'),
            url: loc.url,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Import failed');
      }

      const data = await res.json();
      toast.success(`Imported ${data.importedLocations} places`);
      setImportComplete(true);
      setImportedTripId(selectedTrip);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import locations');
    } finally {
      setImporting(false);
    }
  };

  const selectedLocation = parsedLocations.find((loc) => loc.id === selectedLocationId);
  const selectedCount = parsedLocations.filter((loc) => loc.selected).length;
  const validCount = parsedLocations.filter((loc) => loc.selected && loc.latitude && loc.longitude).length;

  // Convert to MapLocation format
  const mapLocations: MapLocation[] = parsedLocations
    .filter((loc) => loc.latitude && loc.longitude)
    .map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      latitude: loc.latitude!,
      longitude: loc.longitude!,
      sourceUrl: loc.url,
      urlImage: null,
      polishedDescription: loc.description,
    }));

  // Debug logging
  console.log('parsedLocations:', parsedLocations.length);
  console.log('mapLocations (with coords):', mapLocations.length);
  console.log('googleMapsApiKey:', googleMapsApiKey ? 'set' : 'not set');

  const handleMapLocationClick = (mapLoc: MapLocation) => {
    setSelectedLocationId(mapLoc.id);
  };

  if (importComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h1>
        <p className="text-gray-600 mb-8">
          Your places have been added to the trip.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setParsedLocations([]);
              setTextInput('');
              setImportComplete(false);
            }}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Import More
          </button>
          <button
            onClick={() => router.push(`/dashboard/trips/${importedTripId}`)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            View Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Smart Import
            </h1>
            <p className="text-sm text-gray-500">
              Paste text and AI will extract places with all details
            </p>
          </div>
        </div>

        {parsedLocations.length > 0 && (
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 ${viewMode === 'map' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Trip Selection */}
            {showNewTrip ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                  placeholder="Trip name"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTrip()}
                />
                <button
                  onClick={handleCreateTrip}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowNewTrip(false)}
                  className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={selectedTrip}
                  onChange={(e) => setSelectedTrip(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {trips.length === 0 && <option value="">No trips</option>}
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewTrip(true)}
                  className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  title="Create new trip"
                >
                  +
                </button>
              </div>
            )}

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save {validCount} Places
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {parsedLocations.length === 0 ? (
        // Text Input View
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Paste Your Travel Notes
              </h2>
              <p className="text-gray-500">
                Copy and paste recommendations from any source - articles, messages, notes.
                <br />
                AI will extract all the places with ratings, prices, and descriptions.
              </p>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Example:

Restaurant A - 4.5/5 (500 reviews) - $$$
Amazing rooftop views, best pasta in town. Must try the truffle risotto.
Perfect for romantic dinners.

Cafe B
Great coffee spot near the beach. $
Open 7am-3pm, known for their avocado toast.
Casual vibes, good for breakfast.`}
              className="w-full h-80 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm"
            />

            <button
              onClick={handleParse}
              disabled={parsing || !textInput.trim()}
              className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {parsing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Extracting Places...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Extract Places
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        // Results View
        <div className="flex-1 flex overflow-hidden">
          {/* Map View */}
          {viewMode === 'map' && (
            <div className="flex-1 relative min-h-[400px]">
              {!googleMapsApiKey ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Google Maps API key not configured</p>
                    <p className="text-sm text-gray-400 mt-1">Add it in the Admin settings</p>
                  </div>
                </div>
              ) : mapLocations.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No locations with coordinates</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {parsedLocations.length} places found but none could be geocoded
                    </p>
                  </div>
                </div>
              ) : (
                <MapView
                  locations={mapLocations}
                  onLocationClick={handleMapLocationClick}
                  apiKey={googleMapsApiKey}
                />
              )}

              {/* Location count badge */}
              <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 bg-white rounded-lg shadow-md text-sm text-gray-600">
                {mapLocations.length} places on map
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-4 max-w-4xl mx-auto">
                {parsedLocations.map((loc) => (
                  <LocationCard
                    key={loc.id}
                    location={loc}
                    isSelected={loc.id === selectedLocationId}
                    onSelect={() => setSelectedLocationId(loc.id)}
                    onToggle={() => toggleLocation(loc.id)}
                    onRemove={() => removeLocation(loc.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Side Panel - Location Details */}
          {viewMode === 'map' && (
            <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
              {selectedLocation ? (
                <LocationDetailPanel
                  location={selectedLocation}
                  onToggle={() => toggleLocation(selectedLocation.id)}
                  onRemove={() => removeLocation(selectedLocation.id)}
                  onClose={() => setSelectedLocationId(null)}
                />
              ) : (
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Places ({parsedLocations.length})</h3>
                  <div className="space-y-2">
                    {parsedLocations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setSelectedLocationId(loc.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          loc.selected
                            ? 'border-indigo-200 bg-indigo-50'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        } hover:border-indigo-300`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={loc.selected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleLocation(loc.id);
                            }}
                            className="mt-1 rounded border-gray-300 text-indigo-600"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                              {loc.name}
                            </h4>
                            {loc.city && (
                              <p className="text-xs text-gray-500">{loc.city}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {loc.rating && (
                                <span className="text-xs text-gray-600 flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  {loc.rating}
                                </span>
                              )}
                              {loc.priceRange && (
                                <span className="text-xs text-gray-500">{loc.priceRange}</span>
                              )}
                              {!loc.latitude && (
                                <span className="text-xs text-orange-600 flex items-center gap-0.5">
                                  <AlertCircle className="w-3 h-3" />
                                  No location
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  location,
  isSelected,
  onSelect,
  onToggle,
  onRemove,
}: {
  location: ParsedLocation;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-100'
          : location.selected
          ? 'border-gray-200 hover:border-indigo-300'
          : 'border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={location.selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-1 rounded border-gray-300 text-indigo-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900">{location.name}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Location info */}
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
            {location.city && (
              <span className="text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {location.city}{location.country ? `, ${location.country}` : ''}
              </span>
            )}
            {location.rating && (
              <span className="flex items-center gap-1 text-gray-600">
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                {location.rating}
                {location.reviewCount && (
                  <span className="text-gray-400">({location.reviewCount})</span>
                )}
              </span>
            )}
            {location.priceRange && (
              <span className="text-gray-500 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {location.priceRange}
              </span>
            )}
            {location.cuisine && (
              <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full text-xs">
                {location.cuisine}
              </span>
            )}
          </div>

          {/* Description */}
          {location.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {location.description}
            </p>
          )}

          {/* Highlights */}
          {location.highlights?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {location.highlights.slice(0, 4).map((h, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  {h}
                </span>
              ))}
              {location.highlights.length > 4 && (
                <span className="text-xs text-gray-400">
                  +{location.highlights.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Status */}
          <div className="mt-2">
            {location.latitude && location.longitude ? (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Location found
                {location.geocodeConfidence && (
                  <span className="text-gray-400">({location.geocodeConfidence} confidence)</span>
                )}
              </span>
            ) : (
              <span className="text-xs text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Could not determine location - will not be imported
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationDetailPanel({
  location,
  onToggle,
  onRemove,
  onClose,
}: {
  location: ParsedLocation;
  onToggle: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
        <h3 className="font-semibold text-gray-900">Place Details</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name & Basic Info */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{location.name}</h2>
          {location.city && (
            <p className="text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {location.city}{location.country ? `, ${location.country}` : ''}
            </p>
          )}
          {location.address && (
            <p className="text-sm text-gray-500 mt-1">{location.address}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4">
          {location.rating && (
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold">{location.rating}</span>
              {location.reviewCount && (
                <span className="text-gray-500 text-sm">({location.reviewCount} reviews)</span>
              )}
            </div>
          )}
          {location.priceRange && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <DollarSign className="w-5 h-5" />
              <span>{location.priceRange}</span>
            </div>
          )}
          {location.cuisine && (
            <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm font-medium">
              {location.cuisine}
            </span>
          )}
        </div>

        {/* Description */}
        {location.description && (
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Description</h4>
            <p className="text-gray-600 text-sm">{location.description}</p>
          </div>
        )}

        {/* Highlights */}
        {location.highlights?.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Highlights</h4>
            <div className="flex flex-wrap gap-2">
              {location.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Best For */}
        {location.bestFor && (
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Best For</h4>
            <p className="text-gray-600 text-sm">{location.bestFor}</p>
          </div>
        )}

        {/* Timing */}
        {location.timing && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
            <p className="text-gray-600 text-sm">{location.timing}</p>
          </div>
        )}

        {/* Vibes */}
        {location.vibes && (
          <div>
            <h4 className="font-medium text-gray-700 mb-1">Vibes</h4>
            <p className="text-gray-600 text-sm italic">{location.vibes}</p>
          </div>
        )}

        {/* Geocode Status */}
        <div className={`p-3 rounded-lg ${location.latitude ? 'bg-green-50' : 'bg-orange-50'}`}>
          {location.latitude && location.longitude ? (
            <p className="text-sm text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Location found ({location.geocodeConfidence} confidence)
            </p>
          ) : (
            <p className="text-sm text-orange-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Could not determine exact location. This place will not be imported.
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={onRemove}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          Remove
        </button>
        <button
          onClick={onToggle}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
            location.selected
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {location.selected ? (
            <>
              <Check className="w-4 h-4" />
              Selected
            </>
          ) : (
            'Select'
          )}
        </button>
      </div>
    </div>
  );
}
