import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

export function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: '#4F46E5' });

  Keyboard.setAccessoryBarVisible({ isVisible: true });

  SplashScreen.hide();

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}
