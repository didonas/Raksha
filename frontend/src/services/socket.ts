import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socketInstance: Socket | null = null;

export function getSocket(): Socket | null {
  return socketInstance;
}

export function initSocket(token: string): Socket {
  if (socketInstance?.connected) return socketInstance;

  socketInstance = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: { token },
  });

  socketInstance.on('connect', () => {
    console.log('[SocketService] Connected:', socketInstance?.id);
    socketInstance?.emit('authenticate', { token });
  });

  socketInstance.on('disconnect', (reason) => {
    console.log('[SocketService] Disconnected:', reason);
  });

  socketInstance.on('connect_error', (err) => {
    console.error('[SocketService] Error:', err.message);
  });

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

// ─── Event Emitters ───────────────────────────────────────────────────────────
export const socketEvents = {
  triggerSOS: (data: {
    userId: string;
    lat: number;
    lng: number;
    emergencyType?: string;
    severity?: string;
    address?: string;
  }) => {
    socketInstance?.emit('emergency_sos', data);
  },

  updateAmbulanceLocation: (ambulanceId: string, lat: number, lng: number) => {
    socketInstance?.emit('ambulance_location_update', { ambulanceId, lat, lng });
  },

  acceptEmergency: (emergencyId: string, driverId: string) => {
    socketInstance?.emit('driver_accept_emergency', { emergencyId, driverId });
  },

  updateEmergencyStatus: (emergencyId: string, status: string, message?: string) => {
    socketInstance?.emit('emergency_status_update', { emergencyId, status, message });
  },

  sendChatMessage: (emergencyId: string, senderId: string, senderRole: string, message: string) => {
    socketInstance?.emit('chat_message', { emergencyId, senderId, senderRole, message });
  },

  alertHospital: (hospitalId: string, emergencyId: string, patientInfo: any, eta?: number) => {
    socketInstance?.emit('hospital_alert', { hospitalId, emergencyId, patientInfo, eta });
  },
};

// ─── Event Listeners ──────────────────────────────────────────────────────────
export const socketListeners = {
  onSOSConfirmed: (callback: (data: any) => void) => {
    socketInstance?.on('sos_confirmed', callback);
    return () => socketInstance?.off('sos_confirmed', callback);
  },

  onStatusUpdate: (callback: (data: any) => void) => {
    socketInstance?.on('emergency_status_update', callback);
    return () => socketInstance?.off('emergency_status_update', callback);
  },

  onAmbulancePosition: (callback: (data: any) => void) => {
    socketInstance?.on('ambulance_position', callback);
    return () => socketInstance?.off('ambulance_position', callback);
  },

  onNewChatMessage: (callback: (data: any) => void) => {
    socketInstance?.on('new_chat_message', callback);
    return () => socketInstance?.off('new_chat_message', callback);
  },

  onNewEmergencyRequest: (callback: (data: any) => void) => {
    socketInstance?.on('new_emergency_request', callback);
    return () => socketInstance?.off('new_emergency_request', callback);
  },

  onFleetUpdate: (callback: (data: any) => void) => {
    socketInstance?.on('fleet_update', callback);
    return () => socketInstance?.off('fleet_update', callback);
  },

  onNewEmergency: (callback: (data: any) => void) => {
    socketInstance?.on('new_emergency', callback);
    return () => socketInstance?.off('new_emergency', callback);
  },
};

export default socketInstance;
