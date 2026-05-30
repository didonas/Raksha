import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bed, AlertTriangle, Truck, Users, RefreshCw, Phone, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { hospitalAPI, adminAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

export default function HospitalAdminDashboard() {
  const { user } = useAuthStore();
  const [hospital, setHospital] = useState<any>(null);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [capacityForm, setCapacityForm] = useState({ current_patients: 0, icu_available: 0 });

  // Use first hospital for demo
  const hospitalId = 'hosp-001';

  const fetchData = async () => {
    try {
      const [hospRes, emergRes] = await Promise.all([
        hospitalAPI.getById(hospitalId),
        hospitalAPI.getEmergencies(hospitalId),
      ]);
      setHospital(hospRes.data.hospital);
      setEmergencies(emergRes.data.emergencies || []);
      setCapacityForm({
        current_patients: hospRes.data.hospital.current_patients,
        icu_available: hospRes.data.hospital.icu_available,
      });
    } catch {
      toast.error('Failed to load hospital data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateCapacity = async () => {
    try {
      await hospitalAPI.updateCapacity(hospitalId, capacityForm);
      toast.success('Capacity updated');
      setEditingCapacity(false);
      fetchData();
    } catch {
      toast.error('Failed to update capacity');
    }
  };

  const activeEmergencies = emergencies.filter((e) => !['resolved', 'cancelled'].includes(e.status));
  const occupancyPercent = hospital ? Math.round((hospital.current_patients / hospital.emergency_capacity) * 100) : 0;

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Hospital Admin</h1>
          <p className="text-xs text-gray-400">{hospital?.name || 'Loading...'}</p>
        </div>
        <button onClick={fetchData} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-gray-300" />
        </button>
      </div>

      <div className="flex-1 px-4 overflow-y-auto pb-8 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-4 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
                <p className="text-2xl font-bold text-white">{activeEmergencies.length}</p>
                <p className="text-xs text-gray-400">Active Emergencies</p>
              </div>
              <div className="glass rounded-xl p-4 border border-blue-500/20">
                <Bed className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-white">{hospital?.icu_available || 0}</p>
                <p className="text-xs text-gray-400">ICU Available</p>
              </div>
              <div className="glass rounded-xl p-4 border border-orange-500/20">
                <Users className="w-5 h-5 text-orange-400 mb-2" />
                <p className="text-2xl font-bold text-white">{hospital?.current_patients || 0}</p>
                <p className="text-xs text-gray-400">Current Patients</p>
              </div>
              <div className="glass rounded-xl p-4 border border-green-500/20">
                <Truck className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-2xl font-bold text-white">{hospital?.ambulances?.length || 0}</p>
                <p className="text-xs text-gray-400">Ambulances</p>
              </div>
            </div>

            {/* Capacity Management */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">Bed Capacity</h3>
                <button onClick={() => setEditingCapacity(!editingCapacity)} className="text-xs text-red-400">
                  {editingCapacity ? 'Cancel' : 'Update'}
                </button>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Occupancy</span>
                  <span>{hospital?.current_patients}/{hospital?.emergency_capacity}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${occupancyPercent}%` }}
                    className={`h-full rounded-full ${occupancyPercent > 80 ? 'bg-red-500' : occupancyPercent > 60 ? 'bg-orange-500' : 'bg-green-500'}`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{occupancyPercent}% occupied</p>
              </div>
              {editingCapacity && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Current Patients</label>
                    <input type="number" value={capacityForm.current_patients}
                      onChange={(e) => setCapacityForm({ ...capacityForm, current_patients: parseInt(e.target.value) })}
                      className="input-dark" min="0" max={hospital?.emergency_capacity} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">ICU Available</label>
                    <input type="number" value={capacityForm.icu_available}
                      onChange={(e) => setCapacityForm({ ...capacityForm, icu_available: parseInt(e.target.value) })}
                      className="input-dark" min="0" max={hospital?.icu_beds} />
                  </div>
                  <button onClick={updateCapacity} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Active Emergencies */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-red-400 rounded-full status-pulse-red" />
                <h3 className="font-semibold text-white">Incoming Patients</h3>
              </div>
              {activeEmergencies.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No incoming patients</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeEmergencies.map((e: any) => (
                    <div key={e.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-white text-sm">{e.emergency_type}</p>
                          <p className="text-xs text-gray-400">{e.patient?.name || 'Unknown'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          e.severity === 'Critical' ? 'bg-red-600/20 text-red-400' : 'bg-orange-600/20 text-orange-400'
                        }`}>{e.severity}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(e.created_at), 'HH:mm')}</span>
                        <span className="capitalize text-blue-400">{e.status.replace('_', ' ')}</span>
                      </div>
                      {e.ambulance && (
                        <p className="text-xs text-gray-500 mt-1">🚑 {e.ambulance.vehicle_number}</p>
                      )}
                      {e.patient?.blood_group && (
                        <p className="text-xs text-red-400 mt-1">Blood: {e.patient.blood_group}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hospital Info */}
            {hospital && (
              <div className="glass rounded-2xl p-4">
                <h3 className="font-semibold text-white mb-3">Hospital Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Emergency Capacity</span>
                    <span className="text-white">{hospital.emergency_capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ICU Beds</span>
                    <span className="text-white">{hospital.icu_beds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Trauma Support</span>
                    <span className={hospital.trauma_support ? 'text-green-400' : 'text-gray-500'}>
                      {hospital.trauma_support ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rating</span>
                    <span className="text-yellow-400">⭐ {hospital.rating}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Emergency Phone</span>
                    <a href={`tel:${hospital.phone}`} className="text-blue-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {hospital.phone}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
