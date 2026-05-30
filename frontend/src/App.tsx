import React, { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SOSActive from './pages/SOSActive';
import LiveTracking from './pages/LiveTracking';
import VictimAssistant from './pages/VictimAssistant';
import BystanderAssistant from './pages/BystanderAssistant';
import HospitalList from './pages/HospitalList';
import Profile from './pages/Profile';
import IncidentHistory from './pages/IncidentHistory';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import HospitalAdminDashboard from './pages/HospitalAdminDashboard';

// ─── Auth Context ─────────────────────────────────────────────────────────────
interface AuthContextType {
  isAuthenticated: boolean;
  role: string | null;
}

export const AuthContext = createContext<AuthContextType>({ isAuthenticated: false, role: null });

// ─── Socket Context ───────────────────────────────────────────────────────────
interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

export const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { token, user } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

// ─── App Component ────────────────────────────────────────────────────────────
export default function App() {
  const { token, user } = useAuthStore();
  const { socket, connected, connect, disconnect } = useSocketStore();
  const [socketState, setSocketState] = useState<SocketContextType>({ socket: null, connected: false });

  useEffect(() => {
    if (token && user) {
      connect(token);
    } else {
      disconnect();
    }
  }, [token, user]);

  useEffect(() => {
    setSocketState({ socket, connected });
  }, [socket, connected]);

  const authContextValue: AuthContextType = {
    isAuthenticated: !!token,
    role: user?.role || null,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      <SocketContext.Provider value={socketState}>
        <div className="min-h-screen bg-gray-950 text-white">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />

            {/* User Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/sos" element={<ProtectedRoute><SOSActive /></ProtectedRoute>} />
            <Route path="/tracking/:emergencyId" element={<ProtectedRoute><LiveTracking /></ProtectedRoute>} />
            <Route path="/victim" element={<ProtectedRoute><VictimAssistant /></ProtectedRoute>} />
            <Route path="/bystander" element={<ProtectedRoute><BystanderAssistant /></ProtectedRoute>} />
            <Route path="/hospitals" element={<ProtectedRoute><HospitalList /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><IncidentHistory /></ProtectedRoute>} />

            {/* Driver Routes */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute allowedRoles={['driver', 'system_admin']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['system_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Hospital Admin Routes */}
            <Route
              path="/hospital-admin"
              element={
                <ProtectedRoute allowedRoles={['hospital_admin', 'system_admin']}>
                  <HospitalAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}
