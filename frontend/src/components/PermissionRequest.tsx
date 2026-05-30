import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Bell, RefreshCw, X, Shield } from 'lucide-react';
import { requestPermissions } from '../utils/backgroundSync';

interface PermissionRequestProps {
  onDone: (granted: { location: boolean; notifications: boolean }) => void;
}

export default function PermissionRequest({ onDone }: PermissionRequestProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'ask' | 'done'>('ask');

  const handleAllow = async () => {
    setLoading(true);
    const result = await requestPermissions();
    setLoading(false);
    setStep('done');
    setTimeout(() => onDone(result), 1200);
  };

  const handleSkip = () => {
    onDone({ location: false, notifications: false });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-8"
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl p-6 shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {step === 'ask' ? (
            <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-red-400" />
                </div>
              </div>

              <h2 className="text-xl font-black text-white text-center mb-1">Enable Background Protection</h2>
              <p className="text-sm text-gray-400 text-center mb-6">
                RAKSHA needs these permissions to cache nearby emergency services within <span className="text-white font-bold">25km</span> of your location — even when offline.
              </p>

              {/* Permission items */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 bg-gray-800 rounded-2xl p-3">
                  <div className="w-9 h-9 rounded-xl bg-green-900/40 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Location Access</p>
                    <p className="text-xs text-gray-500">Cache hospitals, police & services near you</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-800 rounded-2xl p-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-900/40 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Notifications</p>
                    <p className="text-xs text-gray-500">Receive emergency alerts even when app is closed</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-800 rounded-2xl p-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Background Sync</p>
                    <p className="text-xs text-gray-500">Auto-refresh nearby services every 30 minutes</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3 border border-gray-700 text-gray-400 rounded-2xl text-sm font-medium hover:bg-gray-800 transition"
                >
                  Not Now
                </button>
                <button
                  onClick={handleAllow}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : 'Allow All'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="text-5xl mb-3">✅</div>
              <h3 className="text-lg font-black text-white mb-1">Background Protection Active</h3>
              <p className="text-sm text-gray-400">Nearby services will be cached within 25km automatically.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
