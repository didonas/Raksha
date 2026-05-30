import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface SOSButtonProps {
  onPress: () => void;
  isActive?: boolean;
  isLoading?: boolean;
  mode?: 'victim' | 'bystander';
  disabled?: boolean;
}

export default function SOSButton({ onPress, isActive = false, isLoading = false, mode = 'victim', disabled = false }: SOSButtonProps) {
  const buttonColor = mode === 'bystander' ? '#ea580c' : '#dc2626';
  const buttonColorDark = mode === 'bystander' ? '#9a3412' : '#991b1b';

  const handlePress = useCallback(() => {
    if (disabled || isLoading) return;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    onPress();
  }, [disabled, isLoading, onPress]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      {/* Pulsing rings */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ borderColor: `${buttonColor}50`, width: 180 + i * 30, height: 180 + i * 30 }}
          animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}

      {/* Main button */}
      <motion.button
        onClick={handlePress}
        disabled={disabled || isLoading}
        whileTap={{ scale: 0.93 }}
        animate={isActive ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={isActive ? { duration: 1.5, repeat: Infinity } : { duration: 0.1 }}
        className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center cursor-pointer select-none"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${buttonColor}dd, ${buttonColorDark})`,
          boxShadow: isActive
            ? `0 0 40px ${buttonColor}80, 0 0 80px ${buttonColor}40, inset 0 2px 4px rgba(255,255,255,0.2)`
            : `0 0 20px ${buttonColor}50, 0 8px 32px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.15)`,
          border: `8px solid ${buttonColor}`,
          outline: `4px solid ${buttonColor}60`,
        }}
      >
        {isLoading ? (
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        ) : isActive ? (
          <>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
              <Shield className="w-10 h-10 text-white mb-1" />
            </motion.div>
            <span className="text-white font-bold text-sm tracking-widest">ACTIVE</span>
          </>
        ) : (
          <span className="text-white font-black text-5xl tracking-widest" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            SOS
          </span>
        )}

        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
        }} />
      </motion.button>
    </div>
  );
}
