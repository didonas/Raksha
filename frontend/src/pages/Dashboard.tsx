import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Phone, ChevronRight, MapPin, Shield, Navigation, WifiOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useEmergencyStore } from '../store/emergencyStore';
import SOSButton from '../components/SOSButton';
import BottomNav from '../components/BottomNav';
import NotificationPanel from '../components/NotificationPanel';
import OfflineBanner from '../components/OfflineBanner';
import PermissionRequest from '../components/PermissionRequest';
import { useGeolocation } from '../hooks/useGeolocation';
import { useEmergency } from '../hooks/useEmergency';
import {
  saveHospitals, getHospitals, saveLastLocation, getLastLocation
} from '../utils/offlineStorage';
import {
  sendLocationToSW, storeTokenInSWCache, onSWMessage,
  getCachedHospitalsFromSW, triggerBackgroundSync
} from '../utils/backgroundSync';
import {
  fetchNearbyServices, getNearbyServicesCache, filterByType, NearbyPlace
} from '../utils/nearbyServices';

interface NearbyHospital {
  id: string;
  name: string;
  distance: number;
  icu_available: number;
  trauma_support: boolean;
  phone: string;
}

// Global emergency numbers by country code
const GLOBAL_EMERGENCY: Record<string, { ambulance: string; police: string; fire: string; label: string }> = {
  IN: { ambulance: '108', police: '100', fire: '101', label: 'India' },
  US: { ambulance: '911', police: '911', fire: '911', label: 'USA' },
  GB: { ambulance: '999', police: '999', fire: '999', label: 'UK' },
  AU: { ambulance: '000', police: '000', fire: '000', label: 'Australia' },
  DE: { ambulance: '112', police: '110', fire: '112', label: 'Germany' },
  FR: { ambulance: '15', police: '17', fire: '18', label: 'France' },
  DEFAULT: { ambulance: '112', police: '112', fire: '112', label: 'International' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { sosActive } = useEmergencyStore();
  const { lat, lng } = useGeolocation({ enableHighAccuracy: true });
  const { triggerSOS, isTriggering } = useEmergency();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotifications, setShowNotifications] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyPlace[]>([]);
  const [mode, setMode] = useState<'victim' | 'bystander'>('victim');
  const [countryCode] = useState('IN');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const permissionAsked = useRef(false);

  const { token } = useAuthStore();
  const emergency = GLOBAL_EMERGENCY[countryCode] || GLOBAL_EMERGENCY.DEFAULT;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save location for offline use + send to SW for background caching
  useEffect(() => {
    if (lat && lng) {
      saveLastLocation(lat, lng);
      if (token) {
        sendLocationToSW(lat, lng, token);
        storeTokenInSWCache(token);
      }
    }
  }, [lat, lng, token]);

  // Show permission prompt once after first GPS fix
  useEffect(() => {
    if (lat && lng && !permissionAsked.current) {
      const alreadyAsked = localStorage.getItem('raksha_permissions_asked');
      if (!alreadyAsked) {
        permissionAsked.current = true;
        setTimeout(() => setShowPermissionPrompt(true), 2000);
      }
    }
  }, [lat, lng]);

  // Listen for SW hospital updates
  useEffect(() => {
    const unsub = onSWMessage((data) => {
      if (data.type === 'HOSPITALS_UPDATED') {
        getCachedHospitalsFromSW().then((hospitals) => {
          if (hospitals.length > 0) setNearbyHospitals(hospitals);
        });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const loadHospitals = async () => {
      const userLat = lat || getLastLocation()?.lat;
      const userLng = lng || getLastLocation()?.lng;

      // Try cache first
      const { places: cached } = getNearbyServicesCache();
      const cachedHospitals = filterByType(cached, 'hospital');
      if (cachedHospitals.length > 0) setNearbyHospitals(cachedHospitals);

      if (!userLat || !userLng || !navigator.onLine) return;

      try {
        const results = await fetchNearbyServices(userLat, userLng);
        const hospitals = filterByType(results, 'hospital');
        setNearbyHospitals(hospitals);
        triggerBackgroundSync();
      } catch {}
    };
    loadHospitals();
  }, [lat, lng]);

  const handleSOS = async () => {
    // Trigger SOS API call
    await triggerSOS({ emergency_type: 'General', severity: 'High' });
    // Navigate to appropriate flow
    navigate(mode === 'victim' ? '/victim' : '/bystander');
  };

  // Open Google Maps search for nearby services
  const openNearbySearch = (query: string) => {
    const location = lat && lng ? `@${lat},${lng},15z` : '';
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/${location}`;
    window.open(url, '_blank');
  };

  const nearbyServices = [
    {
      icon: '🏥', label: 'Hospitals', color: 'from-blue-900/60 to-blue-800/40 border-blue-500/30',
      action: () => navigate('/hospitals'),
    },
    {
      icon: '🚔', label: 'Police', color: 'from-indigo-900/60 to-indigo-800/40 border-indigo-500/30',
      action: () => openNearbySearch('police station near me'),
    },
    {
      icon: '🚑', label: 'Ambulance', color: 'from-red-900/60 to-red-800/40 border-red-500/30',
      action: () => window.location.href = `tel:${emergency.ambulance}`,
    },
    {
      icon: '🔧', label: 'Towing', color: 'from-yellow-900/60 to-yellow-800/40 border-yellow-500/30',
      action: () => openNearbySearch('vehicle towing service near me'),
    },
    {
      icon: '🛞', label: 'Puncture', color: 'from-orange-900/60 to-orange-800/40 border-orange-500/30',
      action: () => openNearbySearch('tyre puncture shop near me'),
    },
    {
      icon: '🏪', label: 'Showroom', color: 'from-purple-900/60 to-purple-800/40 border-purple-500/30',
      action: () => openNearbySearch('car service center near me'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {!isOnline && <OfflineBanner />}

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500" />
          <span className="text-xl font-black text-white tracking-wide">RAKSHA</span>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && <WifiOff className="w-4 h-4 text-yellow-400" />}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-700 transition"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 bg-red-600/20 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 font-bold text-sm"
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-5 space-y-6 pb-28 overflow-y-auto">

        {/* GPS status bar */}
        <div className="w-full flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${lat && lng ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`} />
          <span className="text-xs font-medium text-gray-400 truncate">
            {lat && lng
              ? `GPS Active — ${lat.toFixed(5)}, ${lng.toFixed(5)}`
              : isOnline ? 'Acquiring GPS...' : `Offline — using last known location`}
          </span>
          {lat && lng && (
            <a
              href={`https://maps.google.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex-shrink-0"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
            </a>
          )}
        </div>

        {/* Victim / Bystander Toggle */}
        <div className="w-full flex items-center justify-center gap-5">
          <span
            onClick={() => setMode('victim')}
            className={`font-bold text-base cursor-pointer transition-colors ${mode === 'victim' ? 'text-white' : 'text-gray-600'}`}
          >
            Victim
          </span>
          <div
            className="relative w-16 h-8 rounded-full cursor-pointer overflow-hidden flex-shrink-0"
            style={{ backgroundColor: mode === 'victim' ? '#dc2626' : '#ea580c' }}
            onClick={() => setMode(mode === 'victim' ? 'bystander' : 'victim')}
          >
            <motion.div
              className="absolute top-1 bottom-1 w-6 bg-white rounded-full shadow"
              animate={{ left: mode === 'victim' ? '4px' : '38px' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </div>
          <span
            onClick={() => setMode('bystander')}
            className={`font-bold text-base cursor-pointer transition-colors ${mode === 'bystander' ? 'text-white' : 'text-gray-600'}`}
          >
            Bystander
          </span>
        </div>

        {/* SOS Button */}
        <div className="flex flex-col items-center gap-3">
          <SOSButton
            onPress={handleSOS}
            isActive={sosActive}
            isLoading={isTriggering}
            mode={mode}
          />
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs font-semibold text-gray-500 tracking-widest uppercase"
          >
            {mode === 'victim' ? 'Tap — I Need Help' : 'Tap — Helping Someone'}
          </motion.p>
        </div>

        {/* Global Emergency Numbers */}
        <div className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Emergency Numbers — {emergency.label}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ambulance', number: emergency.ambulance, color: 'bg-red-600/20 border-red-500/30 text-red-400' },
              { label: 'Police', number: emergency.police, color: 'bg-blue-600/20 border-blue-500/30 text-blue-400' },
              { label: 'Fire', number: emergency.fire, color: 'bg-orange-600/20 border-orange-500/30 text-orange-400' },
            ].map((item) => (
              <a
                key={item.label}
                href={`tel:${item.number}`}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${item.color} active:scale-95 transition-all`}
              >
                <span className="text-lg font-black">{item.number}</span>
                <span className="text-[10px] font-semibold opacity-80">{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Nearby Services Grid */}
        <div className="w-full">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nearby Services</h3>
          <div className="grid grid-cols-3 gap-3">
            {nearbyServices.map((s) => (
              <motion.button
                key={s.label}
                whileTap={{ scale: 0.95 }}
                onClick={s.action}
                className={`bg-gradient-to-br ${s.color} border rounded-2xl p-3 flex flex-col items-center gap-1.5 transition-all`}
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-semibold text-gray-300">{s.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Nearby Hospitals */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Nearby Hospitals {!isOnline && <span className="text-yellow-500">(cached)</span>}
            </h3>
            <button onClick={() => navigate('/hospitals')} className="text-xs text-red-400 font-semibold flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {nearbyHospitals.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
              <p className="text-sm text-gray-500">
                {isOnline ? 'Fetching nearby hospitals...' : 'No cached hospitals. Connect to internet once to cache.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {nearbyHospitals.slice(0, 4).map((hospital, i) => (
                <div key={hospital.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-900/40 border border-blue-500/20 flex items-center justify-center">
                      <span className="text-base">🏥</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white truncate max-w-[150px]">{hospital.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500">{hospital.distance?.toFixed(1)} km</p>
                        {i === 0 && (
                          <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded-full">Nearest</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {hospital.phone ? (
                    <a href={`tel:${hospital.phone}`} className="w-8 h-8 rounded-full bg-green-900/30 border border-green-500/20 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-green-400" />
                    </a>
                  ) : (
                    <button
                      onClick={() => window.open(`https://maps.google.com/?q=${hospital.lat},${hospital.lng}`, '_blank')}
                      className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-500/20 flex items-center justify-center"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="w-full">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '📍', label: 'Share Location', action: () => {
                const loc = (lat && lng) ? { lat, lng } : getLastLocation();
                if (loc) {
                  navigator.clipboard?.writeText(`https://maps.google.com/?q=${loc.lat},${loc.lng}`);
                  toast.success('Location link copied!');
                } else toast.error('Location not available');
              }},
              { icon: '📋', label: 'History', action: () => navigate('/history') },
              { icon: '⚙️', label: 'Settings', action: () => navigate('/profile') },
            ].map((a) => (
              <button
                key={a.label}
                onClick={a.action}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:bg-gray-800 active:scale-95 transition-all"
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-semibold text-gray-400">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

      </main>

      <BottomNav active="home" />

      <AnimatePresence>
        {showNotifications && <NotificationPanel onClose={() => setShowNotifications(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showPermissionPrompt && (
          <PermissionRequest
            onDone={(result) => {
              setShowPermissionPrompt(false);
              localStorage.setItem('raksha_permissions_asked', 'true');
              if (result.location || result.notifications) {
                toast.success('Background protection enabled — services cached within 25km', { duration: 4000 });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
