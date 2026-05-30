/**
 * BystanderAssistant — Neuroscience-informed color palette:
 * - Deep navy/indigo background: calm, focused decision-making
 * - Amber for warnings: caution signal without panic
 * - Teal for instructions: trust and clarity
 * - Green for safe/positive: reduces bystander anxiety
 * - Red only for critical urgency
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, ChevronRight, Shield, CheckCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomNav from '../components/BottomNav';
import { emergencyAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

const ACCIDENT_TYPES = [
  { id: 'Cardiac arrest', icon: '💔', label: 'Cardiac Arrest' },
  { id: 'Vehicle accident', icon: '🚗', label: 'Vehicle Accident' },
  { id: 'Earthquake', icon: '🏚️', label: 'Earthquake' },
  { id: 'Fire accident', icon: '🔥', label: 'Fire Accident' },
  { id: 'Animal attack', icon: '🐾', label: 'Animal Attack' },
  { id: 'Drowning', icon: '🌊', label: 'Drowning' },
  { id: 'Fall injury', icon: '🦴', label: 'Fall / Fracture' },
  { id: 'Poisoning', icon: '☠️', label: 'Poisoning' },
  { id: 'Other', icon: '🆘', label: 'Other' },
];

const BLEEDING_STEPS = [
  'Apply direct pressure on the bleeding area.',
  'Press firmly using a clean cloth or garment.',
  'Keep applying pressure continuously without checking.',
  'If blood soaks through, add more cloth on top — do not remove.',
  'Keep the injured area elevated above heart level if possible.',
];

const ACCIDENT_INSTRUCTIONS: Record<string, string[]> = {
  'Cardiac arrest': ['Call 108 immediately.', 'Check if the person is responsive — tap shoulders and shout.', 'If unresponsive and not breathing, start CPR: 30 chest compressions, 2 rescue breaths.', 'Push hard and fast in the center of the chest (at least 2 inches deep).', 'Continue 30:2 ratio until ambulance arrives.'],
  'Vehicle accident': ['Do not move the victim unless there is immediate danger (fire, traffic).', 'Turn off the vehicle engine if safe to do so.', 'Check for breathing and pulse.', 'Control any bleeding with firm pressure.', 'Keep the person warm and calm until help arrives.'],
  'Earthquake': ['Move away from damaged structures and falling debris.', 'Check the victim for injuries — do not move if spinal injury suspected.', 'Control any bleeding with firm pressure.', 'Keep the person warm and reassured.', 'Call emergency services immediately.'],
  'Fire accident': ['Move the person away from the fire source.', 'Cool burns with cool (not cold) running water for 10+ minutes.', 'Do not apply ice, butter, or toothpaste.', 'Cover loosely with a clean cloth.', 'Do not remove burnt clothing stuck to skin.'],
  'Animal attack': ['Move to safety away from the animal.', 'Control bleeding with firm pressure.', 'Wash the wound gently with clean water for 10+ minutes.', 'Cover with a clean cloth.', 'Seek medical attention immediately — rabies risk.'],
  'Drowning': ['Remove the person from water safely — do not put yourself at risk.', 'Check for breathing — if absent, start CPR immediately.', 'Keep the person warm.', 'Do not leave them alone even if they seem recovered.', 'Call 108 immediately.'],
  'Fall injury': ['Do not move the person if spinal injury is suspected.', 'Immobilize the injured limb.', 'Apply ice wrapped in cloth to reduce swelling.', 'Control any bleeding with firm pressure.', 'Call 108 for serious falls.'],
  'Poisoning': ['Call 108 or Poison Control immediately.', 'Do NOT induce vomiting unless directed by medical professionals.', 'If conscious, keep the person calm.', 'If unconscious, place in recovery position.', 'Collect information: what was taken, how much, when.'],
  'Other': ['Keep the person calm and still.', 'Control any bleeding with firm pressure.', 'Monitor breathing and pulse.', 'Keep them warm until help arrives.', 'Call 108 immediately.'],
};

type Screen = 'conscious' | 'bleeding' | 'accident_type' | 'legal' | 'final';

export default function BystanderAssistant() {
  const navigate = useNavigate();
  const { lat, lng } = useGeolocation({ enableHighAccuracy: true });
  const [screen, setScreen] = useState<Screen>('conscious');
  const [isConscious, setIsConscious] = useState<boolean | null>(null);
  const [selectedAccident, setSelectedAccident] = useState('');
  const [history, setHistory] = useState<Screen[]>([]);
  const [smsSent, setSmsSent] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Pre-load audio when component mounts
  useEffect(() => {
    audioRef.current = new Audio('/samaritan.mpeg');
    audioRef.current.onended = () => setAudioPlaying(false);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Stop audio when leaving legal screen
  useEffect(() => {
    if (screen === 'legal' && audioRef.current) {
      // User already tapped buttons to get here — autoplay is allowed
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => setAudioPlaying(true))
        .catch((e) => console.log('[Audio] Autoplay blocked:', e));
    } else if (screen !== 'legal' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
    }
  }, [screen]);

  const goTo = (s: Screen) => { setHistory((h) => [...h, screen]); setScreen(s); };
  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setScreen(prev);
    } else navigate('/dashboard');
  };

  const instructions = ACCIDENT_INSTRUCTIONS[selectedAccident] || ACCIDENT_INSTRUCTIONS['Other'];

  const sendDetailsSMS = async (accident: string, conscious: boolean | null) => {
    setSendingSMS(true);
    try {
      await emergencyAPI.sendDetailsSMS({
        lat: lat || undefined,
        lng: lng || undefined,
        role: 'bystander',
        accident_type: accident,
        is_conscious: conscious ?? undefined,
      });
      setSmsSent(true);
      toast.success('Details sent to emergency contacts', { icon: '📱' });
    } catch {
      console.log('[SMS] Details SMS failed — continuing');
    } finally {
      setSendingSMS(false);
    }
  };

  const handleAccidentSelect = (accident: string) => {
    setSelectedAccident(accident);
    sendDetailsSMS(accident, isConscious);
    goTo('legal');
  };

  const cardStyle = { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' };

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

          {/* Screen 1: Consciousness */}
          {screen === 'conscious' && (
            <motion.div key="conscious" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border border-orange-500/20"
                  style={{ background: 'rgba(249,115,22,0.1)' }}>
                  <span className="text-3xl">🤝</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-1">Assess the Patient</h2>
                <p className="text-slate-400 text-sm">Is the patient currently conscious or unconscious?</p>
              </div>
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => { setIsConscious(true); goTo('accident_type'); }}
                  className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition active:scale-98 border border-green-500/30 text-green-300"
                  style={{ background: 'rgba(22,163,74,0.1)' }}
                >
                  <span className="text-xl">😊</span> Conscious
                </button>
                <button
                  onClick={() => { setIsConscious(false); goTo('bleeding'); }}
                  className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition active:scale-98 border border-red-500/30 text-red-300"
                  style={{ background: 'rgba(220,38,38,0.1)' }}
                >
                  <span className="text-xl">😔</span> Unconscious
                </button>
              </div>
            </motion.div>
          )}

          {/* Screen 2: Bleeding Control */}
          {screen === 'bleeding' && (
            <motion.div key="bleeding" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="text-center mb-2">
                <span className="text-xs px-3 py-1 rounded-full uppercase tracking-widest font-black border border-red-500/30 text-red-400"
                  style={{ background: 'rgba(220,38,38,0.1)' }}>Bleeding Control</span>
                <h2 className="text-2xl font-black text-white mt-2">Severe Bleeding</h2>
              </div>
              <div className="space-y-2.5">
                {BLEEDING_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border" style={cardStyle}>
                    <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{i + 1}</span>
                    <p className="font-semibold text-slate-300 text-sm">{step}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => goTo('accident_type')}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl uppercase tracking-wide transition active:scale-98">
                Next →
              </button>
            </motion.div>
          )}

          {/* Screen 3: Accident Type */}
          {screen === 'accident_type' && (
            <motion.div key="accident_type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <h2 className="text-2xl font-black text-white text-center mb-2">What kind of accident?</h2>
              <div className="grid grid-cols-1 gap-2 max-h-[450px] overflow-y-auto pr-1">
                {ACCIDENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleAccidentSelect(type.id)}
                    className="w-full text-left p-4 rounded-2xl font-bold text-slate-200 flex items-center gap-3 transition active:scale-98 border"
                    style={cardStyle}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                  >
                    <span className="text-xl w-8">{type.icon}</span>
                    <span>{type.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Screen 4: Good Samaritan Law */}
          {screen === 'legal' && (
            <motion.div key="legal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* SMS sent confirmation */}
              {smsSent && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl border border-teal-500/30"
                  style={{ background: 'rgba(13,148,136,0.1)' }}>
                  <CheckCircle className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <p className="text-xs text-teal-300 font-medium">
                    Emergency details with location sent to all contacts
                  </p>
                </motion.div>
              )}

              <div className="p-5 rounded-2xl text-center border border-blue-500/20"
                style={{ background: 'rgba(59,130,246,0.08)' }}>
                <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h2 className="text-xl font-black uppercase tracking-wide text-white">Good Samaritan Law</h2>
                <p className="text-xs text-blue-300 mt-1 font-medium">You are fully protected under statutory rescue laws.</p>

                {/* Audio player — visible and tappable */}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      if (audioRef.current) {
                        if (audioRef.current.paused) {
                          audioRef.current.currentTime = 0;
                          audioRef.current.play().catch(console.log);
                          setAudioPlaying(true);
                        } else {
                          audioRef.current.pause();
                          setAudioPlaying(false);
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition"
                    style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd' }}
                  >
                    {audioPlaying ? '⏸ Pause' : '▶ Play Good Samaritan Law'}
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl border space-y-3" style={cardStyle}>
                {[
                  { icon: '🛡️', text: 'You are legally protected.' },
                  { icon: '🚫', text: 'Police cannot detain you.' },
                  { icon: '🏥', text: 'Hospital cannot detain you.' },
                  { icon: '⚖️', text: 'You cannot be forced as a court witness.' },
                  { icon: '✅', text: 'You are not legally responsible for the outcome.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-300 font-semibold text-sm">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => goTo('final')}
                className="w-full font-bold py-4 rounded-2xl uppercase tracking-wide transition active:scale-98 text-white border"
                style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.12)' }}>
                Next — First Aid Instructions
              </button>
            </motion.div>
          )}

          {/* Screen 5: Final Instructions */}
          {screen === 'final' && (
            <motion.div key="final" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Instructions — Teal (trust, clarity) */}
              <div className="p-4 rounded-2xl border" style={{ background: 'rgba(13,148,136,0.06)', borderColor: 'rgba(13,148,136,0.2)' }}>
                <h3 className="font-black text-white border-b pb-2 mb-3" style={{ borderColor: 'rgba(13,148,136,0.2)' }}>
                  🩺 First Aid — {selectedAccident}
                </h3>
                <ul className="text-sm text-slate-300 space-y-2">
                  {instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-teal-500 mt-0.5 flex-shrink-0">▶</span>{step}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ambulance status — Green (safe, reassuring) */}
              <div className="p-4 rounded-2xl flex items-center gap-3 border border-green-500/20"
                style={{ background: 'rgba(22,163,74,0.08)' }}>
                <span className="text-2xl">🚑</span>
                <div>
                  <p className="font-bold text-green-300 text-sm">Ambulance is on the way</p>
                  <p className="text-xs text-green-600">Keep the person calm and still until help arrives</p>
                </div>
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
                <div className="flex justify-between items-center p-4 rounded-2xl border" style={cardStyle}>
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
                className="w-full font-bold py-4 rounded-2xl uppercase tracking-wide transition text-white border"
                style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.1)' }}>
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
