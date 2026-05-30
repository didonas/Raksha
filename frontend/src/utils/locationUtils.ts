/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Calculate ETA in minutes based on distance and average speed
 * @param distanceKm Distance in kilometers
 * @param speedKmh Average speed in km/h (default: 60 for ambulance)
 */
export function calculateETA(distanceKm: number, speedKmh: number = 60): number {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

/**
 * Format ETA for display
 */
export function formatETA(minutes: number): string {
  if (minutes < 1) return 'Arriving now';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Find nearest hospital from a list
 */
export function getNearestHospital<T extends { lat: number; lng: number }>(
  userLat: number,
  userLng: number,
  hospitals: T[]
): T | null {
  if (!hospitals.length) return null;
  return hospitals.reduce((nearest, hospital) => {
    const dist = calculateDistance(userLat, userLng, hospital.lat, hospital.lng);
    const nearestDist = calculateDistance(userLat, userLng, nearest.lat, nearest.lng);
    return dist < nearestDist ? hospital : nearest;
  });
}

/**
 * Find nearest ambulance from a list
 */
export function getNearestAmbulance<T extends { lat: number; lng: number; status: string }>(
  userLat: number,
  userLng: number,
  ambulances: T[]
): T | null {
  const available = ambulances.filter((a) => a.status === 'available');
  if (!available.length) return null;
  return available.reduce((nearest, amb) => {
    const dist = calculateDistance(userLat, userLng, amb.lat, amb.lng);
    const nearestDist = calculateDistance(userLat, userLng, nearest.lat, nearest.lng);
    return dist < nearestDist ? amb : nearest;
  });
}

/**
 * Sort locations by distance from user
 */
export function sortByDistance<T extends { lat: number; lng: number }>(
  userLat: number,
  userLng: number,
  locations: T[]
): (T & { distance: number; eta: number })[] {
  return locations
    .map((loc) => ({
      ...loc,
      distance: calculateDistance(userLat, userLng, loc.lat, loc.lng),
      eta: calculateETA(calculateDistance(userLat, userLng, loc.lat, loc.lng)),
    }))
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(lat: number | null, lng: number | null): boolean {
  if (lat === null || lng === null) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

/**
 * Get Google Maps URL for coordinates
 */
export function getGoogleMapsUrl(lat: number, lng: number, label?: string): string {
  const query = label ? `${label}@${lat},${lng}` : `${lat},${lng}`;
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
}

/**
 * Get Google Maps directions URL
 */
export function getDirectionsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `https://maps.google.com/maps?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}`;
}
