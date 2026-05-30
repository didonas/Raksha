const STORAGE_KEYS = {
  PROFILE: 'raksha_profile',
  EMERGENCY_GUIDES: 'raksha_emergency_guides',
  CONTACTS: 'raksha_contacts',
  HOSPITALS: 'raksha_hospitals',
  LAST_LOCATION: 'raksha_last_location',
  OFFLINE_EMERGENCY: 'raksha_offline_emergency',
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export function saveProfile(profile: any): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify({
      data: profile,
      savedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[OfflineStorage] Failed to save profile:', err);
  }
}

export function getProfile(): any | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!stored) return null;
    const { data } = JSON.parse(stored);
    return data;
  } catch {
    return null;
  }
}

// ─── Emergency Guides ─────────────────────────────────────────────────────────
export function saveEmergencyGuides(guides: any): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EMERGENCY_GUIDES, JSON.stringify({
      data: guides,
      savedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[OfflineStorage] Failed to save guides:', err);
  }
}

export function getEmergencyGuides(): any | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EMERGENCY_GUIDES);
    if (!stored) return null;
    const { data } = JSON.parse(stored);
    return data;
  } catch {
    return null;
  }
}

// ─── Emergency Contacts ───────────────────────────────────────────────────────
export function saveContacts(contacts: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify({
      data: contacts,
      savedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[OfflineStorage] Failed to save contacts:', err);
  }
}

export function getContacts(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (!stored) return [];
    const { data } = JSON.parse(stored);
    return data || [];
  } catch {
    return [];
  }
}

// ─── Hospitals Cache ──────────────────────────────────────────────────────────
export function saveHospitals(hospitals: any[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify({
      data: hospitals,
      savedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[OfflineStorage] Failed to save hospitals:', err);
  }
}

export function getHospitals(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
    if (!stored) return [];
    const { data } = JSON.parse(stored);
    return data || [];
  } catch {
    return [];
  }
}

// ─── Last Known Location ──────────────────────────────────────────────────────
export function saveLastLocation(lat: number, lng: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify({
      lat,
      lng,
      savedAt: new Date().toISOString(),
    }));
  } catch {}
}

export function getLastLocation(): { lat: number; lng: number } | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
    if (!stored) return null;
    const { lat, lng } = JSON.parse(stored);
    return { lat, lng };
  } catch {
    return null;
  }
}

// ─── Offline Emergency Queue ──────────────────────────────────────────────────
export function queueOfflineEmergency(emergencyData: any): void {
  try {
    const existing = getOfflineEmergencyQueue();
    existing.push({ ...emergencyData, queuedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_EMERGENCY, JSON.stringify(existing));
  } catch {}
}

export function getOfflineEmergencyQueue(): any[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.OFFLINE_EMERGENCY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearOfflineEmergencyQueue(): void {
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_EMERGENCY);
}

// ─── Clear All ────────────────────────────────────────────────────────────────
export function clearAllOfflineData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// ─── IndexedDB for larger data ────────────────────────────────────────────────
export async function saveToIndexedDB(storeName: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RakshaDB', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getFromIndexedDB(storeName: string, id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RakshaDB', 1);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getRequest = store.get(id);
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    request.onerror = () => reject(request.error);
  });
}
