'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  accessToken: string;
  center?: [number, number];
  zoom?: number;
}

export function MapView({
  locations,
  onLocationClick,
  accessToken,
  center,
  zoom = 10,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !accessToken) return;

    mapboxgl.accessToken = accessToken;

    // Calculate center from locations if not provided
    let initialCenter = center;
    if (!initialCenter && locations.length > 0) {
      const avgLat = locations.reduce((sum, l) => sum + l.latitude, 0) / locations.length;
      const avgLng = locations.reduce((sum, l) => sum + l.longitude, 0) / locations.length;
      initialCenter = [avgLng, avgLat];
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter || [-122.4194, 37.7749],
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      markers.current.forEach((m) => m.remove());
      map.current?.remove();
    };
  }, [accessToken]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach((m) => m.remove());
    markers.current = [];

    // Add markers for each location
    locations.forEach((location) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#4f46e5';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';

      // Add inner dot
      const inner = document.createElement('div');
      inner.style.width = '8px';
      inner.style.height = '8px';
      inner.style.borderRadius = '50%';
      inner.style.backgroundColor = 'white';
      el.appendChild(inner);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: '300px',
      }).setHTML(`
        <div style="padding: 8px;">
          ${location.urlImage ? `<img src="${location.urlImage}" alt="" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ''}
          <h3 style="font-weight: 600; margin: 0 0 4px 0; font-size: 14px;">${location.name}</h3>
          ${location.address ? `<p style="margin: 0; font-size: 12px; color: #666;">${location.address}</p>` : ''}
          ${location.polishedDescription ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #444; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${location.polishedDescription}</p>` : ''}
        </div>
      `);

      el.addEventListener('mouseenter', () => {
        marker.setPopup(popup);
        popup.addTo(map.current!);
      });

      el.addEventListener('mouseleave', () => {
        popup.remove();
      });

      el.addEventListener('click', () => {
        if (onLocationClick) {
          onLocationClick(location);
        }
      });

      markers.current.push(marker);
    });

    // Fit bounds to show all markers
    if (locations.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((l) => bounds.extend([l.longitude, l.latitude]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    } else if (locations.length === 1) {
      map.current.flyTo({
        center: [locations[0].longitude, locations[0].latitude],
        zoom: 14,
      });
    }
  }, [locations, mapLoaded, onLocationClick]);

  if (!accessToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
        <p className="text-gray-500">Mapbox access token not configured</p>
      </div>
    );
  }

  return (
    <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />
  );
}
