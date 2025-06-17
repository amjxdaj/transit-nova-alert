
import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map with dark theme
    const map = L.map(mapRef.current, {
      center: [51.505, -0.09], // Default to London
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    // Add dark themed OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      className: 'map-tiles'
    }).addTo(map);

    // Add custom CSS for dark theme
    const style = document.createElement('style');
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
    document.head.appendChild(style);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      document.head.removeChild(style);
    };
  }, []);

  // Update current location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !currentLocation) return;

    const map = mapInstanceRef.current;

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
          animation: pulse 2s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% { box-shadow: 0 0 20px #00D4FF80; }
            50% { box-shadow: 0 0 30px #00D4FF; }
            100% { box-shadow: 0 0 20px #00D4FF80; }
          }
        </style>
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

    // Center map on current location
    map.setView([currentLocation.lat, currentLocation.lng], 15);
  }, [currentLocation]);

  // Update destination marker
  useEffect(() => {
    if (!mapInstanceRef.current || !destination) return;

    const map = mapInstanceRef.current;

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

    // Fit map to show both markers if current location exists
    if (currentLocation) {
      const group = L.featureGroup([markersRef.current.current!, destMarker]);
      map.fitBounds(group.getBounds().pad(0.1));
    } else {
      map.setView([destination.lat, destination.lng], 15);
    }
  }, [destination, currentLocation]);

  // Update route
  useEffect(() => {
    if (!mapInstanceRef.current || !route || route.length < 2) return;

    const map = mapInstanceRef.current;

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

    // Fit map to route
    map.fitBounds(routeLine.getBounds().pad(0.1));
  }, [route]);

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
