import { Platform, ToastAndroid } from 'react-native';

const listeners = new Set();

/**
 * Subscribes a UI component to toast notifications.
 * @param {(toast: {message: string, duration: 'short'|'long'}) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToToast(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Shows a non-blocking toast notification.
 * Uses native ToastAndroid on Android devices and triggers in-app visual toast banners on Web & iOS.
 * 
 * @param {string} message - Message to display in the toast.
 * @param {'short' | 'long'} [duration='short'] - Duration to show the toast.
 */
export function showToast(message, duration = 'short') {
  if (!message) return;

  if (Platform.OS === 'android') {
    const toastDuration = duration === 'long' 
      ? ToastAndroid.LONG 
      : ToastAndroid.SHORT;
    ToastAndroid.show(message, toastDuration);
  }

  // Notify in-app subscribers (visible on Web, iOS, and Android)
  listeners.forEach((listener) => {
    try {
      listener({ message, duration });
    } catch (err) {
      if (__DEV__) console.warn('[Toast Listener Error]:', err);
    }
  });

  if (__DEV__) {
    console.log(`[Toast]: ${message}`);
  }
}
