
import React from 'react';
import { Bus, Train, Car, MapPin } from 'lucide-react';
import { TransportMode } from '@/types';
import GlassCard from './GlassCard';

interface TransportModeSelectorProps {
  selectedMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  className?: string;
}

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  className = ''
}) => {
  const modes: { key: TransportMode; icon: React.ComponentType; label: string; color: string }[] = [
    { key: 'bus', icon: Bus, label: 'Bus', color: '#00D4FF' },
    { key: 'train', icon: Train, label: 'Train', color: '#39FF14' },
    { key: 'car', icon: Car, label: 'Car', color: '#8B5CF6' },
    { key: 'walk', icon: MapPin, label: 'Walk', color: '#FF6B6B' },
  ];

  return (
    <div className={`grid grid-cols-4 gap-3 ${className}`}>
      {modes.map(({ key, icon: Icon, label, color }) => {
        const isSelected = selectedMode === key;
        
        return (
          <GlassCard
            key={key}
            hoverable
            glowColor={color}
            className={`
              p-4 text-center cursor-pointer transition-all duration-300
              ${isSelected 
                ? 'bg-white/15 border-white/30 transform scale-105' 
                : 'bg-white/5 hover:bg-white/10'
              }
            `}
            onClick={() => onModeChange(key)}
          >
            <div className="flex flex-col items-center gap-2">
              <Icon 
                size={24} 
                className={`${isSelected ? 'text-white' : 'text-gray-400'} transition-colors`}
                style={{
                  filter: isSelected ? `drop-shadow(0 0 10px ${color}80)` : 'none',
                  color: isSelected ? color : undefined,
                }}
              />
              <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            
            {isSelected && (
              <div 
                className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${color}40 0%, transparent 70%)`,
                }}
              />
            )}
          </GlassCard>
        );
      })}
    </div>
  );
};

export default TransportModeSelector;
