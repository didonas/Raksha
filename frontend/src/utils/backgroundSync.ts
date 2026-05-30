/**
 * RAKSHA Background Sync Manager
 * Registers service worker, manages permissions, and sends location updates
 * to the SW for background hospital caching within 25km radius.
 */

const CACHE_RADIUS_KM = 25;

// ─── Register Service Worker ──────────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[BG] Service workers not supported');
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[BG] Service worker registered:', reg.scope);

    // Register periodic background sync if supported
    if ('periodicSync' in reg) {
      try {
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
        if (status.state === 'granted') {
          await (reg as any).periodicSync.register('raksha-location-cache', {
            minInterval: 30 * 60 * 1000, // 30 minutes
          });
          console.log('[BG] Periodic background sync registered (30 min interval)');
        }
      } catch (e) {
        console.log('[BG] Periodic sync not available:', e);
      }
    }

    return reg;
  } catch (err) {
    console.error('[BG] Service worker registration failed:', err);
    return null;
  }
}

// ─── Request all required permissions ────────────────────────────────────────
export async function requestPermissions(): Promise<{
  location: boolean;
  notifications: boolean;
  backgroundSync: boolean;
}> {
  const result = { location: false, notifications: false, backgroundSync: false };

  // Location permission
  try {
    const locPerm = await navigator.permissions.query({ name: 'geolocation' });
    if (locPerm.state === 'granted') {
      result.location = true;
    } else if (locPerm.state === 'prompt') {
      // Trigger the browser prompt
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => { result.location = true; resolve(); },
          () => resolve(),
          { timeout: 10000 }
        );
      });
    }
  } catch (e) {
    console.log('[BG] Location permission check failed:', e);
  }

  // Notification permission
  if ('Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        result.notifications = true;
      } else if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        result.notifications = perm === 'granted';
      }
    } catch (e) {
      console.log('[BG] Notification permission failed:', e);
    }
  }

  // Background sync permission (implicit — just check if available)
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    result.backgroundSync = true;
  }

  return result;
}

// ─── Send location to Service Worker for background caching ──────────────────
export function sendLocationToSW(lat: number, lng: number, token: string): void {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: 'UPDATE_LOCATION',
    lat,
    lng,
    token,
  });
}

// ─── Store auth token in SW cache ─────────────────────────────────────────────
export async function storeTokenInSWCache(token: string): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('raksha-v1');
    await cache.put(
      new Request('/__raksha_token__'),
      new Response(JSON.stringify({ token }), { headers: { 'Content-Type': 'application/json' } })
    );
  } catch (e) {
    console.log('[BG] Failed to store token in cache:', e);
  }
}

// ─── Trigger background sync manually ────────────────────────────────────────
export async function triggerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('sync' in reg) {
      await (reg as any).sync.register('refresh-hospitals');
      console.log('[BG] Background sync triggered');
    }
  } catch (e) {
    console.log('[BG] Background sync trigger failed:', e);
  }
}

// ─── Get cached hospitals from SW cache ──────────────────────────────────────
export async function getCachedHospitalsFromSW(): Promise<any[]> {
  if (!('caches' in window)) return [];
  try {
    const cache = await caches.open('raksha-v1');
    const response = await cache.match('/__raksha_hospitals__');
    if (!response) return [];
    const data = await response.json();
    return data.hospitals || [];
  } catch {
    return [];
  }
}

// ─── Listen for SW messages (hospital updates) ───────────────────────────────
export function onSWMessage(callback: (data: any) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'HOSPITALS_UPDATED') {
      callback(event.data);
    }
  };
  navigator.serviceWorker?.addEventListener('message', handler);
  return () => navigator.serviceWorker?.removeEventListener('message', handler);
}

// ─── Check if running as installed PWA ───────────────────────────────────────
export function isInstalledPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}
