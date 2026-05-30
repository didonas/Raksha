import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Activity, Truck, Building2, Users, AlertTriangle, RefreshCw, MapPin, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';
import { adminAPI } from '../services/api';
import { SocketContext } from '../App';
import { format } from 'date-fns';

const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

interface DashboardData {
  stats: {
    active_emergencies: number;
    available_ambulances: number;
    total_ambulances: number;
    hospitals_online: number;
    today_incidents: number;
    total_incidents: number;
    total_users: number;
    avg_response_time_minutes: number;
  };
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
  recent_emergencies: any[];
}

export default function AdminDashboard() {
  const { socket } = useContext(SocketContext);
  const [data, setData] = useState<DashboardData | null>(null);
  const [liveEmergencies, setLiveEmergencies] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'live' | 'analytics' | 'fleet'>('overview');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    try {
      const [dashRes, liveRes, analyticsRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getLiveEmergencies(),
        adminAPI.getAnalytics(),
      ]);
      setData(dashRes.data);
      setLiveEmergencies(liveRes.data.emergencies || []);
      setAnalytics(analyticsRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_emergency', () => fetchData());
    socket.on('emergency_updated', () => fetchData());
    return () => {
      socket.off('new_emergency');
      socket.off('emergency_updated');
    };
  }, [socket]);

  const statCards = data ? [
    { label: 'Active Emergencies', value: data.stats.active_emergencies, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-600/10 border-red-500/20' },
    { label: 'Available Ambulances', value: `${data.stats.available_ambulances}/${data.stats.total_ambulances}`, icon: Truck, color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-500/20' },
    { label: 'Hospitals Online', value: data.stats.hospitals_online, icon: Building2, color: 'text-green-400', bg: 'bg-green-600/10 border-green-500/20' },
    { label: "Today's Incidents", value: data.stats.today_incidents, icon: Activity, color: 'text-orange-400', bg: 'bg-orange-600/10 border-orange-500/20' },
    { label: 'Total Users', value: data.stats.total_users, icon: Users, color: 'text-purple-400', bg: 'bg-purple-600/10 border-purple-500/20' },
    { label: 'Avg Response Time', value: `${data.stats.avg_response_time_minutes}m`, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-500/20' },
  ] : [];

  const typeChartData = data ? Object.entries(data.by_type).map(([name, value]) => ({ name, value })) : [];
  const severityChartData = data ? Object.entries(data.by_severity).map(([name, value]) => ({ name, value })) : [];

  const tabs = ['overview', 'live', 'analytics', 'fleet'] as const;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-xs text-gray-400">Last updated: {format(lastRefresh, 'HH:mm:ss')}</p>
        </div>
        <button onClick={fetchData} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-white/5 rounded-xl p-1">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${activeTab === tab ? 'bg-red-600 text-white' : 'text-gray-400'}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto pb-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                      <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`p-4 rounded-xl border ${card.bg}`}>
                        <Icon className={`w-5 h-5 ${card.color} mb-2`} />
                        <p className="text-2xl font-bold text-white">{card.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Recent Emergencies */}
                <div className="glass rounded-2xl p-4">
                  <h3 className="font-semibold text-white mb-3">Recent Incidents</h3>
                  <div className="space-y-2">
                    {data?.recent_emergencies.slice(0, 5).map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-sm text-white font-medium">{e.emergency_type}</p>
                          <p className="text-xs text-gray-400">{format(new Date(e.created_at), 'dd MMM, HH:mm')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            e.severity === 'Critical' ? 'bg-red-600/20 text-red-400' :
                            e.severity === 'High' ? 'bg-orange-600/20 text-orange-400' :
                            'bg-yellow-600/20 text-yellow-400'
                          }`}>{e.severity}</span>
                          <span className="text-xs text-gray-500 capitalize">{e.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live Tab */}
            {activeTab === 'live' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full status-pulse-red" />
                  <span className="text-sm text-gray-300">{liveEmergencies.length} active emergencies</span>
                </div>
                {liveEmergencies.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-4xl mb-3 block">✅</span>
                    <p className="text-gray-400">No active emergencies</p>
                  </div>
                ) : liveEmergencies.map((e: any) => (
                  <div key={e.id} className="glass rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-white">{e.emergency_type} Emergency</p>
                        <p className="text-xs text-gray-400">{e.patient?.name || 'Unknown'} • {format(new Date(e.created_at), 'HH:mm')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        e.severity === 'Critical' ? 'bg-red-600/20 text-red-400' : 'bg-orange-600/20 text-orange-400'
                      }`}>{e.severity}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.lat?.toFixed(4)}, {e.lng?.toFixed(4)}</span>
                      <span className="capitalize text-blue-400">{e.status.replace('_', ' ')}</span>
                    </div>
                    {e.ambulance && (
                      <p className="text-xs text-gray-500 mt-1">🚑 {e.ambulance.vehicle_number} {e.ambulance.driver ? `• ${e.ambulance.driver.name}` : ''}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
              <div className="space-y-4">
                <div className="glass rounded-2xl p-4">
                  <h3 className="font-semibold text-white mb-3">Emergencies by Hour</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={analytics.hourly}>
                      <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 10 }} interval={3} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                      <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass rounded-2xl p-4">
                  <h3 className="font-semibold text-white mb-3">By Emergency Type</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={analytics.by_type} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {analytics.by_type.map((_: any, index: number) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass rounded-2xl p-4">
                  <h3 className="font-semibold text-white mb-3">Fleet Status</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(analytics.fleet_status || {}).map(([status, count]) => (
                      <div key={status} className="p-3 bg-white/5 rounded-xl">
                        <p className="text-lg font-bold text-white">{count as number}</p>
                        <p className="text-xs text-gray-400 capitalize">{status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fleet Tab */}
            {activeTab === 'fleet' && analytics && (
              <div className="space-y-3">
                <h3 className="font-semibold text-white mb-2">Hospital Capacity</h3>
                {analytics.hospital_capacity?.map((h: any, i: number) => (
                  <div key={i} className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-white text-sm">{h.name}</p>
                      <span className="text-xs text-gray-400">{h.current}/{h.capacity}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (h.current / h.capacity) > 0.8 ? 'bg-red-500' :
                          (h.current / h.capacity) > 0.6 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (h.current / h.capacity) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">ICU Available: {h.icu_available}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
