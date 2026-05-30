import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Phone, MessageCircle, Navigation, Clock, ChevronDown, ChevronUp, Share2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEmergencyStore } from '../store/emergencyStore';
import { emergencyAPI } from '../services/api';
import EmergencyChat from '../components/EmergencyChat';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ambulanceIcon = L.divIcon({
  html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🚑</div>`,
  className: 'ambulance-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const userIcon = L.divIcon({
  html: `<div style="width:20px;height:20px;background:#dc2626;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(220,38,38,0.3)"></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const hospitalIcon = L.divIcon({
  html: `<div style="font-size:24px">🏥</div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LiveTracking() {
  const { emergencyId } = useParams<{ emergencyId: string }>();
  const navigate = useNavigate();
  const { activeEmergency, ambulancePosition, eta, distanceKm } = useEmergencyStore();
  const [emergency, setEmergency] = useState(activeEmergency);
  const [showChat, setShowChat] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [etaCountdown, setEtaCountdown] = useState(eta || 0);

  const userLat = emergency?.lat || 8.0883;
  const userLng = emergency?.lng || 77.5385;
  const ambLat = ambulancePosition?.lat || emergency?.ambulance?.lat || 8.0900;
  const ambLng = ambulancePosition?.lng || emergency?.ambulance?.lng || 77.5400;
  const hospLat = emergency?.hospital?.lat || 8.1833;
  const hospLng = emergency?.hospital?.lng || 77.4119;

  useEffect(() => {
    if (emergencyId && !activeEmergency) {
      emergencyAPI.getEmergency(emergencyId)
        .then((res) => setEmergency(res.data.emergency))
        .catch(() => toast.error('Could not load emergency details'));
    }
  }, [emergencyId, activeEmergency]);

  useEffect(() => {
    if (eta) setEtaCountdown(eta);
  }, [eta]);

  useEffect(() => {
    if (etaCountdown <= 0) return;
    const interval = setInterval(() => {
      setEtaCountdown((prev) => Math.max(0, prev - 1 / 60));
    }, 1000);
    return () => clearInterval(interval);
  }, [etaCountdown]);

  const shareLocation = () => {
    const url = `https://maps.google.com/?q=${userLat},${userLng}`;
    navigator.clipboard?.writeText(url);
    toast.success('Location link copied to clipboard');
  };

  const statusColors: Record<string, string> = {
    searching: 'bg-yellow-500',
    ambulance_assigned: 'bg-blue-500',
    en_route: 'bg-orange-500',
    arrived: 'bg-green-500',
    patient_onboard: 'bg-purple-500',
    reached_hospital: 'bg-green-600',
  };

  const statusLabels: Record<string, string> = {
    searching: 'Searching for ambulance',
    ambulance_assigned: 'Ambulance assigned',
    en_route: 'En route to you',
    arrived: 'Arrived at your location',
    patient_onboard: 'Patient onboard',
    reached_hospital: 'Reached hospital',
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-dark-900">
      {/* Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-3">
        <div className="glass-dark rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${statusColors[emergency?.status || 'searching']} status-pulse-green`} />
            <span className="text-sm font-medium text-white">{statusLabels[emergency?.status || 'searching']}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareLocation} className="w-8 h-8 rounded-full glass flex items-center justify-center">
              <Share2 className="w-4 h-4 text-gray-300" />
            </button>
            <button onClick={() => navigate('/dashboard')} className="w-8 h-8 rounded-full glass flex items-center justify-center">
              <X className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[userLat, userLng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <MapUpdater center={[ambLat, ambLng]} />

          {/* User marker */}
          <Marker position={[userLat, userLng]} icon={userIcon}>
            <Popup>Your location</Popup>
          </Marker>

          {/* Ambulance marker */}
          <Marker position={[ambLat, ambLng]} icon={ambulanceIcon}>
            <Popup>
              {emergency?.ambulance?.vehicle_number || 'Ambulance'}
              {emergency?.ambulance?.driver && ` - ${emergency.ambulance.driver.name}`}
            </Popup>
          </Marker>

          {/* Hospital marker */}
          {emergency?.hospital && (
            <Marker position={[hospLat, hospLng]} icon={hospitalIcon}>
              <Popup>{emergency.hospital.name}</Popup>
            </Marker>
          )}

          {/* Route: Ambulance → User */}
          <Polyline
            positions={[[ambLat, ambLng], [userLat, userLng]]}
            color="#dc2626"
            weight={3}
            dashArray="8, 8"
            opacity={0.8}
          />

          {/* Route: User → Hospital */}
          {emergency?.hospital && (
            <Polyline
              positions={[[userLat, userLng], [hospLat, hospLng]]}
              color="#3b82f6"
              weight={2}
              dashArray="6, 6"
              opacity={0.5}
            />
          )}
        </MapContainer>
      </div>

      {/* Bottom Sheet */}
      <motion.div
        animate={{ height: sheetExpanded ? 'auto' : '200px' }}
        className="absolute bottom-0 left-0 right-0 z-20 bottom-sheet overflow-hidden"
      >
        {/* Handle */}
        <div className="flex justify-center mb-3">
          <button onClick={() => setSheetExpanded(!sheetExpanded)} className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* ETA & Distance */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400">ETA</span>
            </div>
            <p className="text-2xl font-bold text-white">{Math.ceil(etaCountdown)}<span className="text-sm text-gray-400"> min</span></p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Distance</span>
            </div>
            <p className="text-2xl font-bold text-white">{distanceKm || '--'}<span className="text-sm text-gray-400"> km</span></p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xs text-gray-400">Status</span>
            </div>
            <p className="text-sm font-bold text-green-400 capitalize">{emergency?.status?.replace('_', ' ') || 'Active'}</p>
          </div>
        </div>

        {/* Driver Info */}
        {emergency?.ambulance?.driver && (
          <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold">
                {emergency.ambulance.driver.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{emergency.ambulance.driver.name}</p>
                <p className="text-xs text-gray-400">{emergency.ambulance.vehicle_number}</p>
                <p className="text-xs text-yellow-400">⭐ {emergency.ambulance.driver.rating}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={`tel:${emergency.ambulance.driver.phone}`}
                className="w-10 h-10 rounded-full bg-green-600/20 border border-green-500/30 flex items-center justify-center">
                <Phone className="w-4 h-4 text-green-400" />
              </a>
              <button onClick={() => setShowChat(true)}
                className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>
        )}

        {/* Hospital Info */}
        {sheetExpanded && emergency?.hospital && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4"
          >
            <p className="text-xs text-gray-400 mb-1">Destination Hospital</p>
            <p className="font-semibold text-white text-sm">{emergency.hospital.name}</p>
            <p className="text-xs text-gray-400">{emergency.hospital.address}</p>
            <a href={`tel:${emergency.hospital.phone}`} className="text-xs text-blue-400 flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3" /> {emergency.hospital.phone}
            </a>
          </motion.div>
        )}

        {/* Emergency ID */}
        {emergency?.emergency_id_code && (
          <div className="text-center pb-2">
            <span className="text-xs text-gray-500">Emergency ID: </span>
            <span className="text-xs font-mono text-red-400">{emergency.emergency_id_code}</span>
          </div>
        )}
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && emergencyId && (
          <EmergencyChat emergencyId={emergencyId} onClose={() => setShowChat(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
