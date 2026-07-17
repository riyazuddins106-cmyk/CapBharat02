import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Expo Go (SDK 53+) no longer supports Android remote push notifications.
// Merely *importing* expo-notifications triggers a module-level side effect
// (DevicePushTokenAutoRegistration.fx.ts calls addPushTokenListener at import
// time) which logs a hard console.error on Android — this looks like a crash
// to end users even though our own code never calls a push API. The only
// reliable fix is to never `require('expo-notifications')` at all in that
// environment; guarding individual function calls is not enough since the
// side effect runs on import, before any of our checks execute.
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const IS_EXPO_GO_ANDROID = IS_EXPO_GO && Platform.OS === 'android';

type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;
let Device: typeof import('expo-device') | null = null;

if (!IS_EXPO_GO_ANDROID) {
  // Lazy, conditional require: keeps the module (and its import-time side
  // effects) from ever loading on Android inside Expo Go.
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permission and returns an Expo push token, or null
 * if unavailable (e.g. running in Expo Go on Android, a simulator, or
 * permission denied). Safe to call multiple times; failures are swallowed
 * since push delivery is a non-critical enhancement.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (IS_EXPO_GO_ANDROID || !Notifications || !Device) {
    // Remote push notifications were removed from Expo Go on Android in SDK 53.
    console.log('[push] skipping push registration — unsupported in Expo Go on Android (SDK 53+); use a development build.');
    return null;
  }

  try {
    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4183D',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data;
  } catch (err) {
    console.warn('[push] failed to get Expo push token', err);
    return null;
  }
}
