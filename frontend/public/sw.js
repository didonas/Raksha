/**
 * RAKSHA Service Worker
 * Handles background caching of nearby hospitals, location, and offline support.
 * Radius: 25km from last known location.
 */

const CACHE_NAME = 'raksha-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
];

const API_BASE = 'http://localhost:5000/api';
const CACHE_RADIUS_KM = 25;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Install: cache static assets ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing RAKSHA Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore errors for missing static files during dev
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating RAKSHA Service Worker...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: serve from cache, fallback to network ────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-first for static assets
  if (event.request.method === 'GET' && !url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || new Response('Offline', { status: 503 }));
      })
    );
    return;
  }

  // Network-first for API calls, fallback to cache
  if (event.request.method === 'GET' && url.pathname.startsWith('/api/hospitals')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return new Response(JSON.stringify({ hospitals: [], cached: true, error: 'offline' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        });
      })
    );
    return;
  }
});

// ─── Background Sync: refresh hospital cache ─────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'refresh-hospitals') {
    console.log('[SW] Background sync: refreshing hospital cache...');
    event.waitUntil(refreshHospitalCache());
  }
});

// ─── Periodic Background Sync ─────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'raksha-location-cache') {
    console.log('[SW] Periodic sync: updating location cache...');
    event.waitUntil(refreshHospitalCache());
  }
});

// ─── Message handler: receive location from app ──────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_LOCATION') {
    const { lat, lng, token } = event.data;
    console.log(`[SW] Location update received: ${lat}, ${lng}`);
    // Store location in cache for background use
    caches.open(CACHE_NAME).then((cache) => {
      const locationData = JSON.stringify({ lat, lng, updatedAt: Date.now() });
      cache.put(
        new Request('/__raksha_location__'),
        new Response(locationData, { headers: { 'Content-Type': 'application/json' } })
      );
    });
    // Trigger hospital refresh with new location
    if (lat && lng && token) {
      refreshHospitalsForLocation(lat, lng, token);
    }
  }

  if (event.data && event.data.type === 'FORCE_REFRESH') {
    const { lat, lng, token } = event.data;
    if (lat && lng && token) {
      refreshHospitalsForLocation(lat, lng, token);
    }
  }
});

// ─── Refresh hospitals within 25km radius ────────────────────────────────────
async function refreshHospitalsForLocation(lat, lng, token) {
  try {
    const url = `${API_BASE}/hospitals/nearest?lat=${lat}&lng=${lng}&limit=20&radius=${CACHE_RADIUS_KM}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const clone = response.clone();
      const cache = await caches.open(CACHE_NAME);
      // Cache with location key for offline retrieval
      await cache.put(new Request(`/__raksha_hospitals__`), clone);
      await cache.put(new Request(url), response);
      console.log(`[SW] Hospitals cached for location ${lat.toFixed(4)}, ${lng.toFixed(4)} (${CACHE_RADIUS_KM}km radius)`);

      // Notify all open clients
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({ type: 'HOSPITALS_UPDATED', lat, lng });
      });
    }
  } catch (err) {
    console.log('[SW] Hospital refresh failed (offline?):', err.message);
  }
}

async function refreshHospitalCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const locationResponse = await cache.match('/__raksha_location__');
    if (!locationResponse) return;
    const { lat, lng } = await locationResponse.json();
    // Get token from cache
    const tokenResponse = await cache.match('/__raksha_token__');
    if (!tokenResponse) return;
    const { token } = await tokenResponse.json();
    await refreshHospitalsForLocation(lat, lng, token);
  } catch (err) {
    console.log('[SW] Background refresh error:', err.message);
  }
}

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'RAKSHA Alert', {
      body: data.body || 'Emergency update',
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [300, 100, 300],
      tag: 'raksha-alert',
      requireInteraction: true,
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/')
  );
});
