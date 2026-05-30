import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, AlertTriangle } from 'lucide-react';

export default function OfflineBanner() {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-orange-600 px-4 py-2 flex items-center gap-2"
    >
      <WifiOff className="w-4 h-4 text-white flex-shrink-0" />
      <div className="flex-1">
        <p className="text-white text-xs font-semibold">You are offline</p>
        <p className="text-orange-100 text-xs">Emergency guides available. Call 108 for help.</p>
      </div>
      <a href="tel:108" className="flex-shrink-0 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
        Call 108
      </a>
    </motion.div>
  );
}
