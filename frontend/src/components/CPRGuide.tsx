import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, Heart } from 'lucide-react';

interface CPRGuideProps {
  onClose: () => void;
}

const CPR_STEPS = [
  { phase: 'check', title: 'Check Responsiveness', instruction: 'Tap shoulders firmly and shout "Are you okay?"', duration: 5 },
  { phase: 'call', title: 'Call for Help', instruction: 'Call 108 or ask someone nearby to call. Put on speaker.', duration: 5 },
  { phase: 'position', title: 'Position Hands', instruction: 'Place heel of hand on center of chest (lower half of breastbone). Place other hand on top, interlace fingers.', duration: 8 },
  { phase: 'compress', title: 'Chest Compressions', instruction: 'Push down hard and fast. At least 2 inches deep. 100-120 per minute.', duration: 30, isCompressions: true },
  { phase: 'breathe', title: 'Rescue Breaths', instruction: 'Tilt head back, lift chin. Pinch nose. Give 2 breaths, each lasting 1 second.', duration: 5, isBreaths: true },
];

export default function CPRGuide({ onClose }: CPRGuideProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(3); // Start at compressions
  const [compressionCount, setCompressionCount] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const compressionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // CPR rhythm: 100 BPM = 600ms per compression
  const COMPRESSION_INTERVAL = 600;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      if (currentStep === 3) {
        // Compressions phase
        compressionIntervalRef.current = setInterval(() => {
          setIsCompressing((c) => !c);
          setCompressionCount((n) => {
            if (n >= 29) {
              // Switch to breaths
              setCurrentStep(4);
              setCompressionCount(0);
              if (compressionIntervalRef.current) clearInterval(compressionIntervalRef.current);
              return 0;
            }
            return n + 1;
          });
        }, COMPRESSION_INTERVAL);
      } else if (currentStep === 4) {
        // Breaths phase - 2 breaths then back to compressions
        const breathTimer = setTimeout(() => {
          setBreathCount((b) => b + 1);
          setTimeout(() => {
            setBreathCount((b) => b + 1);
            setTimeout(() => {
              setCycleCount((c) => c + 1);
              setCurrentStep(3);
              setBreathCount(0);
            }, 2000);
          }, 2000);
        }, 1000);
        return () => clearTimeout(breathTimer);
      }
    } else {
      if (compressionIntervalRef.current) clearInterval(compressionIntervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (compressionIntervalRef.current) clearInterval(compressionIntervalRef.current);
    };
  }, [isRunning, currentStep]);

  const reset = () => {
    setIsRunning(false);
    setCurrentStep(3);
    setCompressionCount(0);
    setBreathCount(0);
    setCycleCount(0);
    setElapsedSeconds(0);
    setIsCompressing(false);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-dark-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          <h2 className="font-bold text-white">CPR Guide</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-gray-400">{formatTime(elapsedSeconds)}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center">
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Emergency reminder */}
        <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-xl flex items-center gap-2">
          <span className="text-lg">📞</span>
          <div>
            <p className="text-xs font-bold text-red-300">CALL 108 FIRST</p>
            <a href="tel:108" className="text-xs text-red-400 underline">Tap to call 108 now</a>
          </div>
        </div>

        {/* CPR Animation */}
        <div className="flex flex-col items-center py-4">
          {currentStep === 3 ? (
            <div className="relative">
              {/* Chest visualization */}
              <motion.div
                animate={isRunning ? { scaleY: isCompressing ? 0.85 : 1 } : { scaleY: 1 }}
                transition={{ duration: 0.15 }}
                className="w-32 h-40 bg-gradient-to-b from-gray-600 to-gray-700 rounded-2xl border border-gray-500 flex items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Heart className="w-12 h-12 text-red-400/30" />
                </div>
                {/* Hands */}
                <motion.div
                  animate={isRunning ? { y: isCompressing ? 8 : 0 } : { y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-8 bg-amber-600 rounded-lg border border-amber-500"
                />
              </motion.div>

              {/* Compression counter */}
              <div className="absolute -right-16 top-1/2 -translate-y-1/2 text-center">
                <p className="text-3xl font-bold text-white">{compressionCount}</p>
                <p className="text-xs text-gray-400">/ 30</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full bg-blue-600/20 border-2 border-blue-500/40 flex items-center justify-center">
                <span className="text-5xl">💨</span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">Breath {breathCount + 1}/2</p>
                <p className="text-sm text-gray-400">1 second each</p>
              </div>
            </div>
          )}
        </div>

        {/* Current instruction */}
        <div className={`p-4 rounded-2xl border ${currentStep === 3 ? 'bg-red-600/10 border-red-500/30' : 'bg-blue-600/10 border-blue-500/30'}`}>
          <p className="text-xs text-gray-400 mb-1">{currentStep === 3 ? 'COMPRESSIONS' : 'RESCUE BREATHS'}</p>
          <p className="font-semibold text-white">{CPR_STEPS[currentStep]?.title}</p>
          <p className="text-sm text-gray-300 mt-1">{CPR_STEPS[currentStep]?.instruction}</p>
        </div>

        {/* Rhythm guide */}
        {currentStep === 3 && (
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-2">Rhythm: 100-120 compressions/minute</p>
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1 h-6 rounded bg-red-600/30"
                  animate={isRunning ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.3 }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.06 }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Cycle counter */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{cycleCount}</p>
            <p className="text-xs text-gray-400">Cycles</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-400">{compressionCount}</p>
            <p className="text-xs text-gray-400">Compressions</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{breathCount}</p>
            <p className="text-xs text-gray-400">Breaths</p>
          </div>
        </div>

        {/* Steps overview */}
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">CPR Steps</p>
          {CPR_STEPS.map((step, i) => (
            <div key={step.phase} className={`flex items-center gap-2 py-1.5 ${i < CPR_STEPS.length - 1 ? 'border-b border-white/5' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i === currentStep ? 'bg-red-600 text-white' : i < currentStep ? 'bg-green-600/20 text-green-400' : 'bg-gray-700 text-gray-500'
              }`}>{i + 1}</div>
              <p className={`text-sm ${i === currentStep ? 'text-white font-medium' : 'text-gray-400'}`}>{step.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-6 pt-3 border-t border-white/10 flex gap-3">
        <button onClick={reset} className="w-12 h-12 rounded-xl glass flex items-center justify-center">
          <RotateCcw className="w-5 h-5 text-gray-300" />
        </button>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
            isRunning ? 'bg-orange-600 text-white' : 'bg-red-600 text-white shadow-emergency'
          }`}
        >
          {isRunning ? <><Pause className="w-5 h-5" />Pause</> : <><Play className="w-5 h-5" />Start CPR</>}
        </button>
      </div>
    </motion.div>
  );
}
