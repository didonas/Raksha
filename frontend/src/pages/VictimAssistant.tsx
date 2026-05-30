/**
 * VictimAssistant — Neuroscience-informed color palette:
 * - Deep navy (#0f172a) background: reduces panic, promotes calm focus
 * - Amber (#f59e0b) for warnings: triggers caution without fear response
 * - Teal (#0d9488) for instructions: trust, clarity, safety
 * - Red (#dc2626) only for critical/urgent: preserves urgency signal
 * - Green (#16a34a) for positive/safe states: reduces anxiety
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, ChevronRight, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { emergencyAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

const INJURIES = [
  { id: 'Chest Pain', icon: '❤️', label: 'Chest Pain' },
  { id: 'Leg Injured', icon: '🦵', label: 'Leg Injured' },
  { id: 'Hand Injured', icon: '✋', label: 'Hand Injured' },
  { id: 'Head Pain', icon: '🤕', label: 'Head Pain' },
  { id: 'Bleeding', icon: '🩸', label: 'Bleeding' },
  { id: 'Burns', icon: '🔥', label: 'Burns' },
  { id: 'Breathing', icon: '🫁', label: 'Breathing Difficulty' },
  { id: 'Other', icon: '🆘', label: 'Other' },
];

const FIRST_AID: Record<string, { warning: string; action: string; steps: string[] }> = {
  'Chest Pain': {
    warning: 'Do not move. Sit or lie in a comfortable position. Loosen tight clothing.',
    action: 'If pain spreads to arm or jaw, this may be a heart attack. Stay calm and still.',
    steps: ['Sit or lie down comfortably', 'Loosen tight clothing', 'Do not eat or drink', 'Chew aspirin if available and not allergic', 'Wait for ambulance'],
  },
  'Leg Injured': {
    warning: 'Do not put weight on the injured leg. Keep it elevated if possible.',
    action: 'If bleeding, press firmly using a clean cloth. Do not remove embedded objects.',
    steps: ['Keep leg still and elevated', 'Apply firm pressure to bleeding', 'Do not try to straighten a broken bone', 'Immobilize with available materials', 'Wait for help'],
  },
  'Hand Injured': {
    warning: 'Keep your hand raised above heart level to reduce swelling.',
    action: 'Apply firm pressure with a clean cloth to stop bleeding.',
    steps: ['Raise hand above heart level', 'Apply pressure to bleeding', 'Remove rings/jewelry if possible', 'Cover with clean cloth', 'Wait for help'],
  },
  'Head Pain': {
    warning: 'Do not move in case of neck or spine injury. Stay still.',
    action: 'If bleeding from head, apply gentle pressure. Do not press on skull fractures.',
    steps: ['Stay completely still', 'Do not move neck or head', 'Apply gentle pressure to bleeding', 'Stay awake and alert', 'Wait for ambulance'],
  },
  'Bleeding': {
    warning: 'Do not remove anything stuck in the wound.',
    action: 'Press hard using a clean cloth. Keep applying pressure continuously without checking.',
    steps: ['Apply direct firm pressure', 'Use clean cloth or clothing', 'Do not remove cloth — add more on top', 'Elevate injured area above heart', 'Maintain pressure 10-15 minutes'],
  },
  'Burns': {
    warning: 'Do not apply ice, butter, or toothpaste on burns.',
    action: 'Cool the burn with cool (not cold) running water for at least 10 minutes.',
    steps: ['Cool with running water 10+ min', 'Do not use ice or butter', 'Remove jewelry near burn', 'Cover loosely with clean cloth', 'Do not burst blisters'],
  },
  'Breathing': {
    warning: 'Sit upright. Loosen any tight clothing around neck and chest.',
    action: 'If using an inhaler, use it now. Stay calm and breathe slowly.',
    steps: ['Sit upright — do not lie flat', 'Loosen clothing around neck/chest', 'Use inhaler if available', 'Stay calm — breathe slowly', 'Open windows for fresh air'],
  },
  'Other': {
    warning: 'Do not move unless you are in immediate danger.',
    action: 'Try to stop any bleeding immediately. Press hard using a clean cloth.',
    steps: ['Stay calm and still', 'Control any bleeding with pressure', 'Keep warm', 'Do not eat or drink', 'Wait for ambulance'],
  },
};

type Screen = 'injuries' | 'aid' | 'final';

export default function VictimAssistant() {
  const navigate = useNavigate();
  const { lat, lng } = useGeolocation({ enableHighAccuracy: true });
  const [screen, setScreen] = useState<Screen>('injuries');
  const [selectedInjury, setSelectedInjury] = useState('');
  const [history, setHistory] = useState<Screen[]>([]);
  const [smsSent, setSmsSent] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);

  const goTo = (s: Screen) => { setHistory((h) => [...h, screen]); setScreen(s); };
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setScreen(prev);
    } else navigate('/dashboard');
  };

  const aid = FIRST_AID[selectedInjury] || FIRST_AID['Other'];

  // Send detailed SMS when injury is selected
  const sendDetailsSMS = async (injury: string) => {
    setSendingSMS(true);
    try {
      await emergencyAPI.sendDetailsSMS({
        lat: lat || undefined,
        lng: lng || undefined,
        role: 'victim',
        injury_type: injury,
      });
      setSmsSent(true);
      toast.success('Details sent to emergency contacts', { icon: '📱' });
    } catch (err) {
      console.log('[SMS] Details SMS failed — continuing');
    } finally {
      setSendingSMS(false);
    }
  };

  const handleInjurySelect = (injury: string) => {
    setSelectedInjury(injury);
    sendDetailsSMS(injury);
    goTo('aid');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}>
      {/* Header */}
      <header className="px-4 py-3 flex items-center gap-3 sticky top-0 z-20 border-b border-white/5"
        style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={goBack} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-lg font-black text-white tracking-wide flex-1">RAKSHA</span>
        {sendingSMS && (
          <span className="flex items-center gap-1.5 text-xs text-teal-400 animate-pulse">
            <Send className="w-3 h-3" /> Sending details...
          </span>
        )}
        {smsSent && (
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle className="w-3 h-3" /> Details sent
          </span>
        )}
        <a href="tel:108" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-red-500/40 text-red-400 text-xs font-bold"
          style={{ background: 'rgba(220,38,38,0.1)' }}>
          <Phone className="w-3.5 h-3.5" /> Call 108
        </a>
      </header>

      <main className="flex-1 px-4 py-5 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* Screen 1: Injury Selection */}
          {screen === 'injuries' && (
            <motion.div key="injuries" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-black text-white mb-1 text-center">Where are you injured?</h2>
              <p className="text-slate-400 text-sm text-center mb-5">Select what best describes your situation</p>
              <div className="grid grid-cols-1 gap-2.5">
                {INJURIES.map((inj) => (
                  <button
                    key={inj.id}
                    onClick={() => handleInjurySelect(inj.id)}
                    className="w-full text-left p-4 rounded-2xl font-semibold text-slate-200 flex items-center gap-3 transition active:scale-98 border"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  >
                    <span className="text-2xl w-8">{inj.icon}</span>
                    <span>{inj.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleInjurySelect('Other')}
                className="w-full mt-4 text-center text-slate-500 hover:text-slate-300 font-bold tracking-wide py-3 uppercase text-sm border border-dashed rounded-2xl transition"
                style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
              >
                Skip → Get General First Aid
              </button>
            </motion.div>
          )}

          {/* Screen 2: First Aid */}
          {screen === 'aid' && (
            <motion.div key="aid" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-xl font-black text-white text-center mb-2">First Aid — {selectedInjury}</h2>

              {/* SMS sent confirmation */}
              {smsSent && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl border border-teal-500/30"
                  style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <p className="text-xs text-teal-300 font-medium">
                    Emergency details with your location sent to all contacts
                  </p>
                </motion.div>
              )}

              {/* Warning — Amber (caution without fear) */}
              <div className="p-4 rounded-2xl border-l-4 border-amber-500"
                style={{ background: 'rgba(245,158,11,0.08)' }}>
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-amber-400 uppercase tracking-wide text-xs mb-1">CRITICAL INSTRUCTION</h3>
                    <p className="text-amber-200/90 font-medium leading-relaxed text-sm">{aid.warning}</p>
                  </div>
                </div>
              </div>

              {/* Immediate action — Red (urgent) */}
              <div className="p-4 rounded-2xl border-l-4 border-red-500"
                style={{ background: 'rgba(220,38,38,0.08)' }}>
                <div className="flex gap-3">
                  <span className="text-red-400 text-xl flex-shrink-0">🩸</span>
                  <div>
                    <h3 className="font-bold text-red-400 uppercase tracking-wide text-xs mb-1">IMMEDIATE ACTION</h3>
                    <p className="text-red-200/90 font-medium leading-relaxed text-sm">{aid.action}</p>
                  </div>
                </div>
              </div>

              {/* Steps — Teal (trust, clarity) */}
              <div className="p-4 rounded-2xl border" style={{ background: 'rgba(13,148,136,0.06)', borderColor: 'rgba(13,148,136,0.2)' }}>
                <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-3">Step-by-step</h3>
                {aid.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 mb-2.5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-teal-300 flex-shrink-0 border border-teal-500/30"
                      style={{ background: 'rgba(13,148,136,0.15)' }}>{i + 1}</span>
                    <p className="text-sm text-slate-300 pt-0.5">{step}</p>
                  </div>
                ))}
              </div>

              {/* Don't Panic — deep red with pulse */}
              <motion.div
                animate={{ scale: [1, 1.015, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="p-5 rounded-2xl text-center"
                style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', boxShadow: '0 0 30px rgba(220,38,38,0.3)' }}
              >
                <h2 className="text-2xl font-black tracking-wider uppercase mb-1 text-white">DON'T PANIC</h2>
                <p className="text-red-200 font-semibold">Help is on the way.</p>
              </motion.div>

              <button
                onClick={() => goTo('final')}
                className="w-full font-bold py-4 rounded-2xl uppercase tracking-wide transition active:scale-98 text-white"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Next — Emergency Contacts
              </button>
            </motion.div>
          )}

          {/* Screen 3: Final */}
          {screen === 'final' && (
            <motion.div key="final" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <h3 className="font-black text-white border-b pb-2 mb-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>🩺 First Aid Summary</h3>
                <ul className="text-sm text-slate-300 space-y-2">
                  {aid.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-teal-500 mt-0.5 flex-shrink-0">▶</span>{step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">📒 Emergency Contacts</h3>
                <div className="flex justify-between items-center p-4 rounded-2xl relative border border-green-500/20"
                  style={{ background: 'rgba(22,163,74,0.07)' }}>
                  <span className="absolute -top-2.5 right-4 bg-green-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">Recommended</span>
                  <div>
                    <p className="font-bold text-white">Nearest Hospital</p>
                    <p className="text-xs text-slate-500">Emergency Ward</p>
                  </div>
                  <a href="tel:108" className="w-11 h-11 rounded-full flex items-center justify-center border border-green-500/20 text-green-400"
                    style={{ background: 'rgba(22,163,74,0.12)' }}>
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
                <div className="flex justify-between items-center p-4 rounded-2xl border"
                  style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div>
                    <p className="font-bold text-white">108 Emergency</p>
                    <p className="text-xs text-slate-500">National Emergency Support</p>
                  </div>
                  <a href="tel:108" className="w-11 h-11 rounded-full flex items-center justify-center border border-red-500/20 text-red-400"
                    style={{ background: 'rgba(220,38,38,0.1)' }}>
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <button onClick={() => navigate('/dashboard')}
                className="w-full font-bold py-4 rounded-2xl uppercase tracking-wide transition text-white"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Back to Home
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
