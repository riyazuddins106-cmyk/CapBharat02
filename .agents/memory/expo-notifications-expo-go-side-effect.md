---
name: Expo notifications Expo Go import side-effect
description: expo-notifications fires a console.error on Android Expo Go at import time via a module-level side effect, not via any user API call; guarding function calls is insufficient.
---

## Rule
Never import expo-notifications with a static top-level import inside any file that runs on Android in Expo Go. Use a conditional `require()` guarded by `IS_EXPO_GO_ANDROID`.

## Why
`expo-notifications@0.32.x` (SDK 54) contains a module-level side effect in
`DevicePushTokenAutoRegistration.fx.ts`: it calls `addPushTokenListener()` unconditionally
at import time. `addPushTokenListener` calls `warnOfExpoGoPushUsage()`, which calls
`console.error()` on Android when `isRunningInExpoGo()` is true. In Expo Go, `console.error`
produces a full-screen red "Console Error" overlay that looks exactly like a crash to users.
This fires on import — before any JS guard in the consuming file can execute — so guarding
individual function calls (e.g. `if (!IS_EXPO_GO_ANDROID) Notifications.getExpoPushTokenAsync()`)
does NOT prevent it.

## How to apply
```ts
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const IS_EXPO_GO_ANDROID =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient &&
  Platform.OS === 'android';

type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;
let Device: typeof import('expo-device') | null = null;

if (!IS_EXPO_GO_ANDROID) {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  // setNotificationHandler etc. go here
}

export async function getExpoPushToken(): Promise<string | null> {
  if (IS_EXPO_GO_ANDROID || !Notifications || !Device) return null;
  // ... normal push flow
}
```

Note: Metro bundles the module regardless, but side effects only run when `require()` is
called. This pattern correctly prevents evaluation on Android Expo Go.

iOS in Expo Go: the library only logs a `console.warn` (not `console.error`) on iOS, so
no full-screen overlay — iOS does NOT need this guard unless you want to suppress the
yellow warning too.
