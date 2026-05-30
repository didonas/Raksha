/**
 * RAKSHA Nearby Services Fetcher
 * Uses OpenStreetMap Overpass API — free, no API key, works globally.
 * Fetches real hospitals, police stations, fire stations, etc. within 25km.
 * Results are cached in localStorage for offline use.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_METERS = 25000; // 25km
const CACHE_KEY = 'raksha_nearby_services';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export interface NearbyPlace {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire_station' | 'pharmacy' | 'clinic';
  lat: number;
  lng: number;
  phone?: string;
  address?: string;
  distance?: number;
  openingHours?: string;
}

// ─── Haversine distance ───────────────────────────────────────────────────────
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Build Overpass query ─────────────────────────────────────────────────────
function buildQuery(lat: number, lng: number): string {
  return `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${RADIUS_METERS},${lat},${lng});
      way["amenity"="hospital"](around:${RADIUS_METERS},${lat},${lng});
      node["amenity"="police"](around:${RADIUS_METERS},${lat},${lng});
      way["amenity"="police"](around:${RADIUS_METERS},${lat},${lng});
      node["amenity"="fire_station"](around:${RADIUS_METERS},${lat},${lng});
      node["amenity"="pharmacy"](around:${RADIUS_METERS},${lat},${lng});
      node["amenity"="clinic"](around:${RADIUS_METERS},${lat},${lng});
    );
    out center tags;
  `;
}

// ─── Parse Overpass response ──────────────────────────────────────────────────
function parseResults(elements: any[], userLat: number, userLng: number): NearbyPlace[] {
  const amenityMap: Record<string, NearbyPlace['type']> = {
    hospital: 'hospital',
    police: 'police',
    fire_station: 'fire_station',
    pharmacy: 'pharmacy',
    clinic: 'clinic',
  };

  return elements
    .map((el) => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) return null;

      const amenity = el.tags?.amenity;
      const type = amenityMap[amenity];
      if (!type) return null;

      const name = el.tags?.name || el.tags?.['name:en'] || `${amenity.replace('_', ' ')} (unnamed)`;

      return {
        id: `${el.type}-${el.id}`,
        name,
        type,
        lat,
        lng,
        phone: el.tags?.phone || el.tags?.['contact:phone'] || undefined,
        address: [el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ') || undefined,
        distance: distanceKm(userLat, userLng, lat, lng),
        openingHours: el.tags?.opening_hours || undefined,
      } as NearbyPlace;
    })
    .filter(Boolean) as NearbyPlace[];
}

// ─── Fetch from Overpass API ──────────────────────────────────────────────────
export async function fetchNearbyServices(lat: number, lng: number): Promise<NearbyPlace[]> {
  const query = buildQuery(lat, lng);

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

  const data = await response.json();
  const places = parseResults(data.elements || [], lat, lng);

  // Sort by distance
  places.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  // Cache results
  saveNearbyServicesCache(lat, lng, places);

  return places;
}

// ─── Cache management ─────────────────────────────────────────────────────────
interface ServicesCache {
  lat: number;
  lng: number;
  places: NearbyPlace[];
  savedAt: number;
}

export function saveNearbyServicesCache(lat: number, lng: number, places: NearbyPlace[]): void {
  try {
    const cache: ServicesCache = { lat, lng, places, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.log('[NearbyServices] Cache save failed:', e);
  }
}

export function getNearbyServicesCache(): { places: NearbyPlace[]; isStale: boolean; savedAt: number | null } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { places: [], isStale: true, savedAt: null };
    const cache: ServicesCache = JSON.parse(raw);
    const isStale = Date.now() - cache.savedAt > CACHE_DURATION_MS;
    return { places: cache.places || [], isStale, savedAt: cache.savedAt };
  } catch {
    return { places: [], isStale: true, savedAt: null };
  }
}

// ─── Get places by type ───────────────────────────────────────────────────────
export function filterByType(places: NearbyPlace[], type: NearbyPlace['type']): NearbyPlace[] {
  return places.filter((p) => p.type === type);
}

export function getTypeLabel(type: NearbyPlace['type']): string {
  const labels: Record<NearbyPlace['type'], string> = {
    hospital: 'Hospital',
    police: 'Police Station',
    fire_station: 'Fire Station',
    pharmacy: 'Pharmacy',
    clinic: 'Clinic',
  };
  return labels[type] || type;
}

export function getTypeIcon(type: NearbyPlace['type']): string {
  const icons: Record<NearbyPlace['type'], string> = {
    hospital: '🏥',
    police: '🚔',
    fire_station: '🚒',
    pharmacy: '💊',
    clinic: '🩺',
  };
  return icons[type] || '📍';
}
