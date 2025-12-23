'use client';

import { useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';

export interface MapLocation {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
  urlImage: string | null;
  polishedDescription: string | null;
}

interface MapViewProps {
  locations: MapLocation[];
  onLocationClick?: (location: MapLocation) => void;
  apiKey: string;
  center?: { lat: number; lng: number };
  zoom?: number;
}

function MapMarkers({
  locations,
  onLocationClick,
}: {
  locations: MapLocation[];
  onLocationClick?: (location: MapLocation) => void;
}) {
  const map = useMap();
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  // Fit bounds to show all markers
  const fitBounds = useCallback(() => {
    if (!map || locations.length === 0) return;

    if (locations.length === 1) {
      map.setCenter({ lat: locations[0].latitude, lng: locations[0].longitude });
      map.setZoom(14);
    } else {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((l) => {
        bounds.extend({ lat: l.latitude, lng: l.longitude });
      });
      map.fitBounds(bounds, 50);
    }
  }, [map, locations]);

  // Fit bounds when locations change
  useState(() => {
    if (map && locations.length > 0) {
      // Small delay to ensure map is ready
      setTimeout(fitBounds, 100);
    }
  });

  return (
    <>
      {locations.map((location) => (
        <AdvancedMarker
          key={location.id}
          position={{ lat: location.latitude, lng: location.longitude }}
          onClick={() => {
            setSelectedLocation(location);
            if (onLocationClick) {
              onLocationClick(location);
            }
          }}
        >
          <div
            className="w-8 h-8 rounded-full bg-indigo-600 border-3 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            style={{
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </AdvancedMarker>
      ))}

      {selectedLocation && (
        <InfoWindow
          position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
          onCloseClick={() => setSelectedLocation(null)}
          pixelOffset={[0, -40]}
        >
          <div className="max-w-[280px] p-1">
            {selectedLocation.urlImage && (
              <img
                src={selectedLocation.urlImage}
                alt=""
                className="w-full h-28 object-cover rounded-lg mb-2"
              />
            )}
            <h3 className="font-semibold text-sm text-gray-900 mb-1">
              {selectedLocation.name}
            </h3>
            {selectedLocation.address && (
              <p className="text-xs text-gray-500 mb-1">{selectedLocation.address}</p>
            )}
            {selectedLocation.polishedDescription && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {selectedLocation.polishedDescription}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function MapView({
  locations,
  onLocationClick,
  apiKey,
  center,
  zoom = 10,
}: MapViewProps) {
  // Calculate center from locations if not provided
  let initialCenter = center;
  if (!initialCenter && locations.length > 0) {
    const avgLat = locations.reduce((sum, l) => sum + l.latitude, 0) / locations.length;
    const avgLng = locations.reduce((sum, l) => sum + l.longitude, 0) / locations.length;
    initialCenter = { lat: avgLat, lng: avgLng };
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <p className="text-gray-500">Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={initialCenter || { lat: 37.7749, lng: -122.4194 }}
        defaultZoom={zoom}
        mapId="gypset-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="w-full h-full rounded-xl overflow-hidden"
      >
        <MapMarkers locations={locations} onLocationClick={onLocationClick} />
      </Map>
    </APIProvider>
  );
}
