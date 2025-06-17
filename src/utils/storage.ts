import { Journey, Destination, UserPreferences, TravelStats } from '@/types';

const STORAGE_KEYS = {
  PREFERENCES: 'smart_transit_preferences',
  DESTINATIONS: 'smart_transit_destinations',
  JOURNEY_HISTORY: 'smart_transit_journey_history',
  TRAVEL_STATS: 'smart_transit_travel_stats',
  CURRENT_JOURNEY: 'smart_transit_current_journey'
} as const;

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  defaultTransportMode: 'bus',
  alertDistances: {
    first: 600000, // 10 minutes in ms (approximate)
    approaching: 1000, // 1km in meters
    final: 200 // 200m in meters
  },
  notifications: {
    sound: true,
    vibration: true,
    visual: true
  },
  tracking: {
    batteryOptimization: true,
    backgroundLocation: true
  },
  appearance: {
    theme: 'dark',
    animations: true,
    particles: true
  }
};

export class StorageManager {
  // Preferences
  static getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }

  static savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  // Destinations
  static getDestinations(): Destination[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DESTINATIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading destinations:', error);
      return [];
    }
  }

  static saveDestinations(destinations: Destination[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DESTINATIONS, JSON.stringify(destinations));
    } catch (error) {
      console.error('Error saving destinations:', error);
    }
  }

  static addDestination(destination: Destination): void {
    const destinations = this.getDestinations();
    const existingIndex = destinations.findIndex(d => d.id === destination.id);
    
    if (existingIndex >= 0) {
      destinations[existingIndex] = { ...destination, lastUsed: Date.now() };
    } else {
      destinations.unshift({ ...destination, lastUsed: Date.now() });
    }
    
    // Keep only last 50 destinations
    this.saveDestinations(destinations.slice(0, 50));
  }

  static toggleFavoriteDestination(destinationId: string): void {
    const destinations = this.getDestinations();
    const destination = destinations.find(d => d.id === destinationId);
    
    if (destination) {
      destination.isFavorite = !destination.isFavorite;
      this.saveDestinations(destinations);
    }
  }

  // Journey History
  static getJourneyHistory(): Journey[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.JOURNEY_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading journey history:', error);
      return [];
    }
  }

  static saveJourneyHistory(journeys: Journey[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.JOURNEY_HISTORY, JSON.stringify(journeys));
    } catch (error) {
      console.error('Error saving journey history:', error);
    }
  }

  static addJourney(journey: Journey): void {
    const journeys = this.getJourneyHistory();
    journeys.unshift(journey);
    
    // Keep only last 100 journeys
    this.saveJourneyHistory(journeys.slice(0, 100));
    
    // Update travel stats
    this.updateTravelStats(journey);
  }

  // Current Journey State
  static getCurrentJourney(): Journey | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_JOURNEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading current journey:', error);
      return null;
    }
  }

  static saveCurrentJourney(journey: Journey | null): void {
    try {
      if (journey) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_JOURNEY, JSON.stringify(journey));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_JOURNEY);
      }
    } catch (error) {
      console.error('Error saving current journey:', error);
    }
  }

  // Travel Stats
  static getTravelStats(): TravelStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRAVEL_STATS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading travel stats:', error);
    }
    
    return {
      totalJourneys: 0,
      totalDistance: 0,
      totalTime: 0,
      averageAccuracy: 0,
      transportModeUsage: {
        bus: 0,
        train: 0,
        car: 0,
        walk: 0
      },
      weeklyStats: [],
      monthlyStats: []
    };
  }

  static saveTravelStats(stats: TravelStats): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRAVEL_STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving travel stats:', error);
    }
  }

  private static updateTravelStats(journey: Journey): void {
    const stats = this.getTravelStats();
    
    stats.totalJourneys += 1;
    stats.totalDistance += journey.distance || 0;
    stats.totalTime += (journey.endTime || Date.now()) - journey.startTime;
    stats.transportModeUsage[journey.transportMode] += 1;
    
    // Update weekly/monthly stats
    const now = new Date();
    const weekKey = this.getWeekKey(now);
    const monthKey = this.getMonthKey(now);
    
    // Update weekly stats
    let weekStats = stats.weeklyStats.find(w => w.week === weekKey);
    if (!weekStats) {
      weekStats = { week: weekKey, journeys: 0, distance: 0, time: 0 };
      stats.weeklyStats.push(weekStats);
    }
    weekStats.journeys += 1;
    weekStats.distance += journey.distance || 0;
    weekStats.time += (journey.endTime || Date.now()) - journey.startTime;
    
    // Update monthly stats
    let monthStats = stats.monthlyStats.find(m => m.month === monthKey);
    if (!monthStats) {
      monthStats = { month: monthKey, journeys: 0, distance: 0, time: 0 };
      stats.monthlyStats.push(monthStats);
    }
    monthStats.journeys += 1;
    monthStats.distance += journey.distance || 0;
    monthStats.time += (journey.endTime || Date.now()) - journey.startTime;
    
    // Keep only last 12 weeks and months
    stats.weeklyStats = stats.weeklyStats.slice(-12);
    stats.monthlyStats = stats.monthlyStats.slice(-12);
    
    this.saveTravelStats(stats);
  }

  private static getWeekKey(date: Date): string {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  private static getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  // Clear all data
  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Export data
  static exportData(): string {
    const data = {
      preferences: this.getPreferences(),
      destinations: this.getDestinations(),
      journeyHistory: this.getJourneyHistory(),
      travelStats: this.getTravelStats(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  // Import data
  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.preferences) this.savePreferences(data.preferences);
      if (data.destinations) this.saveDestinations(data.destinations);
      if (data.journeyHistory) this.saveJourneyHistory(data.journeyHistory);
      if (data.travelStats) this.saveTravelStats(data.travelStats);
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export default StorageManager;
