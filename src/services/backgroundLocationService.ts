import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Location, TrackingMode } from '@/types';
import { calculateDistance, estimateArrivalTime } from '@/utils/geolocation';

// Dynamic imports for community plugins to avoid build errors in web
let BackgroundMode: any = null;
let KeepAwake: any = null;

// Initialize plugins only on native platforms
const initializePlugins = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { BackgroundMode: BgMode } = await import('@capacitor-community/background-mode');
      const { KeepAwake: KA } = await import('@capacitor-community/keep-awake');
      BackgroundMode = BgMode;
      KeepAwake = KA;
    } catch (error) {
      console.warn('Background plugins not available:', error);
    }
  }
};

export interface SmartTrackingConfig {
  destinationLocation: Location;
  estimatedTotalTime: number; // in milliseconds
  transportMode: string;
}

export class BackgroundLocationService {
  private watchId: string | null = null;
  private isBackgroundEnabled = false;
  private config: SmartTrackingConfig | null = null;
  private lastKnownLocation: Location | null = null;
  private trackingStartTime: number = 0;
  private currentTrackingMode: TrackingMode = 'minimal';
  private callbacks: Set<(location: Location) => void> = new Set();
  private pluginsInitialized = false;

  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Background location requires native platform');
      return false;
    }

    try {
      // Initialize plugins
      if (!this.pluginsInitialized) {
        await initializePlugins();
        this.pluginsInitialized = true;
      }

      // Request permissions
      await this.requestPermissions();
      
      // Setup background mode if available
      if (BackgroundMode) {
        await BackgroundMode.enable();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize background location service:', error);
      return false;
    }
  }

  private async requestPermissions(): Promise<void> {
    // Request location permissions
    const locationPermission = await Geolocation.requestPermissions();
    if (locationPermission.location !== 'granted') {
      throw new Error('Location permission required');
    }

    // Request notification permissions
    const notificationPermission = await LocalNotifications.requestPermissions();
    if (notificationPermission.display !== 'granted') {
      console.warn('Notification permission not granted');
    }
  }

  async startSmartTracking(config: SmartTrackingConfig): Promise<void> {
    this.config = config;
    this.trackingStartTime = Date.now();
    
    // Initialize plugins if not done
    if (!this.pluginsInitialized) {
      await initializePlugins();
      this.pluginsInitialized = true;
    }
    
    // Enable background mode and keep awake if available
    try {
      if (BackgroundMode) {
        await BackgroundMode.enable();
      }
      if (KeepAwake) {
        await KeepAwake.keepAwake();
      }
    } catch (error) {
      console.warn('Failed to enable background mode:', error);
    }
    
    // Start with initial location
    await this.getCurrentLocationAndTrack();
    
    // Setup smart tracking algorithm
    this.setupSmartTrackingAlgorithm();
  }

  private async getCurrentLocationAndTrack(): Promise<void> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: this.currentTrackingMode === 'precision',
        timeout: 15000,
        maximumAge: this.getMaxAge()
      });

      const location: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      this.lastKnownLocation = location;
      this.notifyLocationUpdate(location);

    } catch (error) {
      console.error('Failed to get current position:', error);
    }
  }

  private setupSmartTrackingAlgorithm(): void {
    if (!this.config) return;

    const checkAndUpdateTracking = () => {
      if (!this.config || !this.lastKnownLocation) return;

      const elapsedTime = Date.now() - this.trackingStartTime;
      const distance = calculateDistance(this.lastKnownLocation, this.config.destinationLocation);
      const estimatedTimeRemaining = estimateArrivalTime(distance, this.config.transportMode);

      console.log(`Smart tracking check: ${distance}m remaining, ${estimatedTimeRemaining}ms estimated`);

      // Determine tracking mode based on time remaining and distance
      let newMode: TrackingMode = 'minimal';
      let nextCheckInterval = 1800000; // 30 minutes default

      if (estimatedTimeRemaining <= 300000) { // 5 minutes or less
        newMode = 'precision';
        nextCheckInterval = 30000; // Check every 30 seconds
      } else if (estimatedTimeRemaining <= 900000) { // 15 minutes or less
        newMode = 'active';
        nextCheckInterval = 120000; // Check every 2 minutes
      } else if (estimatedTimeRemaining <= 1800000) { // 30 minutes or less
        newMode = 'active';
        nextCheckInterval = 300000; // Check every 5 minutes
      } else {
        // Far from destination - use minimal tracking
        nextCheckInterval = Math.min(1800000, estimatedTimeRemaining / 4); // Check at 25% intervals
      }

      // Update tracking mode if changed
      if (newMode !== this.currentTrackingMode) {
        this.currentTrackingMode = newMode;
        console.log(`Switching to ${newMode} tracking mode`);
        this.restartLocationTracking();
      } else {
        // Just get current location
        this.getCurrentLocationAndTrack();
      }

      // Schedule next check
      setTimeout(checkAndUpdateTracking, nextCheckInterval);
    };

    // Start the algorithm
    checkAndUpdateTracking();
  }

  private async restartLocationTracking(): Promise<void> {
    // Stop current tracking
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }

    // Start new tracking with updated settings
    try {
      const watchId = await Geolocation.watchPosition({
        enableHighAccuracy: this.currentTrackingMode === 'precision',
        timeout: this.getTimeout(),
        maximumAge: this.getMaxAge()
      }, (position, err) => {
        if (err) {
          console.error('Location watch error:', err);
          return;
        }

        if (position) {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          this.lastKnownLocation = location;
          this.notifyLocationUpdate(location);
        }
      });

      this.watchId = watchId;
    } catch (error) {
      console.error('Failed to restart location tracking:', error);
    }
  }

  private getTimeout(): number {
    switch (this.currentTrackingMode) {
      case 'precision': return 10000;
      case 'active': return 20000;
      case 'minimal': return 30000;
      default: return 15000;
    }
  }

  private getMaxAge(): number {
    switch (this.currentTrackingMode) {
      case 'precision': return 15000; // 15 seconds
      case 'active': return 60000; // 1 minute
      case 'minimal': return 300000; // 5 minutes
      default: return 60000;
    }
  }

  async stopTracking(): Promise<void> {
    if (this.watchId) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = null;
    }

    // Disable background mode and allow sleep if available
    try {
      if (BackgroundMode) {
        await BackgroundMode.disable();
      }
      if (KeepAwake) {
        await KeepAwake.allowSleep();
      }
    } catch (error) {
      console.warn('Failed to disable background mode:', error);
    }

    this.config = null;
    this.currentTrackingMode = 'minimal';
    console.log('Background tracking stopped');
  }

  onLocationUpdate(callback: (location: Location) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyLocationUpdate(location: Location): void {
    this.callbacks.forEach(callback => callback(location));
  }

  async sendBackgroundNotification(title: string, body: string): Promise<void> {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          attachments: undefined,
          actionTypeId: '',
          extra: null
        }]
      });
    } catch (error) {
      console.error('Failed to send background notification:', error);
    }
  }

  getTrackingMode(): TrackingMode {
    return this.currentTrackingMode;
  }

  getLastKnownLocation(): Location | null {
    return this.lastKnownLocation;
  }

  isTracking(): boolean {
    return this.watchId !== null;
  }
}

export const backgroundLocationService = new BackgroundLocationService();
