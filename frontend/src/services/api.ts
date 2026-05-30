import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data: { phone?: string; email?: string; password?: string; emergency_pin?: string }) =>
    api.post('/auth/login', data),

  register: (data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    age?: number;
    blood_group?: string;
    allergies?: string[];
    medical_conditions?: string[];
    emergency_contacts?: any[];
    emergency_pin?: string;
  }) => api.post('/auth/register', data),

  getProfile: () => api.get('/auth/profile'),

  updateProfile: (data: any) => api.put('/auth/profile', data),

  forgotPassword: (data: { phone?: string; email?: string }) =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data: { phone: string; otp: string; new_password: string }) =>
    api.post('/auth/reset-password', data),

  verifyOTP: (data: { phone: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  sendEmergencyContactOTP: (phone: string) =>
    api.post('/auth/emergency-contact/send-otp', { phone }),

  verifyEmergencyContactOTP: (data: { phone: string; otp: string; name: string; relationship: string }) =>
    api.post('/auth/emergency-contact/verify-otp', data),

  addEmergencyContact: (data: { phone: string; name: string; relationship: string }) =>
    api.post('/auth/emergency-contact/add', data),

  removeEmergencyContact: (phone: string) =>
    api.delete('/auth/emergency-contact/remove', { data: { phone } }),
};

// ─── Emergency API ────────────────────────────────────────────────────────────
export const emergencyAPI = {
  triggerSOS: (data: {
    lat: number;
    lng: number;
    emergency_type?: string;
    severity?: string;
    address?: string;
    pain_level?: number;
    is_breathing?: boolean;
    is_conscious?: boolean;
    bleeding_severity?: string;
  }) => api.post('/emergencies/sos', data),

  getEmergency: (id: string) => api.get(`/emergencies/${id}`),

  updateStatus: (id: string, status: string, message?: string) =>
    api.put(`/emergencies/${id}/status`, { status, message }),

  getHistory: () => api.get('/emergencies/user/history'),

  getActive: () => api.get('/emergencies/active'),

  sendDetailsSMS: (data: {
    lat?: number; lng?: number; role: 'victim' | 'bystander';
    injury_type?: string; accident_type?: string;
    is_conscious?: boolean; details?: string;
  }) => api.post('/emergencies/details-sms', data),

  sendChatMessage: (emergencyId: string, message: string) =>
    api.post(`/emergencies/${emergencyId}/chat`, { message }),

  getChatMessages: (emergencyId: string) =>
    api.get(`/emergencies/${emergencyId}/chat`),
};

// ─── Hospital API ─────────────────────────────────────────────────────────────
export const hospitalAPI = {
  getAll: () => api.get('/hospitals'),

  getNearest: (lat: number, lng: number, limit?: number) =>
    api.get('/hospitals/nearest', { params: { lat, lng, limit } }),

  getById: (id: string) => api.get(`/hospitals/${id}`),

  updateCapacity: (id: string, data: any) =>
    api.put(`/hospitals/${id}/capacity`, data),

  getEmergencies: (id: string) => api.get(`/hospitals/${id}/emergencies`),
};

// ─── Ambulance API ────────────────────────────────────────────────────────────
export const ambulanceAPI = {
  getAll: () => api.get('/ambulances'),

  getNearest: (lat: number, lng: number) =>
    api.get('/ambulances/nearest', { params: { lat, lng } }),

  getById: (id: string) => api.get(`/ambulances/${id}`),

  updateLocation: (id: string, lat: number, lng: number) =>
    api.put(`/ambulances/${id}/location`, { lat, lng }),

  updateStatus: (id: string, status: string) =>
    api.put(`/ambulances/${id}/status`, { status }),
};

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),

  getLiveEmergencies: () => api.get('/admin/emergencies/live'),

  getAnalytics: () => api.get('/admin/analytics'),

  getUsers: () => api.get('/admin/users'),

  updateAmbulance: (id: string, data: any) =>
    api.put(`/admin/ambulances/${id}`, data),

  getHeatmap: () => api.get('/admin/heatmap'),
};

// ─── Notification API ─────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/notifications'),

  markRead: (id: string) => api.put(`/notifications/${id}/read`),

  markAllRead: () => api.put('/notifications/read-all'),

  send: (data: { user_id: string; title: string; message: string; type?: string }) =>
    api.post('/notifications/send', data),
};

export default api;
