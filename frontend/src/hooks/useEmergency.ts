import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useEmergencyStore } from '../store/emergencyStore';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { emergencyAPI } from '../services/api';
import { useGeolocation } from './useGeolocation';

interface EmergencyOptions {
  emergency_type?: string;
  severity?: string;
  pain_level?: number;
  is_breathing?: boolean;
  is_conscious?: boolean;
  bleeding_severity?: string;
}

export function useEmergency() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, connected } = useSocketStore();
  const { setActiveEmergency, clearEmergency, activeEmergency, sosActive } = useEmergencyStore();
  const { lat, lng, error: gpsError, getLocation } = useGeolocation({ enableHighAccuracy: true });
  const [isTriggering, setIsTriggering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Trigger SOS via API
  const triggerSOS = useCallback(
    async (options: EmergencyOptions = {}) => {
      if (!user) {
        toast.error('Please log in to trigger SOS');
        return;
      }

      if (!lat || !lng) {
        toast.error('GPS location required. Please enable location services.');
        getLocation();
        return;
      }

      setIsTriggering(true);

      try {
        // Vibrate device
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 500]);
        }

        const response = await emergencyAPI.triggerSOS({
          lat,
          lng,
          emergency_type: options.emergency_type || 'General',
          severity: options.severity || 'High',
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          pain_level: options.pain_level,
          is_breathing: options.is_breathing,
          is_conscious: options.is_conscious,
          bleeding_severity: options.bleeding_severity,
        });

        const { emergency } = response.data;

        setActiveEmergency({
          id: emergency.id,
          emergency_id_code: emergency.emergency_id_code,
          emergency_type: emergency.emergency_type,
          severity: emergency.severity,
          status: emergency.status,
          lat: emergency.lat,
          lng: emergency.lng,
          address: emergency.address,
          ambulance: emergency.ambulance,
          hospital: emergency.hospital,
          eta: emergency.eta,
          timeline: emergency.timeline || [],
          created_at: emergency.created_at,
        });

        // Also emit via socket for real-time
        if (socket && connected) {
          socket.emit('emergency_sos', {
            userId: user.id,
            lat,
            lng,
            emergencyType: options.emergency_type || 'General',
            severity: options.severity || 'High',
            address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          });
        }

        toast.success('Emergency SOS activated! Help is on the way.');
        navigate('/sos');
      } catch (err: any) {
        console.error('[Emergency] SOS trigger failed:', err);
        toast.error(err.response?.data?.error || 'Failed to trigger SOS. Please call 108.');
      } finally {
        setIsTriggering(false);
      }
    },
    [user, lat, lng, socket, connected, setActiveEmergency, navigate, getLocation]
  );

  // Cancel emergency
  const cancelEmergency = useCallback(async () => {
    if (!activeEmergency) return;

    setIsCancelling(true);
    try {
      await emergencyAPI.updateStatus(activeEmergency.id, 'cancelled', 'Cancelled by user');
      clearEmergency();
      toast.success('Emergency cancelled');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Failed to cancel emergency');
    } finally {
      setIsCancelling(false);
    }
  }, [activeEmergency, clearEmergency, navigate]);

  // Navigate to tracking
  const goToTracking = useCallback(() => {
    if (activeEmergency) {
      navigate(`/tracking/${activeEmergency.id}`);
    }
  }, [activeEmergency, navigate]);

  return {
    triggerSOS,
    cancelEmergency,
    goToTracking,
    isTriggering,
    isCancelling,
    activeEmergency,
    sosActive,
    lat,
    lng,
    gpsError,
    hasLocation: !!(lat && lng),
  };
}

export default useEmergency;
