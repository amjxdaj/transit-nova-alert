import { Location, TrackingMode } from '@/types';
import { backgroundLocationService } from '@/services/backgroundLocationService';
import { Capacitor } from '@capacitor/core';

export class GeolocationManager {
  private watchId: number | null = null;
  private lastPosition: Location | null = null;
  private trackingMode: TrackingMode = 'minimal';
  private callbacks: Set<(position: Location) => void> = new Set();
  private errorCallbacks: Set<(error: GeolocationPositionError) => void> = new Set();
  private isBackgroundMode: boolean = false;
  private trackingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.checkPermission();
    this.initializeBackgroundService();
  }

  private async initializeBackgroundService(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      const initialized = await backgroundLocationService.initialize();
      if (initialized) {
        console.log('Background location service initialized');
        
        // Listen to background location updates
        backgroundLocationService.onLocationUpdate((location) => {
          this.lastPosition = location;
          this.callbacks.forEach(callback => callback(location));
        });
      }
    }
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

  async enableBackgroundTracking(destination: Location, transportMode: string): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Background tracking only available on native platforms');
      return false;
    }

    try {
      const distance = calculateDistance(this.lastPosition || { lat: 0, lng: 0 }, destination);
      const estimatedTime = estimateArrivalTime(distance, transportMode);

      await backgroundLocationService.startSmartTracking({
        destinationLocation: destination,
        estimatedTotalTime: estimatedTime,
        transportMode
      });

      this.isBackgroundMode = true;
      console.log('Background tracking enabled');
      return true;
    } catch (error) {
      console.error('Failed to enable background tracking:', error);
      return false;
    }
  }

  async disableBackgroundTracking(): Promise<void> {
    if (this.isBackgroundMode) {
      await backgroundLocationService.stopTracking();
      this.isBackgroundMode = false;
      console.log('Background tracking disabled');
    }
  }

  setTrackingMode(mode: TrackingMode): void {
    this.trackingMode = mode;
    if (this.watchId !== null && !this.isBackgroundMode) {
      this.stopTracking();
      this.startTracking();
    }
  }

  private getTrackingOptions(): PositionOptions {
    const baseOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 30000, // Reduced from 60000 for more frequent updates
      timeout: 15000
    };

    switch (this.trackingMode) {
      case 'minimal':
        return {
          ...baseOptions,
          enableHighAccuracy: false,
          maximumAge: 120000, // Reduced from 300000
          timeout: 30000
        };
      case 'active':
        return {
          ...baseOptions,
          maximumAge: 30000, // Reduced from 60000
          timeout: 15000
        };
      case 'precision':
        return {
          ...baseOptions,
          enableHighAccuracy: true,
          maximumAge: 10000, // Reduced from 15000
          timeout: 8000
        };
      default:
        return baseOptions;
    }
  }

  startTracking(): void {
    console.log('Starting location tracking with mode:', this.trackingMode);
    
    // If background mode is active, don't start web-based tracking
    if (this.isBackgroundMode) {
      console.log('Background tracking is active, skipping web tracking');
      return;
    }

    if (this.watchId !== null) {
      this.stopTracking();
    }

    const options = this.getTrackingOptions();
    
    // Start watchPosition for continuous tracking
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        console.log('Location updated:', location);
        this.lastPosition = location;
        this.callbacks.forEach(callback => callback(location));
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.errorCallbacks.forEach(callback => callback(error));
      },
      options
    );

    // Also start a backup interval for active tracking
    if (this.trackingMode === 'active' || this.trackingMode === 'precision') {
      this.startTrackingInterval();
    }
  }

  private startTrackingInterval(): void {
    const intervalTime = this.trackingMode === 'precision' ? 15000 : 30000; // 15s for precision, 30s for active
    
    this.trackingInterval = setInterval(() => {
      console.log('Interval location check...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          
          // Only update if location changed significantly
          if (!this.lastPosition || 
              Math.abs(location.lat - this.lastPosition.lat) > 0.0001 ||
              Math.abs(location.lng - this.lastPosition.lng) > 0.0001) {
            console.log('Interval location updated:', location);
            this.lastPosition = location;
            this.callbacks.forEach(callback => callback(location));
          }
        },
        (error) => {
          console.warn('Interval location error:', error);
        },
        this.getTrackingOptions()
      );
    }, intervalTime);
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.trackingInterval !== null) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    console.log('Location tracking stopped');
  }

  async getCurrentPosition(): Promise<Location> {
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
    return this.watchId !== null || this.isBackgroundMode;
  }

  getTrackingMode(): TrackingMode {
    return this.isBackgroundMode 
      ? backgroundLocationService.getTrackingMode() 
      : this.trackingMode;
  }

  isBackgroundTrackingActive(): boolean {
    return this.isBackgroundMode;
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
