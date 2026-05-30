import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Navigation, CheckCircle, Clock, MapPin, MessageCircle, AlertTriangle, User, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { SocketContext } from '../App';
import { ambulanceAPI, emergencyAPI } from '../services/api';
import EmergencyChat from '../components/EmergencyChat';

interface EmergencyRequest {
  emergency: any;
  patient: any;
  distance: string;
  eta: number;
}

const STATUS_FLOW = [
  { id: 'en_route', label: 'En Route', icon: '🚑', color: 'bg-blue-600' },
  { id: 'arrived', label: 'Arrived', icon: '📍', color: 'bg-orange-600' },
  { id: 'patient_onboard', label: 'Patient Onboard', icon: '🏥', color: 'bg-purple-600' },
  { id: 'reached_hospital', label: 'Reached Hospital', icon: '✅', color: 'bg-green-600' },
];

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const { socket, connected } = useContext(SocketContext);
  const [isAvailable, setIsAvailable] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<EmergencyRequest | null>(null);
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState('en_route');
  const [countdown, setCountdown] = useState(30);
  const [showChat, setShowChat] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleNewRequest = (data: EmergencyRequest) => {
      setPendingRequest(data);
      setCountdown(30);
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      toast('New emergency request!', { icon: '🚨' });
    };
    socket.on('new_emergency_request', handleNewRequest);
    socket.on('driver_new_request', handleNewRequest);
    return () => {
      socket.off('new_emergency_request', handleNewRequest);
      socket.off('driver_new_request', handleNewRequest);
    };
  }, [socket]);

  // Countdown timer for pending request
  useEffect(() => {
    if (!pendingRequest) return;
    if (countdown <= 0) {
      setPendingRequest(null);
      toast.error('Request expired');
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [pendingRequest, countdown]);

  const acceptRequest = () => {
    if (!pendingRequest || !socket) return;
    socket.emit('driver_accept_emergency', {
      emergencyId: pendingRequest.emergency.id,
      driverId: user?.id,
    });
    setActiveEmergency(pendingRequest.emergency);
    setCurrentStatus('en_route');
    setPendingRequest(null);
    toast.success('Emergency accepted!');
  };

  const rejectRequest = () => {
    setPendingRequest(null);
    toast('Request declined', { icon: '❌' });
  };

  const updateStatus = async (status: string) => {
    if (!activeEmergency) return;
    setIsUpdating(true);
    try {
      await emergencyAPI.updateStatus(activeEmergency.id, status);
      setCurrentStatus(status);
      if (socket) {
        socket.emit('emergency_status_update', {
          emergencyId: activeEmergency.id,
          status,
          message: `Driver updated status to ${status}`,
        });
      }
      if (status === 'reached_hospital') {
        setTimeout(() => {
          setActiveEmergency(null);
          setCurrentStatus('en_route');
          toast.success('Emergency completed!');
        }, 2000);
      }
      toast.success(`Status: ${status.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = isAvailable ? 'offline' : 'available';
    setIsAvailable(!isAvailable);
    toast.success(`Status: ${newStatus}`);
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Driver Dashboard</h1>
          <p className="text-sm text-gray-400">{user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isAvailable ? 'bg-green-600/20 border-green-500/30' : 'bg-gray-600/20 border-gray-500/30'}`}>
            <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-400 status-pulse-green' : 'bg-gray-400'}`} />
            <span className={`text-xs font-medium ${isAvailable ? 'text-green-400' : 'text-gray-400'}`}>
              {isAvailable ? 'Available' : 'Offline'}
            </span>
          </div>
          <button onClick={toggleAvailability} className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <span className="text-lg">{isAvailable ? '🟢' : '⚫'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto pb-8 space-y-4">
        {/* Pending Request */}
        <AnimatePresence>
          {pendingRequest && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative overflow-hidden rounded-2xl border-2 border-red-500/60 bg-red-600/10"
            >
              <div className="emergency-shimmer absolute inset-0 pointer-events-none" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-red-300 text-lg">NEW EMERGENCY</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center">
                    <span className={`text-xl font-bold ${countdown <= 10 ? 'text-red-300' : 'text-white'}`}>{countdown}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium">{pendingRequest.patient?.name || 'Unknown Patient'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm">{pendingRequest.emergency?.address || 'GPS Location'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Navigation className="w-4 h-4 text-blue-400" />
                      <span className="text-blue-300 text-sm">{pendingRequest.distance} km away</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-300 text-sm">ETA: {pendingRequest.eta} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded-full text-xs border border-red-500/30">
                      {pendingRequest.emergency?.emergency_type}
                    </span>
                    <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded-full text-xs border border-orange-500/30">
                      {pendingRequest.emergency?.severity}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={rejectRequest} className="py-3 border border-gray-600 text-gray-300 rounded-xl font-medium">
                    Decline
                  </button>
                  <button onClick={acceptRequest} className="py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Emergency */}
        {activeEmergency ? (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full status-pulse-red" />
                <h3 className="font-bold text-white">Active Emergency</h3>
                <span className="ml-auto text-xs font-mono text-red-400">{activeEmergency.emergency_id_code}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{activeEmergency.address || 'GPS Location'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Type:</span>
                  <span className="text-sm text-white font-medium">{activeEmergency.emergency_type}</span>
                </div>
              </div>

              {/* Status Flow */}
              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_FLOW.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateStatus(s.id)}
                      disabled={isUpdating}
                      className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                        currentStatus === s.id
                          ? `${s.color} border-transparent text-white`
                          : 'border-gray-600 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      <span>{s.icon}</span>
                      <span className="text-xs font-medium">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <a href={`tel:${activeEmergency.user_phone || '108'}`}
                  className="py-2.5 bg-green-600/20 border border-green-500/30 rounded-xl flex flex-col items-center gap-1">
                  <Phone className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">Call</span>
                </a>
                <button
                  onClick={() => window.open(`https://maps.google.com/?q=${activeEmergency.lat},${activeEmergency.lng}`, '_blank')}
                  className="py-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl flex flex-col items-center gap-1"
                >
                  <Navigation className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400">Navigate</span>
                </button>
                <button onClick={() => setShowChat(true)}
                  className="py-2.5 bg-purple-600/20 border border-purple-500/30 rounded-xl flex flex-col items-center gap-1">
                  <MessageCircle className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-purple-400">Chat</span>
                </button>
              </div>
            </div>
          </div>
        ) : !pendingRequest ? (
          <div className="text-center py-16">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🚑
            </motion.div>
            <p className="text-white font-semibold text-lg mb-2">
              {isAvailable ? 'Waiting for emergencies...' : 'You are offline'}
            </p>
            <p className="text-gray-400 text-sm">
              {isAvailable ? 'You will be notified when a nearby emergency occurs' : 'Toggle availability to receive requests'}
            </p>
          </div>
        ) : null}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today', value: '3', icon: '📋' },
            { label: 'This Week', value: '18', icon: '📅' },
            { label: 'Rating', value: '4.8⭐', icon: '🏆' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-3 text-center">
              <span className="text-2xl">{stat.icon}</span>
              <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <AnimatePresence>
        {showChat && activeEmergency && (
          <EmergencyChat emergencyId={activeEmergency.id} onClose={() => setShowChat(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
