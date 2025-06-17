
import React, { useState, useEffect } from 'react';
import ParticleBackground from '@/components/ParticleBackground';
import Dashboard from '@/components/Dashboard';
import DestinationInput from '@/components/DestinationInput';
import TransportModeSelector from '@/components/TransportModeSelector';
import JourneyTracker from '@/components/JourneyTracker';
import GlassCard from '@/components/GlassCard';
import GlassButton from '@/components/GlassButton';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useJourneyManager } from '@/hooks/useJourneyManager';
import { StorageManager } from '@/utils/storage';
import { Destination, TransportMode } from '@/types';
import { ArrowLeft, Settings, MapPin } from 'lucide-react';

type AppScreen = 'dashboard' | 'destination' | 'transport' | 'tracking' | 'settings';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedTransportMode, setSelectedTransportMode] = useState<TransportMode>('bus');
  const [isLoading, setIsLoading] = useState(false);

  const {
    currentJourney,
    startJourney,
    stopJourney,
    pauseJourney,
    resumeJourney,
    emergencyStop,
    currentLocation,
    isTracking,
    error
  } = useJourneyManager();

  // Load user preferences
  useEffect(() => {
    const preferences = StorageManager.getPreferences();
    setSelectedTransportMode(preferences.defaultTransportMode);
  }, []);

  // Auto-navigate to tracking screen when journey starts
  useEffect(() => {
    if (currentJourney && (currentJourney.status === 'tracking' || currentJourney.status === 'paused')) {
      setCurrentScreen('tracking');
    } else if (!currentJourney) {
      setCurrentScreen('dashboard');
    }
  }, [currentJourney]);

  const handleStartNewJourney = () => {
    setCurrentScreen('destination');
  };

  const handleDestinationSelect = (destination: Destination) => {
    setSelectedDestination(destination);
    setCurrentScreen('transport');
  };

  const handleTransportModeConfirm = async () => {
    if (!selectedDestination) return;

    setIsLoading(true);
    try {
      await startJourney(selectedDestination, selectedTransportMode);
      setCurrentScreen('tracking');
    } catch (error) {
      console.error('Failed to start journey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackNavigation = () => {
    switch (currentScreen) {
      case 'destination':
        setCurrentScreen('dashboard');
        break;
      case 'transport':
        setCurrentScreen('destination');
        break;
      case 'tracking':
        if (currentJourney) {
          // Don't allow back navigation during active journey
          return;
        }
        setCurrentScreen('dashboard');
        break;
      case 'settings':
        setCurrentScreen('dashboard');
        break;
      default:
        setCurrentScreen('dashboard');
    }
  };

  const handleJourneyStop = () => {
    stopJourney();
    setSelectedDestination(null);
    setCurrentScreen('dashboard');
  };

  const renderHeader = () => {
    const canGoBack = currentScreen !== 'dashboard' && !(currentScreen === 'tracking' && currentJourney);
    
    return (
      <div className="flex items-center justify-between p-4 relative z-10">
        <div className="flex items-center gap-3">
          {canGoBack && (
            <button
              onClick={handleBackNavigation}
              className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
          )}
          {!canGoBack && (
            <div className="w-10 h-10" /> // Spacer to maintain layout
          )}
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-gradient">Smart Transit</h1>
          {isTracking && (
            <div className="flex items-center gap-1 text-xs text-neon-400">
              <div className="w-2 h-2 bg-neon-400 rounded-full animate-pulse" />
              Tracking Active
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentScreen === 'dashboard' && (
            <button
              onClick={() => setCurrentScreen('settings')}
              className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
            >
              <Settings size={20} className="text-white" />
            </button>
          )}
          {currentScreen !== 'dashboard' && (
            <div className="w-10 h-10" /> // Spacer to maintain layout
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Starting your journey..." />
        </div>
      );
    }

    switch (currentScreen) {
      case 'dashboard':
        return (
          <Dashboard
            currentJourney={currentJourney}
            travelStats={StorageManager.getTravelStats()}
            onStartNewJourney={handleStartNewJourney}
            onResumeJourney={currentJourney?.status === 'paused' ? resumeJourney : undefined}
            className="p-4"
          />
        );

      case 'destination':
        return (
          <div className="p-4 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Where to?</h2>
              <p className="text-gray-400">Choose your destination</p>
            </div>
            
            <DestinationInput
              onDestinationSelect={handleDestinationSelect}
              recentDestinations={StorageManager.getDestinations().filter(d => !d.isFavorite).slice(0, 5)}
              favoriteDestinations={StorageManager.getDestinations().filter(d => d.isFavorite)}
            />
          </div>
        );

      case 'transport':
        return (
          <div className="p-4 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Transport Mode</h2>
              <p className="text-gray-400">How are you traveling?</p>
            </div>

            {selectedDestination && (
              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-electric-400 mt-1" />
                  <div>
                    <h3 className="text-white font-medium">{selectedDestination.name}</h3>
                    <p className="text-gray-400 text-sm">{selectedDestination.address}</p>
                  </div>
                </div>
              </GlassCard>
            )}

            <TransportModeSelector
              selectedMode={selectedTransportMode}
              onModeChange={setSelectedTransportMode}
            />

            <GlassButton
              variant="primary"
              size="lg"
              onClick={handleTransportModeConfirm}
              className="w-full"
              glowing
              disabled={!selectedDestination}
            >
              Start Journey
            </GlassButton>
          </div>
        );

      case 'tracking':
        return currentJourney ? (
          <div className="p-4">
            <JourneyTracker
              journey={currentJourney}
              currentLocation={currentLocation}
              onStopJourney={handleJourneyStop}
              onPauseJourney={pauseJourney}
              onResumeJourney={resumeJourney}
              onEmergencyStop={emergencyStop}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <GlassCard className="p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">No Active Journey</h3>
              <p className="text-gray-400 mb-4">Start a new journey to begin tracking</p>
              <GlassButton variant="primary" onClick={handleStartNewJourney}>
                Start New Journey
              </GlassButton>
            </GlassCard>
          </div>
        );

      case 'settings':
        return (
          <div className="p-4 space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <p className="text-gray-400">Customize your experience</p>
            </div>
            
            <GlassCard className="p-6 text-center">
              <Settings size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-white font-medium mb-2">Settings Panel</h3>
              <p className="text-gray-400 text-sm">
                Settings interface coming soon. All core functionality is available in the main app.
              </p>
            </GlassCard>
          </div>
        );

      default:
        return null;
    }
  };

  const renderErrorState = () => {
    if (!error) return null;

    return (
      <div className="absolute top-20 left-4 right-4 z-50">
        <GlassCard className="p-4 border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <div className="flex-1">
              <h4 className="text-red-400 font-medium text-sm">Error</h4>
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {renderHeader()}
        
        <div className="flex-1 flex flex-col">
          {renderContent()}
        </div>
      </div>

      {/* Error Overlay */}
      {renderErrorState()}
    </div>
  );
};

export default Index;
