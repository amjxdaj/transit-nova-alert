
import { Location, TrackingMode } from '@/types';

export class GeolocationManager {
  private watchId: number | null = null;
  private lastPosition: Location | null = null;
  private trackingMode: TrackingMode = 'minimal';
  private callbacks: Set<(position: Location) => void> = new Set();
  private errorCallbacks: Set<(error: GeolocationPositionError) => void> = new Set();

  constructor() {
    this.checkPermission();
  }

  async checkPermission(): Promise<PermissionState> {
    if (!navigator.permissions) {
      return 'granted'; // Fallback for older browsers
    }
    
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      console.warn('Permission API not supported:', error);
      return 'granted';
    }
  }

  async requestPermission(): Promise<boolean> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.lastPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(true);
        },
        (error) => {
          console.error('Geolocation permission denied:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  setTrackingMode(mode: TrackingMode): void {
    this.trackingMode = mode;
    if (this.watchId !== null) {
      this.stopTracking();
      this.startTracking();
    }
  }

  private getTrackingOptions(): PositionOptions {
    const baseOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 60000,
      timeout: 15000
    };

    switch (this.trackingMode) {
      case 'minimal':
        return {
          ...baseOptions,
          enableHighAccuracy: false,
          maximumAge: 300000, // 5 minutes
          timeout: 30000
        };
      case 'active':
        return {
          ...baseOptions,
          maximumAge: 60000, // 1 minute
          timeout: 20000
        };
      case 'precision':
        return {
          ...baseOptions,
          enableHighAccuracy: true,
          maximumAge: 15000, // 15 seconds
          timeout: 10000
        };
      default:
        return baseOptions;
    }
  }

  startTracking(): void {
    if (this.watchId !== null) {
      this.stopTracking();
    }

    const options = this.getTrackingOptions();
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        this.lastPosition = location;
        this.callbacks.forEach(callback => callback(location));
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.errorCallbacks.forEach(callback => callback(error));
      },
      options
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getCurrentPosition(): Promise<Location> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(location);
        },
        reject,
        this.getTrackingOptions()
      );
    });
  }

  onPositionUpdate(callback: (position: Location) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  onError(callback: (error: GeolocationPositionError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  getLastPosition(): Location | null {
    return this.lastPosition;
  }

  isTracking(): boolean {
    return this.watchId !== null;
  }

  getTrackingMode(): TrackingMode {
    return this.trackingMode;
  }
}

export const calculateDistance = (point1: Location, point2: Location): number => {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
};

export const estimateArrivalTime = (
  distance: number,
  transportMode: string
): number => {
  // Average speeds in km/h
  const speeds = {
    walk: 5,
    bus: 25,
    train: 40,
    car: 30
  };

  const speed = speeds[transportMode as keyof typeof speeds] || 25;
  const timeInHours = (distance / 1000) / speed;
  return timeInHours * 60 * 60 * 1000; // Convert to milliseconds
};

export default GeolocationManager;
