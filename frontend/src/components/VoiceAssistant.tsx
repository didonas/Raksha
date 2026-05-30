import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

interface VoiceAssistantProps {
  emergencyType?: string;
  onClose?: () => void;
  compact?: boolean;
}

export default function VoiceAssistant({ emergencyType, onClose, compact = false }: VoiceAssistantProps) {
  const {
    isListening,
    isSpeaking,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    speakEmergencyInstructions,
    toggleListening,
  } = useVoiceAssistant([
    { command: 'call ambulance', action: () => window.location.href = 'tel:108', description: 'Calling ambulance' },
    { command: 'call 108', action: () => window.location.href = 'tel:108', description: 'Calling 108' },
    { command: 'help', action: () => speakEmergencyInstructions(emergencyType || 'General'), description: 'Reading emergency instructions' },
  ]);

  if (!isSupported) {
    return compact ? null : (
      <div className="p-3 bg-gray-700/30 rounded-xl text-center">
        <p className="text-xs text-gray-400">Voice assistant not supported in this browser</p>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={toggleListening}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isListening ? 'bg-red-600 shadow-emergency' : 'glass'
        }`}
      >
        {isListening ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
            <Mic className="w-4 h-4 text-white" />
          </motion.div>
        ) : (
          <Mic className="w-4 h-4 text-gray-300" />
        )}
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-400 status-pulse-red' : isSpeaking ? 'bg-blue-400' : 'bg-gray-500'}`} />
          <h3 className="font-semibold text-white text-sm">Voice Assistant</h3>
          <span className="text-xs text-gray-500">EN-IN</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-6 h-6 rounded-full glass flex items-center justify-center">
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Status */}
      <div className="text-center mb-4">
        {isListening && (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-flex items-center gap-2 text-red-400 text-sm"
          >
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-red-400 rounded-full"
                  animate={{ height: [8, 20, 8] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>
            Listening...
          </motion.div>
        )}
        {isSpeaking && (
          <div className="inline-flex items-center gap-2 text-blue-400 text-sm">
            <Volume2 className="w-4 h-4" />
            Speaking...
          </div>
        )}
        {transcript && !isListening && (
          <p className="text-xs text-gray-400 italic">"{transcript}"</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={toggleListening}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isListening ? 'bg-red-600 shadow-emergency' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>
        <button
          onClick={() => emergencyType ? speakEmergencyInstructions(emergencyType) : speak('Emergency assistance activated. Stay calm. Help is on the way.')}
          className="w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center hover:bg-blue-600/30 transition-all"
        >
          <Volume2 className="w-6 h-6 text-blue-400" />
        </button>
        {isSpeaking && (
          <button onClick={stopSpeaking} className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center">
            <VolumeX className="w-6 h-6 text-gray-300" />
          </button>
        )}
      </div>

      {/* Commands */}
      <div className="mt-4 p-3 bg-white/5 rounded-xl">
        <p className="text-xs text-gray-400 mb-2">Voice Commands:</p>
        <div className="space-y-1">
          {['"Call ambulance"', '"Call 108"', '"Help"'].map((cmd) => (
            <p key={cmd} className="text-xs text-gray-500">• {cmd}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
