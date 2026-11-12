import { Alert, Platform } from 'react-native';

/**
 * Shows a cross-platform confirmation dialog.
 * On native (Android/iOS): uses Alert.alert()
 * On web: uses window.confirm()
 *
 * @param {string} title
 * @param {string} message
 * @param {{ confirmText?: string, cancelText?: string, destructive?: boolean }} [options]
 * @returns {Promise<boolean>} true if user confirmed
 */
export function confirmAction(title, message, options = {}) {
  const { confirmText = 'OK', cancelText = 'Cancel', destructive = false } = options;

  if (Platform.OS === 'web') {
    // window.confirm is synchronous but we wrap in Promise for a uniform API
    const result = window.confirm(title + '\n\n' + message);
    return Promise.resolve(result);
  }

  // Native path — wrap Alert.alert in a Promise
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelText,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
