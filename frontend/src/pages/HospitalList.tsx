import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Phone, Navigation, MapPin,
  RefreshCw, WifiOff, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGeolocation } from '../hooks/useGeolocation';
import BottomNav from '../components/BottomNav';
import {
  fetchNearbyServices, getNearbyServicesCache,
  filterByType, getTypeLabel, getTypeIcon,
  NearbyPlace
} from '../utils/nearbyServices';
import { getLastLocation } from '../utils/offlineStorage';

type FilterType = 'all' | 'hospital' | 'police' | 'fire_station' | 'pharmacy' | 'clinic';

const FILTER_TABS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📍' },
  { id: 'hospital', label: 'Hospitals', icon: '🏥' },
  { id: 'police', label: 'Police', icon: '🚔' },
  { id: 'fire_station', label: 'Fire', icon: '🚒' },
  { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { id: 'clinic', label: 'Clinic', icon: '🩺' },
];

export default function HospitalList() {
  const navigate = useNavigate();
  const { lat, lng } = useGeolocation({ enableHighAccuracy: true });
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [filtered, setFiltered] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cacheTime, setCacheTime] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const loadPlaces = useCallback(async (forceRefresh = false) => {
    const userLat = lat || getLastLocation()?.lat;
    const userLng = lng || getLastLocation()?.lng;

    // Try cache first if offline or not forcing refresh
    const { places: cached, isStale, savedAt } = getNearbyServicesCache();
    if (!forceRefresh && cached.length > 0 && (!isStale || !navigator.onLine)) {
      setPlaces(cached);
      setFiltered(cached);
      setCacheTime(savedAt);
      setLoading(false);
      if (isStale && navigator.onLine) {
        // Refresh in background
        fetchInBackground(userLat, userLng);
      }
      return;
    }

    if (!userLat || !userLng) {
      if (cached.length > 0) {
        setPlaces(cached);
        setFiltered(cached);
        setCacheTime(savedAt);
      }
      setLoading(false);
      return;
    }

    if (!navigator.onLine) {
      if (cached.length > 0) {
        setPlaces(cached);
        setFiltered(cached);
        setCacheTime(savedAt);
        toast('Showing cached data — you are offline', { icon: '📦' });
      } else {
        toast.error('No cached data available. Connect to internet first.');
      }
      setLoading(false);
      return;
    }

    try {
      const results = await fetchNearbyServices(userLat, userLng);
      setPlaces(results);
      setFiltered(results);
      setCacheTime(Date.now());
      if (results.length === 0) toast('No services found within 25km', { icon: '📍' });
    } catch (err) {
      if (cached.length > 0) {
        setPlaces(cached);
        setFiltered(cached);
        setCacheTime(savedAt);
        toast('Using cached data', { icon: '📦' });
      } else {
        toast.error('Failed to load nearby services');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lat, lng]);

  const fetchInBackground = async (userLat?: number | null, userLng?: number | null) => {
    if (!userLat || !userLng || !navigator.onLine) return;
    try {
      const results = await fetchNearbyServices(userLat, userLng);
      setPlaces(results);
      setCacheTime(Date.now());
    } catch {}
  };

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  // Apply search + filter
  useEffect(() => {
    let result = [...places];
    if (activeFilter !== 'all') result = filterByType(result, activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        getTypeLabel(p.type).toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, activeFilter, places]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlaces(true);
    toast.success('Services refreshed');
  };

  const openInMaps = (place: NearbyPlace) => {
    window.open(`https://maps.google.com/?q=${place.lat},${place.lng}`, '_blank');
  };

  const formatCacheTime = (ts: number | null) => {
    if (!ts) return null;
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  // Count by type
  const counts = FILTER_TABS.reduce((acc, tab) => {
    acc[tab.id] = tab.id === 'all' ? places.length : filterByType(places, tab.id as any).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-3 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Nearby Services</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">
                {filtered.length} found within 25km
              </p>
              {isOffline && (
                <span className="flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-900/20 px-2 py-0.5 rounded-full">
                  <WifiOff className="w-2.5 h-2.5" /> Offline
                </span>
              )}
              {cacheTime && (
                <span className="text-[10px] text-gray-600">• cached {formatCacheTime(cacheTime)}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || isOffline}
            className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search hospitals, police..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeFilter === tab.id
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {counts[tab.id] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === tab.id ? 'bg-red-500' : 'bg-gray-700'}`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto pb-24">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />
            ))}
            <p className="text-center text-xs text-gray-600 mt-4">Fetching real-time data from OpenStreetMap...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">📍</span>
            <p className="text-gray-400 font-medium">No {activeFilter === 'all' ? 'services' : getTypeLabel(activeFilter as any)} found</p>
            <p className="text-gray-600 text-sm mt-1">within 25km of your location</p>
            {isOffline && (
              <p className="text-yellow-500 text-xs mt-3">Connect to internet to fetch live data</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((place, i) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* Main row */}
                <div className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 text-lg">
                    {getTypeIcon(place.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{place.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        place.type === 'hospital' ? 'bg-blue-900/40 text-blue-400' :
                        place.type === 'police' ? 'bg-indigo-900/40 text-indigo-400' :
                        place.type === 'fire_station' ? 'bg-orange-900/40 text-orange-400' :
                        place.type === 'pharmacy' ? 'bg-green-900/40 text-green-400' :
                        'bg-purple-900/40 text-purple-400'
                      }`}>
                        {getTypeLabel(place.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {place.distance ? `${place.distance.toFixed(1)} km` : '—'}
                      </span>
                      {place.address && (
                        <span className="text-xs text-gray-600 truncate max-w-[140px]">{place.address}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="w-8 h-8 rounded-full bg-green-900/30 border border-green-500/20 flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3.5 h-3.5 text-green-400" />
                      </a>
                    )}
                    <button
                      onClick={() => openInMaps(place)}
                      className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === place.id ? null : place.id)}
                      className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"
                    >
                      {expandedId === place.id
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedId === place.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-800 px-3 py-3 space-y-2"
                    >
                      {place.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-400">{place.address}</p>
                        </div>
                      )}
                      {place.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          <a href={`tel:${place.phone}`} className="text-xs text-green-400">{place.phone}</a>
                        </div>
                      )}
                      {place.openingHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          <p className="text-xs text-gray-400">{place.openingHours}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => openInMaps(place)}
                          className="flex-1 py-2 bg-blue-900/30 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Navigation className="w-3 h-3" /> Get Directions
                        </button>
                        {place.phone && (
                          <a
                            href={`tel:${place.phone}`}
                            className="flex-1 py-2 bg-green-900/30 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            <Phone className="w-3 h-3" /> Call Now
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="map" />
    </div>
  );
}
