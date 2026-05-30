import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, MapPin, Clock, AlertTriangle, Navigation, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEmergencyStore } from '../store/emergencyStore';
import { useAuthStore } from '../store/authStore';
import { useGeolocation } from '../hooks/useGeolocation';
import { useEmergency } from '../hooks/useEmergency';

export default function SOSActive() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeEmergency, eta, ambulancePosition } = useEmergencyStore();
  const { cancelEmergency, isCancelling } = useEmergency();
  const { lat, lng } = useGeolocation({ enableHighAccuracy: true });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notifyingContacts, setNotifyingContacts] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Vibrate on mount
  useEffect(() => {
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
    setNotifyingContacts(true);
    const timer = setTimeout(() => setNotifyingContacts(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-redirect removed — user navigates manually via "Track Ambulance Live" button

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleCancel = async () => {
    await cancelEmergency();
    setShowCancelConfirm(false);
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col relative overflow-hidden">
      {/* Animated red background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-dark-900 to-dark-900" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-3xl"
        />
      </div>

      {/* Expanding rings */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 pointer-events-none">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-red-500/30"
            style={{ width: 100 + i * 80, height: 100 + i * 80, top: -(50 + i * 40), left: -(50 + i * 40) }}
            animate={{ scale: [1, 2], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 pt-12 pb-6 text-center px-4">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 rounded-full px-4 py-2 mb-4"
        >
          <div className="w-2 h-2 bg-red-400 rounded-full status-pulse-red" />
          <span className="text-red-300 font-bold text-sm tracking-widest">EMERGENCY ACTIVATED</span>
        </motion.div>

        <h1 className="text-3xl font-bold font-emergency text-white mb-2">Help is Coming</h1>

        {activeEmergency && (
          <div className="inline-flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5">
            <span className="text-xs text-gray-400">Emergency ID:</span>
            <span className="text-xs font-mono text-red-300 font-bold">{activeEmergency.emergency_id_code}</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="relative z-10 px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-red rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <p className="text-lg font-mono font-bold text-white">{formatElapsed(elapsedSeconds)}</p>
            <p className="text-xs text-gray-400">Elapsed</p>
          </div>
          <div className="glass-red rounded-xl p-3 text-center">
            <Navigation className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{eta ? `${eta}m` : '--'}</p>
            <p className="text-xs text-gray-400">ETA</p>
          </div>
          <div className="glass-red rounded-xl p-3 text-center">
            <MapPin className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-xs font-mono text-white">{lat ? lat.toFixed(4) : '--'}</p>
            <p className="text-xs font-mono text-white">{lng ? lng.toFixed(4) : '--'}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 flex-1">

        {/* Ambulance Info */}
        {activeEmergency?.ambulance && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 glass rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center text-2xl ambulance-moving">
                  🚑
                </div>
                <div>
                  <p className="font-semibold text-white">{activeEmergency.ambulance.driver?.name || 'Driver Assigned'}</p>
                  <p className="text-xs text-gray-400">{activeEmergency.ambulance.vehicle_number}</p>
                  {activeEmergency.ambulance.driver?.rating && (
                    <p className="text-xs text-yellow-400">⭐ {activeEmergency.ambulance.driver.rating}</p>
                  )}
                </div>
              </div>
              {activeEmergency.ambulance.driver?.phone && (
                <a href={`tel:${activeEmergency.ambulance.driver.phone}`}
                  className="w-10 h-10 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-400" />
                </a>
              )}
            </div>
          </motion.div>
        )}

        {/* Notifying contacts */}
        <AnimatePresence>
          {notifyingContacts && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"
            >
              <Loader className="w-4 h-4 text-blue-400 animate-spin" />
              <p className="text-xs text-blue-300">Notifying your emergency contacts...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 px-4 pb-8 pt-4 space-y-3">
        {activeEmergency && (
          <button
            onClick={() => navigate(`/tracking/${activeEmergency.id}`)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Navigation className="w-4 h-4" />
            Track Ambulance Live
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <a href="tel:108" className="py-3 bg-green-600/20 border border-green-500/30 text-green-400 font-semibold rounded-xl flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            Call 108
          </a>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="py-3 bg-gray-700/50 border border-gray-600 text-gray-300 font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel SOS
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <h3 className="text-lg font-bold text-white">Cancel Emergency?</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to cancel this emergency? This will notify the ambulance driver and release the unit.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowCancelConfirm(false)} className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-xl font-medium">
                  Keep Active
                </button>
                <button onClick={handleCancel} disabled={isCancelling} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                  {isCancelling ? <Loader className="w-4 h-4 animate-spin" /> : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
