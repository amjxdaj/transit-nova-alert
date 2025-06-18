
import { NotificationPayload } from '@/types';

export class NotificationManager {
  private permission: NotificationPermission = 'default';
  private audioContext: AudioContext | null = null;
  private alarmAudio: HTMLAudioElement | null = null;

  constructor() {
    this.checkPermission();
    this.initializeAudio();
  }

  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  private initializeAudio(): void {
    try {
      // Initialize AudioContext for alarm sounds
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create alarm audio element
      this.alarmAudio = new Audio();
      this.alarmAudio.loop = false;
      this.alarmAudio.volume = 0.8;
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!await this.requestPermission()) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-192x192.png',
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        silent: false
      });

      // Auto-close after 10 seconds if not requiring interaction
      if (!payload.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  async showProgressAlert(distance: number, estimatedTime: number): Promise<void> {
    const timeText = this.formatTime(estimatedTime);
    const distanceText = this.formatDistance(distance);

    // Play alert sound and vibrate
    this.playAlertSound();
    this.vibrate([300, 100, 300]);

    await this.showNotification({
      title: '🚌 Transit Alert',
      body: `Approaching destination in ${timeText} (${distanceText})`,
      icon: '/icon-192x192.png',
      tag: 'transit-progress',
      requireInteraction: true
    });
  }

  async showFinalAlert(): Promise<void> {
    // Play urgent alarm and strong vibration
    this.playUrgentAlarm();
    this.vibrate([500, 200, 500, 200, 500]);

    await this.showNotification({
      title: '🎯 Final Alert!',
      body: 'You are very close to your destination. Get ready to exit!',
      icon: '/icon-192x192.png',
      tag: 'transit-final',
      requireInteraction: true
    });
  }

  async showArrivalAlert(): Promise<void> {
    // Play success sound and gentle vibration
    this.playSuccessSound();
    this.vibrate([200, 100, 200, 100, 200]);

    await this.showNotification({
      title: '✅ Destination Reached!',
      body: 'You have arrived at your destination. Safe travels!',
      icon: '/icon-192x192.png',
      tag: 'transit-arrival',
      requireInteraction: false
    });
  }

  async showEmergencyAlert(message: string): Promise<void> {
    // Play emergency alarm with continuous vibration
    this.playEmergencyAlarm();
    this.vibrate([100, 50, 100, 50, 100, 50, 100, 50, 100]);

    await this.showNotification({
      title: '🚨 Emergency Alert',
      body: message,
      icon: '/icon-192x192.png',
      tag: 'emergency',
      requireInteraction: true
    });
  }

  private formatTime(milliseconds: number): string {
    const minutes = Math.round(milliseconds / (1000 * 60));
    if (minutes < 1) return 'less than 1 minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  vibrate(pattern: number[] = [200, 100, 200]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    } else {
      console.warn('Vibration API not supported on this device');
    }
  }

  playAlertSound(): void {
    this.playTone(800, 300, 'sine');
  }

  playUrgentAlarm(): void {
    // Play multiple urgent beeps
    setTimeout(() => this.playTone(1000, 200, 'square'), 0);
    setTimeout(() => this.playTone(1200, 200, 'square'), 300);
    setTimeout(() => this.playTone(1000, 200, 'square'), 600);
  }

  playSuccessSound(): void {
    // Play ascending success tones
    setTimeout(() => this.playTone(523, 150, 'sine'), 0);  // C
    setTimeout(() => this.playTone(659, 150, 'sine'), 200); // E
    setTimeout(() => this.playTone(784, 300, 'sine'), 400); // G
  }

  playEmergencyAlarm(): void {
    // Play continuous emergency siren
    this.playWarningAlarm();
    setTimeout(() => this.playWarningAlarm(), 1000);
    setTimeout(() => this.playWarningAlarm(), 2000);
  }

  private playWarningAlarm(): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Create siren effect
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.5);
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 1);

      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 1);
    } catch (error) {
      console.warn('Could not play warning alarm:', error);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  playSound(frequency: number = 800, duration: number = 200): void {
    this.playTone(frequency, duration);
  }

  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  // Wake up audio context if suspended (mobile browsers)
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Could not resume audio context:', error);
      }
    }
  }
}

export default NotificationManager;
