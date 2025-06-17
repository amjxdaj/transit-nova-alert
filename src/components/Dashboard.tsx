
import React from 'react';
import { MapPin, Clock, Zap, TrendingUp } from 'lucide-react';
import { Journey, TravelStats, TransportMode } from '@/types';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';
import ProgressRing from './ProgressRing';

interface DashboardProps {
  currentJourney: Journey | null;
  travelStats: TravelStats;
  onStartNewJourney: () => void;
  onResumeJourney?: () => void;
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  currentJourney,
  travelStats,
  onStartNewJourney,
  onResumeJourney,
  className = ''
}) => {
  const formatStats = (stats: TravelStats) => {
    const totalDistance = (stats.totalDistance / 1000).toFixed(1);
    const totalTime = Math.floor(stats.totalTime / (1000 * 60 * 60));
    const avgAccuracy = stats.averageAccuracy.toFixed(0);
    
    return { totalDistance, totalTime, avgAccuracy };
  };

  const getMostUsedTransport = (usage: Record<TransportMode, number>): TransportMode => {
    return Object.entries(usage).reduce((a, b) => 
      usage[a[0] as TransportMode] > usage[b[0] as TransportMode] ? a : b
    )[0] as TransportMode;
  };

  const getTransportIcon = (mode: TransportMode): string => {
    const icons = {
      bus: '🚌',
      train: '🚆',
      car: '🚗',
      walk: '🚶'
    };
    return icons[mode];
  };

  const { totalDistance, totalTime, avgAccuracy } = formatStats(travelStats);
  const mostUsedTransport = getMostUsedTransport(travelStats.transportModeUsage);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gradient">
          Smart Transit
        </h1>
        <p className="text-gray-400">
          Your intelligent commute companion
        </p>
      </div>

      {/* Current Journey Status */}
      {currentJourney ? (
        <GlassCard className="p-6" glowColor="#00D4FF">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Current Journey</h2>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentJourney.status === 'tracking' ? 'bg-neon-500/20 text-neon-400' :
              currentJourney.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-electric-500/20 text-electric-400'
            }`}>
              {currentJourney.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-electric-400" />
              <div>
                <div className="text-white font-medium">{currentJourney.destination.name}</div>
                <div className="text-gray-400 text-sm">{currentJourney.destination.address}</div>
              </div>
            </div>

            {currentJourney.status === 'paused' && onResumeJourney && (
              <GlassButton 
                variant="success" 
                onClick={onResumeJourney}
                className="w-full"
              >
                Resume Journey
              </GlassButton>
            )}
          </div>
        </GlassCard>
      ) : (
        /* Quick Start */
        <GlassCard className="p-6 text-center" hoverable>
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-electric-500 to-purple-500 rounded-full flex items-center justify-center">
              <MapPin size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">Ready to Travel?</h2>
              <p className="text-gray-400 text-sm mb-4">
                Start tracking your journey with intelligent alerts
              </p>
            </div>
            <GlassButton 
              variant="primary" 
              onClick={onStartNewJourney}
              size="lg"
              glowing
              className="w-full"
            >
              Start New Journey
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-electric-500/20 rounded-lg">
              <TrendingUp size={20} className="text-electric-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {travelStats.totalJourneys}
              </div>
              <div className="text-xs text-gray-400">total trips</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-500/20 rounded-lg">
              <MapPin size={20} className="text-neon-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-white">
                {totalDistance}km
              </div>
              <div className="text-xs text-gray-400">traveled</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Travel Insights */}
      <GlassCard className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Travel Insights</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-1">
              {getTransportIcon(mostUsedTransport)}
            </div>
            <div className="text-sm text-gray-400">Preferred Mode</div>
            <div className="text-white font-medium capitalize">
              {mostUsedTransport}
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-sm text-gray-400">Avg Accuracy</div>
            <div className="text-white font-medium">
              {avgAccuracy}%
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Battery Status */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Zap size={20} className="text-purple-400" />
            </div>
            <div>
              <div className="text-white font-medium">Battery Optimized</div>
              <div className="text-gray-400 text-sm">Smart tracking enabled</div>
            </div>
          </div>
          <div className="text-neon-400 text-sm font-medium">
            Active
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default Dashboard;
