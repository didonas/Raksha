import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, MapPin, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { emergencyAPI } from '../services/api';
import BottomNav from '../components/BottomNav';

interface Incident {
  id: string;
  emergency_id_code: string;
  emergency_type: string;
  severity: string;
  status: string;
  lat: number;
  lng: number;
  address: string;
  created_at: string;
  resolved_at?: string;
  ambulance?: { vehicle_number: string; driver?: { name: string } };
  hospital?: { name: string };
  timeline?: any[];
}

const severityColors: Record<string, string> = {
  Critical: 'bg-red-600/20 text-red-400 border-red-500/30',
  High: 'bg-orange-600/20 text-orange-400 border-orange-500/30',
  Medium: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
  Low: 'bg-green-600/20 text-green-400 border-green-500/30',
};

const statusColors: Record<string, string> = {
  resolved: 'text-green-400',
  cancelled: 'text-gray-400',
  en_route: 'text-blue-400',
  arrived: 'text-orange-400',
};

export default function IncidentHistory() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    emergencyAPI.getHistory()
      .then((res) => setIncidents(res.data.history || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterType ? incidents.filter((i) => i.emergency_type === filterType) : incidents;
  const types = Array.from(new Set(incidents.map((i) => i.emergency_type)));

  const getDuration = (incident: Incident) => {
    if (!incident.resolved_at) return 'Ongoing';
    const start = new Date(incident.created_at);
    const end = new Date(incident.resolved_at);
    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    return `${mins} min`;
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Incident History</h1>
            <p className="text-xs text-gray-400">{filtered.length} incidents</p>
          </div>
        </div>

        {/* Type filter */}
        {types.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setFilterType('')} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${!filterType ? 'bg-red-600 border-red-600 text-white' : 'border-gray-600 text-gray-400'}`}>
              All
            </button>
            {types.map((type) => (
              <button key={type} onClick={() => setFilterType(type)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filterType === type ? 'bg-red-600 border-red-600 text-white' : 'border-gray-600 text-gray-400'}`}>
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 px-4 overflow-y-auto pb-24">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl mb-4 block">📋</span>
            <p className="text-gray-400 font-medium">No incidents yet</p>
            <p className="text-gray-500 text-sm mt-1">Your emergency history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((incident, i) => (
              <motion.button
                key={incident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedIncident(incident)}
                className="w-full glass rounded-xl p-4 text-left card-hover"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${severityColors[incident.severity] || severityColors.Medium}`}>
                      {incident.severity}
                    </span>
                    <span className="text-sm font-semibold text-white">{incident.emergency_type}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(incident.created_at), 'dd MMM yyyy, HH:mm')}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={statusColors[incident.status] || 'text-gray-400'}>
                      {incident.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {incident.hospital && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span>🏥</span> {incident.hospital.name}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-mono text-red-400/70">{incident.emergency_id_code}</span>
                  <span className="text-xs text-gray-500">Duration: {getDuration(incident)}</span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
            onClick={() => setSelectedIncident(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-dark-800 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{selectedIncident.emergency_type} Emergency</h3>
                <button onClick={() => setSelectedIncident(null)} className="w-8 h-8 rounded-full glass flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-300" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400">Severity</p>
                    <p className={`font-bold ${severityColors[selectedIncident.severity]?.split(' ')[1] || 'text-white'}`}>{selectedIncident.severity}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400">Status</p>
                    <p className="font-bold text-white capitalize">{selectedIncident.status.replace('_', ' ')}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400">Date</p>
                    <p className="text-sm text-white">{format(new Date(selectedIncident.created_at), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400">Duration</p>
                    <p className="text-sm text-white">{getDuration(selectedIncident)}</p>
                  </div>
                </div>
                {selectedIncident.ambulance && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Ambulance</p>
                    <p className="text-sm text-white">{selectedIncident.ambulance.vehicle_number}</p>
                    {selectedIncident.ambulance.driver && <p className="text-xs text-gray-400">Driver: {selectedIncident.ambulance.driver.name}</p>}
                  </div>
                )}
                {selectedIncident.hospital && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Hospital</p>
                    <p className="text-sm text-white">{selectedIncident.hospital.name}</p>
                  </div>
                )}
                {selectedIncident.timeline && selectedIncident.timeline.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Timeline</p>
                    <div className="space-y-2">
                      {selectedIncident.timeline.map((event: any, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-white">{event.message}</p>
                            <p className="text-xs text-gray-500">{format(new Date(event.timestamp), 'HH:mm:ss')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active="history" />
    </div>
  );
}
