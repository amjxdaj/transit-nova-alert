
import { Destination, Location } from '@/types';

export interface NominatimPlace {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  type: string;
  importance: number;
  icon?: string;
}

class NominatimService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private cache = new Map<string, Destination[]>();
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests

  private async makeRequest(query: string): Promise<NominatimPlace[]> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const url = `${this.baseUrl}/search?` + new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '10',
      extratags: '1',
      namedetails: '1'
    });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SmartTransitApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    return response.json();
  }

  async searchPlaces(query: string, userLocation?: Location): Promise<Destination[]> {
    if (query.length < 2) return [];

    // Check cache first
    const cacheKey = query.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const places = await this.makeRequest(query);
      
      const destinations: Destination[] = places.map(place => ({
        id: `nominatim_${place.place_id}`,
        name: this.extractPlaceName(place),
        address: this.formatAddress(place),
        location: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        },
        placeId: place.place_id.toString()
      }));

      // Sort by relevance/importance
      destinations.sort((a, b) => {
        const placeA = places.find(p => p.place_id.toString() === a.placeId);
        const placeB = places.find(p => p.place_id.toString() === b.placeId);
        return (placeB?.importance || 0) - (placeA?.importance || 0);
      });

      // Cache results
      this.cache.set(cacheKey, destinations);

      return destinations;
    } catch (error) {
      console.error('Nominatim search error:', error);
      return [];
    }
  }

  private extractPlaceName(place: NominatimPlace): string {
    // Try to get a meaningful name from the place
    const address = place.address;
    
    if (address.house_number && address.road) {
      return `${address.house_number} ${address.road}`;
    }
    
    if (address.road) {
      return address.road;
    }
    
    if (address.suburb) {
      return address.suburb;
    }
    
    if (address.city) {
      return address.city;
    }
    
    // Fall back to the display name, but make it shorter
    const parts = place.display_name.split(',');
    return parts[0].trim();
  }

  private formatAddress(place: NominatimPlace): string {
    const address = place.address;
    const parts: string[] = [];
    
    if (address.road && !this.extractPlaceName(place).includes(address.road)) {
      parts.push(address.road);
    }
    
    if (address.suburb && address.suburb !== address.city) {
      parts.push(address.suburb);
    }
    
    if (address.city) {
      parts.push(address.city);
    }
    
    if (address.state) {
      parts.push(address.state);
    }
    
    return parts.join(', ') || place.display_name;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const nominatimService = new NominatimService();
