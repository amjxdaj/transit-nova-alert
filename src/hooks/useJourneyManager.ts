import { useState, useEffect, useCallback } from 'react';
import { Journey, Destination, Location, TransportMode, JourneyStatus, Alert, AlertType } from '@/types';
import { GeolocationManager, calculateDistance } from '@/utils/geolocation';
import { NotificationManager } from '@/utils/notifications';
import { StorageManager } from '@/utils/storage';
import { toast } from '@/hooks/use-toast';

interface UseJourneyManagerReturn {
  currentJourney: Journey | null;
  startJourney: (destination: Destination, transportMode: TransportMode) => Promise<void>;
  stopJourney: () => void;
  pauseJourney: () => void;
  resumeJourney: () => void;
  emergencyStop: () => void;
  currentLocation: Location | null;
  isTracking: boolean;
  error: string | null;
}

export const useJourneyManager = (): UseJourneyManagerReturn => {
  const [currentJourney, setCurrentJourney] = useState<Journey | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocationManager] = useState(() => new GeolocationManager());
  const [notificationManager] = useState(() => new NotificationManager());
  const [alertedDistances, setAlertedDistances] = useState<Set<AlertType>>(new Set());

  // Initialize from storage
  useEffect(() => {
    const savedJourney = StorageManager.getCurrentJourney();
    if (savedJourney && savedJourney.status !== 'stopped' && savedJourney.status !== 'arrived') {
      setCurrentJourney(savedJourney);
      startLocationTracking();
    }
  }, []);

  // Save journey state
  useEffect(() => {
    StorageManager.saveCurrentJourney(currentJourney);
  }, [currentJourney]);

  // Resume audio context on user interaction
  useEffect(() => {
    const resumeAudio = () => {
      notificationManager.resumeAudioContext();
    };

    // Listen for user interactions to resume audio context
    document.addEventListener('touchstart', resumeAudio, { once: true });
    document.addEventListener('click', resumeAudio, { once: true });

    return () => {
      document.removeEventListener('touchstart', resumeAudio);
      document.removeEventListener('click', resumeAudio);
    };
  }, [notificationManager]);

  const startLocationTracking = useCallback(() => {
    console.log('Starting location tracking...');
    
    const handleLocationUpdate = (location: Location) => {
      console.log('Location updated:', location);
      setCurrentLocation(location);
      setError(null);
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.error('Location error:', error);
      setError(error.message);
      toast({
        title: "Location Error",
        description: error.message,
        variant: "destructive",
      });
    };

    const unsubscribeLocation = geolocationManager.onPositionUpdate(handleLocationUpdate);
    const unsubscribeError = geolocationManager.onError(handleLocationError);

    geolocationManager.startTracking();
    setIsTracking(true);

    return () => {
      unsubscribeLocation();
      unsubscribeError();
      geolocationManager.stopTracking();
      setIsTracking(false);
    };
  }, [geolocationManager]);

  const stopLocationTracking = useCallback(() => {
    console.log('Stopping location tracking...');
    geolocationManager.stopTracking();
    setIsTracking(false);
  }, [geolocationManager]);

  // Handle journey tracking logic
  useEffect(() => {
    if (!currentJourney || !currentLocation || currentJourney.status !== 'tracking') {
      return;
    }

    const distance = calculateDistance(currentLocation, currentJourney.destination.location);
    const preferences = StorageManager.getPreferences();
    
    console.log(`Distance to destination: ${distance}m`);

    // Update journey with current location and distance
    setCurrentJourney(prev => prev ? {
      ...prev,
      currentLocation,
      distance
    } : null);

    // Check for alerts
    const checkAndSendAlert = async (alertType: AlertType, distance: number, threshold: number) => {
      if (distance <= threshold && !alertedDistances.has(alertType)) {
        console.log(`Triggering ${alertType} alert at ${distance}m`);
        
        const alert: Alert = {
          id: `${alertType}_${Date.now()}`,
          type: alertType,
          message: getAlertMessage(alertType),
          timestamp: Date.now(),
          distance
        };

        // Add alert to journey
        setCurrentJourney(prev => prev ? {
          ...prev,
          alerts: [...prev.alerts, alert]
        } : null);

        // Resume audio context before playing sounds
        await notificationManager.resumeAudioContext();

        // Send notification with enhanced alerts
        if (preferences.notifications.sound || preferences.notifications.vibration) {
          switch (alertType) {
            case 'first_warning':
              await notificationManager.showProgressAlert(distance, 600000); // 10 min estimate
              break;
            case 'approaching':
              await notificationManager.showProgressAlert(distance, 120000); // 2 min estimate
              break;
            case 'final_warning':
              await notificationManager.showFinalAlert();
              break;
            case 'arrived':
              await notificationManager.showArrivalAlert();
              break;
          }
        }

        // Mark alert as sent
        setAlertedDistances(prev => new Set([...prev, alertType]));

        // Show toast
        toast({
          title: getAlertTitle(alertType),
          description: getAlertMessage(alertType),
          duration: alertType === 'final_warning' ? 10000 : 5000,
        });
      }
    };

    // Check alerts in order of proximity
    if (distance <= 50) {
      // Arrived
      checkAndSendAlert('arrived', distance, 50);
      completeJourney();
    } else if (distance <= preferences.alertDistances.final) {
      // Final warning (200m default)
      checkAndSendAlert('final_warning', distance, preferences.alertDistances.final);
      geolocationManager.setTrackingMode('precision');
    } else if (distance <= preferences.alertDistances.approaching) {
      // Approaching (1km default)
      checkAndSendAlert('approaching', distance, preferences.alertDistances.approaching);
      geolocationManager.setTrackingMode('active');
    } else {
      // Use minimal tracking when far away
      geolocationManager.setTrackingMode('minimal');
    }

  }, [currentJourney, currentLocation, alertedDistances, geolocationManager, notificationManager]);

  const getAlertTitle = (alertType: AlertType): string => {
    switch (alertType) {
      case 'first_warning': return '🔔 Journey Alert';
      case 'approaching': return '⚠️ Approaching Destination';
      case 'final_warning': return '🎯 Get Ready!';
      case 'arrived': return '✅ Destination Reached';
      default: return 'Transit Alert';
    }
  };

  const getAlertMessage = (alertType: AlertType): string => {
    switch (alertType) {
      case 'first_warning': return 'You are approaching your destination. Stay alert!';
      case 'approaching': return 'Less than 1km to your destination. Prepare to exit.';
      case 'final_warning': return 'Very close to your destination. Get ready to exit!';
      case 'arrived': return 'You have arrived at your destination. Safe travels!';
      default: return 'Transit notification';
    }
  };

  const completeJourney = useCallback(() => {
    if (!currentJourney) return;

    const completedJourney: Journey = {
      ...currentJourney,
      status: 'arrived',
      endTime: Date.now(),
      actualArrival: Date.now()
    };

    setCurrentJourney(completedJourney);
    StorageManager.addJourney(completedJourney);
    StorageManager.addDestination(completedJourney.destination);
    
    stopLocationTracking();

    toast({
      title: "Journey Complete!",
      description: `You have arrived at ${completedJourney.destination.name}`,
      duration: 5000,
    });

    // Clear current journey after a delay
    setTimeout(() => {
      setCurrentJourney(null);
      setAlertedDistances(new Set());
    }, 3000);
  }, [currentJourney, stopLocationTracking]);

  const startJourney = async (destination: Destination, transportMode: TransportMode): Promise<void> => {
    try {
      console.log('Starting journey to:', destination.name);

      // Request permissions
      const hasLocationPermission = await geolocationManager.requestPermission();
      if (!hasLocationPermission) {
        throw new Error('Location permission is required for journey tracking');
      }

      const hasNotificationPermission = await notificationManager.requestPermission();
      if (!hasNotificationPermission) {
        console.warn('Notification permission not granted');
      }

      // Get initial position
      const startLocation = await geolocationManager.getCurrentPosition();
      
      const journey: Journey = {
        id: `journey_${Date.now()}`,
        destination,
        startTime: Date.now(),
        transportMode,
        status: 'tracking',
        startLocation,
        currentLocation: startLocation,
        alerts: [],
        distance: calculateDistance(startLocation, destination.location)
      };

      setCurrentJourney(journey);
      setCurrentLocation(startLocation);
      setAlertedDistances(new Set());
      
      startLocationTracking();

      toast({
        title: "Journey Started",
        description: `Tracking your trip to ${destination.name}`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Failed to start journey:', error);
      setError(error instanceof Error ? error.message : 'Failed to start journey');
      toast({
        title: "Journey Start Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const stopJourney = useCallback(() => {
    if (!currentJourney) return;

    const stoppedJourney: Journey = {
      ...currentJourney,
      status: 'stopped',
      endTime: Date.now()
    };

    setCurrentJourney(stoppedJourney);
    StorageManager.addJourney(stoppedJourney);
    
    stopLocationTracking();

    toast({
      title: "Journey Stopped",
      description: "Your journey tracking has been stopped",
      duration: 3000,
    });

    // Clear current journey
    setTimeout(() => {
      setCurrentJourney(null);
      setAlertedDistances(new Set());
    }, 1000);
  }, [currentJourney, stopLocationTracking]);

  const pauseJourney = useCallback(() => {
    if (!currentJourney) return;

    setCurrentJourney(prev => prev ? { ...prev, status: 'paused' } : null);
    stopLocationTracking();

    toast({
      title: "Journey Paused",
      description: "Location tracking has been paused",
      duration: 2000,
    });
  }, [currentJourney, stopLocationTracking]);

  const resumeJourney = useCallback(() => {
    if (!currentJourney) return;

    setCurrentJourney(prev => prev ? { ...prev, status: 'tracking' } : null);
    startLocationTracking();

    toast({
      title: "Journey Resumed",
      description: "Location tracking has been resumed",
      duration: 2000,
    });
  }, [currentJourney, startLocationTracking]);

  const emergencyStop = useCallback(async () => {
    if (!currentJourney) return;

    // Resume audio context and play emergency alarm
    await notificationManager.resumeAudioContext();
    
    stopJourney();
    
    notificationManager.showEmergencyAlert('Emergency stop activated. Journey tracking stopped.');
    
    toast({
      title: "🚨 Emergency Stop",
      description: "Journey tracking stopped immediately",
      variant: "destructive",
      duration: 5000,
    });
  }, [currentJourney, stopJourney, notificationManager]);

  return {
    currentJourney,
    startJourney,
    stopJourney,
    pauseJourney,
    resumeJourney,
    emergencyStop,
    currentLocation,
    isTracking,
    error
  };
};
