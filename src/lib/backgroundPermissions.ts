/**
 * Request necessary permissions for background notifications
 * Including Notification API and persistent notifications via Service Workers
 */

export async function requestBackgroundPermissions(): Promise<{
  notification: boolean;
  badging: boolean;
}> {
  const permissions: { notification: boolean; badging: boolean } = {
    notification: false,
    badging: false,
  };

  try {
    // Request Notification Permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        permissions.notification = true;
      } else if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission();
        permissions.notification = result === 'granted';
      }
    }

    // Request Badging API Permission (for notification badges)
    if ('setAppBadge' in navigator) {
      try {
        // Badging API usually doesn't need explicit permission on most platforms
        permissions.badging = true;
      } catch (err) {
        console.warn('Badging API not available:', err);
      }
    }

    // Register Service Worker for background handling
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('Service Worker ready for background tasks');
        
        // Attempt to enable persistent notifications via Background Sync
        // Only register if we have a valid window context (required by the API)
        if ('sync' in registration && typeof window !== 'undefined' && !document.hidden) {
          try {
            await (registration as any).sync.register('bg-reminders');
            console.log('Background Sync registered');
          } catch (err) {
            // Background Sync may not be supported or window context is missing — safe to ignore
            console.warn('Background Sync not available:', err);
          }
        }
      } catch (err) {
        console.warn('Service Worker registration error:', err);
      }
    }

    return permissions;
  } catch (err) {
    console.error('Error requesting background permissions:', err);
    return permissions;
  }
}

/**
 * Update app badge with notification count
 */
export function updateAppBadge(count: number): void {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {
        // Badge API not supported on this platform
      });
    } else {
      (navigator as any).clearAppBadge().catch(() => {
        // Badge API not supported on this platform
      });
    }
  }
}

/**
 * Keep app alive by requesting WakeLock
 */
export async function requestPersistentWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator) {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('Wake Lock acquired - screen will stay on');
      
      // Re-request if visibility changes
      document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
          try {
            await (navigator as any).wakeLock.request('screen');
          } catch {
            // Wake lock lost
          }
        }
      });
      
      return true;
    }
  } catch (err) {
    console.warn('Wake Lock API not supported:', err);
  }
  return false;
}
