import { create } from 'zustand';

export interface TimelineEvent {
  id: string;
  emergency_id: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface AmbulanceInfo {
  id: string;
  vehicle_number: string;
  lat: number;
  lng: number;
  status: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  };
}

export interface HospitalInfo {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
}

export interface ActiveEmergency {
  id: string;
  emergency_id_code: string;
  emergency_type: string;
  severity: string;
  status: string;
  lat: number;
  lng: number;
  address: string;
  ambulance?: AmbulanceInfo | null;
  hospital?: HospitalInfo | null;
  eta?: number;
  timeline: TimelineEvent[];
  created_at: string;
}

interface EmergencyState {
  activeEmergency: ActiveEmergency | null;
  sosActive: boolean;
  ambulancePosition: { lat: number; lng: number } | null;
  eta: number | null;
  distanceKm: string | null;
  progress: number;
  chatMessages: any[];

  setActiveEmergency: (emergency: ActiveEmergency | null) => void;
  setSosActive: (active: boolean) => void;
  updateStatus: (status: string, message?: string) => void;
  updateAmbulancePosition: (lat: number, lng: number, eta?: number, distanceKm?: string, progress?: number) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  addChatMessage: (message: any) => void;
  clearEmergency: () => void;
  triggerSOS: () => void;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  activeEmergency: null,
  sosActive: false,
  ambulancePosition: null,
  eta: null,
  distanceKm: null,
  progress: 0,
  chatMessages: [],

  setActiveEmergency: (emergency) => {
    set({
      activeEmergency: emergency,
      sosActive: !!emergency,
      eta: emergency?.eta || null,
    });
  },

  setSosActive: (active) => set({ sosActive: active }),

  updateStatus: (status, message) => {
    const current = get().activeEmergency;
    if (current) {
      set({
        activeEmergency: {
          ...current,
          status,
        },
      });
    }
  },

  updateAmbulancePosition: (lat, lng, eta, distanceKm, progress) => {
    const current = get().activeEmergency;
    if (current?.ambulance) {
      set({
        ambulancePosition: { lat, lng },
        eta: eta !== undefined ? eta : get().eta,
        distanceKm: distanceKm || get().distanceKm,
        progress: progress !== undefined ? progress : get().progress,
        activeEmergency: {
          ...current,
          ambulance: { ...current.ambulance, lat, lng },
        },
      });
    }
  },

  addTimelineEvent: (event) => {
    const current = get().activeEmergency;
    if (current) {
      set({
        activeEmergency: {
          ...current,
          timeline: [...current.timeline, event],
        },
      });
    }
  },

  addChatMessage: (message) => {
    set((state) => ({ chatMessages: [...state.chatMessages, message] }));
  },

  clearEmergency: () => {
    set({
      activeEmergency: null,
      sosActive: false,
      ambulancePosition: null,
      eta: null,
      distanceKm: null,
      progress: 0,
      chatMessages: [],
    });
  },

  triggerSOS: () => {
    set({ sosActive: true });
  },
}));
