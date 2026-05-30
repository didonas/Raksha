import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useEmergencyStore } from './emergencyStore';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: (token: string) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      set({ connected: true });
      socket.emit('authenticate', { token });
    });

    socket.on('authenticated', (data) => {
      console.log('[Socket] Authenticated:', data);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      set({ connected: false });
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      set({ connected: false });
    });

    // Emergency events
    socket.on('sos_confirmed', (data) => {
      console.log('[Socket] SOS confirmed:', data);
      const { setActiveEmergency } = useEmergencyStore.getState();
      setActiveEmergency({
        id: data.emergencyId,
        emergency_id_code: data.emergencyCode,
        emergency_type: 'General',
        severity: 'High',
        status: data.status,
        lat: 0,
        lng: 0,
        address: '',
        ambulance: data.ambulance,
        hospital: data.hospital,
        timeline: data.timeline || [],
        created_at: new Date().toISOString(),
      });
    });

    socket.on('emergency_status_update', (data) => {
      console.log('[Socket] Status update:', data);
      const { updateStatus, addTimelineEvent, activeEmergency } = useEmergencyStore.getState();
      updateStatus(data.status, data.message);
      if (data.timeline) {
        data.timeline.forEach((event: any) => {
          addTimelineEvent(event);
        });
      }
    });

    socket.on('ambulance_position', (data) => {
      const { updateAmbulancePosition } = useEmergencyStore.getState();
      updateAmbulancePosition(data.lat, data.lng, data.eta, data.distanceKm, data.progress);
    });

    socket.on('new_chat_message', (data) => {
      const { addChatMessage } = useEmergencyStore.getState();
      addChatMessage(data);
    });

    socket.on('new_emergency_request', (data) => {
      console.log('[Socket] New emergency request for driver:', data);
      // Handled in DriverDashboard component
      socket.emit('driver_new_request', data);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  emit: (event: string, data?: any) => {
    const { socket, connected } = get();
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit - not connected:', event);
    }
  },
}));
