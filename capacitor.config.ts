
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.852e39baf57a4767a2c3becbcd683607',
  appName: 'bus-nap',
  webDir: 'dist',
  server: {
    url: 'https://852e39ba-f57a-4767-a2c3-becbcd683607.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    BackgroundMode: {
      enabled: true,
      title: 'Transit Alert Active',
      text: 'Tracking your journey to destination',
      silent: false
    },
    Geolocation: {
      permissions: {
        location: 'always'
      }
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#00D4FF'
    }
  }
};

export default config;
