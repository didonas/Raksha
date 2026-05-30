import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'user' | 'driver' | 'hospital_admin' | 'system_admin';
  blood_group?: string;
  allergies?: string[];
  medical_conditions?: string[];
  age?: number;
  address?: string;
  lat?: number;
  lng?: number;
  emergency_pin?: string;
  emergency_contacts?: EmergencyContact[];
  insurance_provider?: string;
  insurance_number?: string;
  created_at?: string;
}

export interface EmergencyContact {
  id?: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: (token: string, user: User) => {
        set({ token, user, error: null, isLoading: false });
      },

      logout: () => {
        set({ token: null, user: null, error: null });
        localStorage.removeItem('raksha-auth');
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setError: (error: string | null) => set({ error }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'raksha-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
