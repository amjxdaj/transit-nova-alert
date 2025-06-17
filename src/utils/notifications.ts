
import { NotificationPayload } from '@/types';

export class NotificationManager {
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
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

      // Vibrate separately using the Vibration API
      this.vibrate([200, 100, 200]);

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

    await this.showNotification({
      title: '🚌 Transit Alert',
      body: `Approaching destination in ${timeText} (${distanceText})`,
      icon: '/icon-192x192.png',
      tag: 'transit-progress',
      requireInteraction: true
    });
  }

  async showFinalAlert(): Promise<void> {
    await this.showNotification({
      title: '🎯 Final Alert!',
      body: 'You are very close to your destination. Get ready to exit!',
      icon: '/icon-192x192.png',
      tag: 'transit-final',
      requireInteraction: true
    });
  }

  async showArrivalAlert(): Promise<void> {
    await this.showNotification({
      title: '✅ Destination Reached!',
      body: 'You have arrived at your destination. Safe travels!',
      icon: '/icon-192x192.png',
      tag: 'transit-arrival',
      requireInteraction: false
    });
  }

  async showEmergencyAlert(message: string): Promise<void> {
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
    }
  }

  playSound(frequency: number = 800, duration: number = 200): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  hasPermission(): boolean {
    return this.permission === 'granted';
  }
}

export default NotificationManager;
