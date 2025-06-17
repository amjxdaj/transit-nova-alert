
export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  location: Location;
  placeId?: string;
  isFavorite?: boolean;
  lastUsed?: number;
}

export interface Journey {
  id: string;
  destination: Destination;
  startTime: number;
  endTime?: number;
  transportMode: TransportMode;
  status: JourneyStatus;
  startLocation?: Location;
  currentLocation?: Location;
  route?: Route;
  alerts: Alert[];
  distance?: number;
  estimatedArrival?: number;
  actualArrival?: number;
}

export interface Route {
  points: Location[];
  distance: number;
  duration: number;
  polyline?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: number;
  distance?: number;
  acknowledged?: boolean;
}

export type TransportMode = 'bus' | 'train' | 'car' | 'walk';

export type JourneyStatus = 'idle' | 'starting' | 'tracking' | 'approaching' | 'arrived' | 'paused' | 'stopped';

export type AlertType = 'first_warning' | 'approaching' | 'final_warning' | 'arrived' | 'emergency';

export type TrackingMode = 'minimal' | 'active' | 'precision';

export interface UserPreferences {
  defaultTransportMode: TransportMode;
  alertDistances: {
    first: number; // 10 minutes / distance equivalent
    approaching: number; // 1km
    final: number; // 200m
  };
  notifications: {
    sound: boolean;
    vibration: boolean;
    visual: boolean;
  };
  tracking: {
    batteryOptimization: boolean;
    backgroundLocation: boolean;
  };
  appearance: {
    theme: 'dark' | 'light' | 'auto';
    animations: boolean;
    particles: boolean;
  };
}

export interface GeolocationState {
  position: Location | null;
  error: string | null;
  isLoading: boolean;
  permission: PermissionState;
  accuracy: number;
  watchId: number | null;
}

export interface AppState {
  currentJourney: Journey | null;
  journeyHistory: Journey[];
  destinations: Destination[];
  preferences: UserPreferences;
  geolocation: GeolocationState;
  isOnline: boolean;
  appVersion: string;
}

export interface GoogleMapsConfig {
  apiKey: string;
  libraries: string[];
  region: string;
  language: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
}

export interface TravelStats {
  totalJourneys: number;
  totalDistance: number;
  totalTime: number;
  averageAccuracy: number;
  transportModeUsage: Record<TransportMode, number>;
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
}

export interface WeeklyStats {
  week: string;
  journeys: number;
  distance: number;
  time: number;
}

export interface MonthlyStats {
  month: string;
  journeys: number;
  distance: number;
  time: number;
}

export interface WeatherInfo {
  condition: string;
  temperature: number;
  visibility: number;
  humidity: number;
  icon: string;
}
