
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '@/types';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  currentLocation?: Location | null;
  destination?: Location | null;
  route?: Location[];
  className?: string;
  height?: string;
}

const MapView: React.FC<MapViewProps> = ({
  currentLocation,
  destination,
  route,
  className = '',
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ current?: L.Marker; destination?: L.Marker }>({});
  const routeRef = useRef<L.Polyline | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const lastLocationRef = useRef<Location | null>(null);
  const lastDestinationRef = useRef<Location | null>(null);
  const boundsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const initMap = () => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, {
          center: [51.505, -0.09], // Default to London
          zoom: 13,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          className: 'map-tiles'
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsMapReady(true);

        map.whenReady(() => {
          console.log('Map is ready');
        });
      };

      setTimeout(initMap, 100);

    } catch (error) {
      console.error('Failed to initialize map:', error);
    }

    return () => {
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          setIsMapReady(false);
        } catch (error) {
          console.error('Error cleaning up map:', error);
        }
      }
    };
  }, []);

  // Apply dark theme styles once
  useEffect(() => {
    if (!isMapReady) return;

    const style = document.createElement('style');
    style.id = 'map-dark-theme';
    style.textContent = `
      .map-tiles {
        filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
      }
      .leaflet-control-container {
        filter: invert(100%) hue-rotate(180deg);
      }
      .leaflet-popup-content-wrapper {
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
      }
      .leaflet-popup-content {
        color: white;
        margin: 12px;
      }
      .leaflet-popup-tip {
        background: rgba(0, 0, 0, 0.8);
      }
    `;
    
    if (!document.getElementById('map-dark-theme')) {
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.getElementById('map-dark-theme');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, [isMapReady]);

  // Update current location marker (only if location changed significantly)
  useEffect(() => {
    if (!mapInstanceRef.current || !currentLocation || !isMapReady) return;

    // Check if location changed significantly (more than 10 meters)
    if (lastLocationRef.current) {
      const distance = Math.sqrt(
        Math.pow(currentLocation.lat - lastLocationRef.current.lat, 2) +
        Math.pow(currentLocation.lng - lastLocationRef.current.lng, 2)
      ) * 111000; // Rough conversion to meters

      if (distance < 10) return; // Don't update for small changes
    }

    const map = mapInstanceRef.current;

    try {
      // Remove existing current location marker
      if (markersRef.current.current) {
        map.removeLayer(markersRef.current.current);
      }

      // Create custom current location icon
      const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #00D4FF; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 0 20px #00D4FF80;
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      // Add current location marker
      const currentMarker = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: currentLocationIcon
      }).addTo(map);
      
      currentMarker.bindPopup('Your Current Location');
      markersRef.current.current = currentMarker;

      // Only center map if this is the first location update
      if (!lastLocationRef.current) {
        map.setView([currentLocation.lat, currentLocation.lng], 15);
      }

      lastLocationRef.current = currentLocation;
    } catch (error) {
      console.error('Error updating current location marker:', error);
    }
  }, [currentLocation, isMapReady]);

  // Update destination marker (only once per destination)
  useEffect(() => {
    if (!mapInstanceRef.current || !destination || !isMapReady) return;

    // Don't update if destination hasn't changed
    if (lastDestinationRef.current && 
        lastDestinationRef.current.lat === destination.lat && 
        lastDestinationRef.current.lng === destination.lng) return;

    const map = mapInstanceRef.current;

    try {
      // Remove existing destination marker
      if (markersRef.current.destination) {
        map.removeLayer(markersRef.current.destination);
      }

      // Create custom destination icon
      const destinationIcon = L.divIcon({
        className: 'destination-marker',
        html: `
          <div style="
            width: 30px; 
            height: 30px; 
            background: #39FF14; 
            border: 3px solid white; 
            border-radius: 50% 50% 50% 0; 
            transform: rotate(-45deg);
            box-shadow: 0 0 20px #39FF1480;
          "></div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      // Add destination marker
      const destMarker = L.marker([destination.lat, destination.lng], {
        icon: destinationIcon
      }).addTo(map);
      
      destMarker.bindPopup('Your Destination');
      markersRef.current.destination = destMarker;

      // Debounce bounds update to prevent frequent map adjustments
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }

      boundsUpdateTimeoutRef.current = setTimeout(() => {
        if (currentLocation && markersRef.current.current) {
          const group = L.featureGroup([markersRef.current.current, destMarker]);
          map.fitBounds(group.getBounds().pad(0.1));
        } else {
          map.setView([destination.lat, destination.lng], 15);
        }
      }, 1000); // Wait 1 second before updating bounds

      lastDestinationRef.current = destination;
    } catch (error) {
      console.error('Error updating destination marker:', error);
    }
  }, [destination, isMapReady]);

  // Update route (only when route actually changes)
  useEffect(() => {
    if (!mapInstanceRef.current || !route || route.length < 2 || !isMapReady) return;

    const map = mapInstanceRef.current;

    try {
      // Remove existing route
      if (routeRef.current) {
        map.removeLayer(routeRef.current);
      }

      // Add route polyline
      const routeLine = L.polyline(
        route.map(point => [point.lat, point.lng]),
        {
          color: '#00D4FF',
          weight: 4,
          opacity: 0.8,
          smoothFactor: 1
        }
      ).addTo(map);

      routeRef.current = routeLine;

      // Only fit bounds to route if no current tracking is happening
      if (!currentLocation) {
        map.fitBounds(routeLine.getBounds().pad(0.1));
      }
    } catch (error) {
      console.error('Error updating route:', error);
    }
  }, [route, isMapReady]);

  return (
    <div className={className}>
      <div 
        ref={mapRef} 
        style={{ height, width: '100%' }}
        className="rounded-2xl border border-white/10 overflow-hidden shadow-lg"
      />
    </div>
  );
};

export default MapView;
