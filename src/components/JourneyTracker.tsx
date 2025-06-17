
import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Bell, BellRing, Navigation } from 'lucide-react';
import { Journey, Location, AlertType } from '@/types';
import { calculateDistance, formatDistance, estimateArrivalTime } from '@/utils/geolocation';
import GlassCard from './GlassCard';
import GlassButton from './GlassButton';
import ProgressRing from './ProgressRing';

interface JourneyTrackerProps {
  journey: Journey;
  currentLocation: Location | null;
  onStopJourney: () => void;
  onPauseJourney: () => void;
  onResumeJourney: () => void;
  onEmergencyStop: () => void;
  className?: string;
}

const JourneyTracker: React.FC<JourneyTrackerProps> = ({
  journey,
  currentLocation,
  onStopJourney,
  onPauseJourney,
  onResumeJourney,
  onEmergencyStop,
  className = ''
}) => {
  const [distance, setDistance] = useState<number>(0);
  const [estimatedArrival, setEstimatedArrival] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [shouldAlert, setShouldAlert] = useState<AlertType | null>(null);

  useEffect(() => {
    if (!currentLocation) return;

    const distanceToDestination = calculateDistance(
      currentLocation,
      journey.destination.location
    );

    setDistance(distanceToDestination);

    const arrival = estimateArrivalTime(distanceToDestination, journey.transportMode);
    setEstimatedArrival(arrival);

    // Calculate progress based on original distance
    if (journey.startLocation) {
      const totalDistance = calculateDistance(
        journey.startLocation,
        journey.destination.location
      );
      const traveledDistance = totalDistance - distanceToDestination;
      const progressPercent = Math.max(0, Math.min(100, (traveledDistance / totalDistance) * 100));
      setProgress(progressPercent);
    }

    // Determine alert level
    if (distanceToDestination <= 200) {
      setShouldAlert('final_warning');
    } else if (distanceToDestination <= 1000) {
      setShouldAlert('approaching');
    } else if (arrival <= 600000) { // 10 minutes
      setShouldAlert('first_warning');
    } else {
      setShouldAlert(null);
    }
  }, [currentLocation, journey]);

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    if (minutes < 1) return 'arriving now';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  const getAlertConfig = (alertType: AlertType | null) => {
    switch (alertType) {
      case 'final_warning':
        return {
          color: '#FF4444',
          text: 'Get Ready!',
          description: 'Very close to destination',
          icon: BellRing,
          glowing: true
        };
      case 'approaching':
        return {
          color: '#FF9500',
          text: 'Approaching',
          description: 'Less than 1km away',
          icon: Bell,
          glowing: true
        };
      case 'first_warning':
        return {
          color: '#39FF14',
          text: 'Alert',
          description: 'Arriving in ~10 minutes',
          icon: Bell,
          glowing: false
        };
      default:
        return {
          color: '#00D4FF',
          text: 'Tracking',
          description: 'Journey in progress',
          icon: Navigation,
          glowing: false
        };
    }
  };

  const alertConfig = getAlertConfig(shouldAlert);
  const AlertIcon = alertConfig.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Progress Card */}
      <GlassCard className="p-6 text-center" glowColor={alertConfig.color}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <ProgressRing
              progress={progress}
              size={140}
              color={alertConfig.color}
              text={alertConfig.text}
            />
            {alertConfig.glowing && (
              <div 
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  boxShadow: `0 0 30px ${alertConfig.color}60`,
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {journey.destination.name}
            </h2>
            <p className="text-gray-400 text-sm">
              {alertConfig.description}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Journey Stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-electric-500/20 rounded-lg">
              <MapPin size={20} className="text-electric-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {formatDistance(distance)}
              </div>
              <div className="text-xs text-gray-400">remaining</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-500/20 rounded-lg">
              <Clock size={20} className="text-neon-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-white">
                {formatTime(estimatedArrival)}
              </div>
              <div className="text-xs text-gray-400">estimated</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Alert Banner */}
      {shouldAlert && (
        <GlassCard 
          className="p-4 border-2 animate-pulse" 
          style={{ 
            borderColor: alertConfig.color,
            backgroundColor: `${alertConfig.color}10` 
          }}
        >
          <div className="flex items-center gap-3">
            <AlertIcon 
              size={24} 
              className="animate-bounce"
              style={{ color: alertConfig.color }}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-white">
                {alertConfig.text}
              </h3>
              <p className="text-sm text-gray-300">
                {distance <= 200 
                  ? 'Prepare to exit at the next stop'
                  : distance <= 1000
                  ? 'Start preparing to exit'
                  : 'Journey alert activated'
                }
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-4">
        {journey.status === 'paused' ? (
          <GlassButton 
            variant="success" 
            onClick={onResumeJourney}
            className="py-4"
          >
            Resume Journey
          </GlassButton>
        ) : (
          <GlassButton 
            variant="secondary" 
            onClick={onPauseJourney}
            className="py-4"
          >
            Pause Tracking
          </GlassButton>
        )}
        
        <GlassButton 
          variant="danger" 
          onClick={onStopJourney}
          className="py-4"
        >
          Stop Journey
        </GlassButton>
      </div>

      {/* Emergency Button */}
      <GlassButton 
        variant="danger" 
        onClick={onEmergencyStop}
        className="w-full py-4 font-bold"
        glowing
      >
        🚨 Emergency Stop
      </GlassButton>
    </div>
  );
};

export default JourneyTracker;
