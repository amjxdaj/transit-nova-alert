
import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Clock, Star } from 'lucide-react';
import { Destination } from '@/types';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';

interface DestinationInputProps {
  onDestinationSelect: (destination: Destination) => void;
  recentDestinations: Destination[];
  favoriteDestinations: Destination[];
  className?: string;
}

const DestinationInput: React.FC<DestinationInputProps> = ({
  onDestinationSelect,
  recentDestinations,
  favoriteDestinations,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Mock search function - in real app, this would use Google Places API
  const searchPlaces = async (query: string): Promise<Destination[]> => {
    if (query.length < 2) return [];

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Mock results
    const mockResults: Destination[] = [
      {
        id: '1',
        name: 'Central Station',
        address: '123 Main St, Downtown',
        location: { lat: 40.7128, lng: -74.0060 },
        placeId: 'place_1'
      },
      {
        id: '2',
        name: 'Shopping Mall',
        address: '456 Commerce Ave, Midtown',
        location: { lat: 40.7589, lng: -73.9851 },
        placeId: 'place_2'
      },
      {
        id: '3',
        name: 'University Campus',
        address: '789 Education Blvd, University District',
        location: { lat: 40.7831, lng: -73.9712 },
        placeId: 'place_3'
      }
    ].filter(place => 
      place.name.toLowerCase().includes(query.toLowerCase()) ||
      place.address.toLowerCase().includes(query.toLowerCase())
    );

    return mockResults;
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length >= 2) {
      setIsLoading(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchPlaces(value);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }
  };

  const handleDestinationClick = (destination: Destination) => {
    onDestinationSelect(destination);
    setSearchQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const renderDestinationItem = (destination: Destination, type: 'search' | 'recent' | 'favorite') => {
    const icon = type === 'favorite' ? Star : type === 'recent' ? Clock : MapPin;
    const Icon = icon;

    return (
      <div
        key={destination.id}
        onClick={() => handleDestinationClick(destination)}
        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/10 group"
      >
        <div className={`p-2 rounded-lg ${
          type === 'favorite' ? 'bg-neon-500/20 text-neon-400' :
          type === 'recent' ? 'bg-electric-500/20 text-electric-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>
          <Icon size={16} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm truncate group-hover:text-electric-300 transition-colors">
            {destination.name}
          </h4>
          <p className="text-gray-400 text-xs truncate">
            {destination.address}
          </p>
        </div>

        {type === 'favorite' && (
          <Star size={14} className="text-neon-400 fill-current" />
        )}
      </div>
    );
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <GlassCard className="p-4 mb-4">
        <div className="relative">
          <Search 
            size={20} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Where are you going?"
            className="w-full pl-12 pr-4 py-3 bg-transparent border-none outline-none text-white placeholder-gray-400 text-lg"
            onFocus={() => setShowSuggestions(searchQuery.length >= 2)}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-electric-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </GlassCard>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <GlassCard className="mb-4 max-h-60 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-gray-400 text-xs uppercase tracking-wide font-semibold px-3 py-2">
              Search Results
            </h3>
            {suggestions.map(destination => renderDestinationItem(destination, 'search'))}
          </div>
        </GlassCard>
      )}

      {/* Favorite Destinations */}
      {favoriteDestinations.length > 0 && !showSuggestions && (
        <GlassCard className="mb-4">
          <div className="p-2">
            <h3 className="text-gray-400 text-xs uppercase tracking-wide font-semibold px-3 py-2 flex items-center gap-2">
              <Star size={12} />
              Favorites
            </h3>
            {favoriteDestinations.slice(0, 3).map(destination => 
              renderDestinationItem(destination, 'favorite')
            )}
          </div>
        </GlassCard>
      )}

      {/* Recent Destinations */}
      {recentDestinations.length > 0 && !showSuggestions && (
        <GlassCard>
          <div className="p-2">
            <h3 className="text-gray-400 text-xs uppercase tracking-wide font-semibold px-3 py-2 flex items-center gap-2">
              <Clock size={12} />
              Recent
            </h3>
            {recentDestinations.slice(0, 5).map(destination => 
              renderDestinationItem(destination, 'recent')
            )}
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!showSuggestions && favoriteDestinations.length === 0 && recentDestinations.length === 0 && (
        <GlassCard className="p-8 text-center">
          <MapPin size={48} className="mx-auto mb-4 text-gray-600" />
          <h3 className="text-white font-medium mb-2">No destinations yet</h3>
          <p className="text-gray-400 text-sm">
            Start typing to search for your destination
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default DestinationInput;
