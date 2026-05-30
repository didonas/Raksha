const express = require('express');

module.exports = function (db, authMiddleware, requireRole, haversineDistance) {
  const router = express.Router();

  const adminOnly = [authMiddleware, requireRole('system_admin', 'hospital_admin')];

  // GET /api/admin/dashboard
  router.get('/dashboard', ...adminOnly, (req, res) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeEmergencies = db.emergencies.filter((e) => !['resolved', 'cancelled'].includes(e.status));
    const todayEmergencies = db.emergencies.filter((e) => new Date(e.created_at) >= todayStart);
    const availableAmbulances = db.ambulances.filter((a) => a.status === 'available');
    const activeHospitals = db.hospitals.filter((h) => h.is_active);

    const avgResponseTime = todayEmergencies.length > 0
      ? Math.round(todayEmergencies.reduce((sum, e) => sum + (e.eta || 8), 0) / todayEmergencies.length)
      : 0;

    const byType = db.emergencies.reduce((acc, e) => {
      acc[e.emergency_type] = (acc[e.emergency_type] || 0) + 1;
      return acc;
    }, {});

    const bySeverity = db.emergencies.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + 1;
      return acc;
    }, {});

    res.json({
      stats: {
        active_emergencies: activeEmergencies.length,
        available_ambulances: availableAmbulances.length,
        total_ambulances: db.ambulances.length,
        hospitals_online: activeHospitals.length,
        today_incidents: todayEmergencies.length,
        total_incidents: db.emergencies.length,
        total_users: db.users.filter((u) => u.role === 'user').length,
        avg_response_time_minutes: avgResponseTime,
      },
      by_type: byType,
      by_severity: bySeverity,
      recent_emergencies: db.emergencies
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map((e) => ({
          ...e,
          hospital: db.hospitals.find((h) => h.id === e.hospital_id),
          ambulance: db.ambulances.find((a) => a.id === e.ambulance_id),
        })),
    });
  });

  // GET /api/admin/emergencies/live
  router.get('/emergencies/live', ...adminOnly, (req, res) => {
    const live = db.emergencies
      .filter((e) => !['resolved', 'cancelled'].includes(e.status))
      .map((e) => ({
        ...e,
        patient: (() => {
          const u = db.users.find((u) => u.id === e.user_id);
          if (!u) return null;
          const { password_hash: _, ...safe } = u;
          return safe;
        })(),
        ambulance: (() => {
          const a = db.ambulances.find((a) => a.id === e.ambulance_id);
          if (!a) return null;
          return { ...a, driver: db.drivers.find((d) => d.id === a.driver_id) };
        })(),
        hospital: db.hospitals.find((h) => h.id === e.hospital_id),
        timeline: db.emergencyTimeline.filter((t) => t.emergency_id === e.id),
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ emergencies: live, count: live.length });
  });

  // GET /api/admin/analytics
  router.get('/analytics', ...adminOnly, (req, res) => {
    const now = new Date();
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now);
      hour.setHours(i, 0, 0, 0);
      const nextHour = new Date(hour);
      nextHour.setHours(i + 1);
      const count = db.emergencies.filter((e) => {
        const t = new Date(e.created_at);
        return t >= hour && t < nextHour;
      }).length;
      return { hour: `${i.toString().padStart(2, '0')}:00`, count };
    });

    const typeData = Object.entries(
      db.emergencies.reduce((acc, e) => {
        acc[e.emergency_type] = (acc[e.emergency_type] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    const responseTimeData = db.emergencies
      .filter((e) => e.eta)
      .map((e) => ({ id: e.emergency_id_code, eta: e.eta, type: e.emergency_type }));

    res.json({
      hourly: hourlyData,
      by_type: typeData,
      response_times: responseTimeData,
      fleet_status: {
        available: db.ambulances.filter((a) => a.status === 'available').length,
        dispatched: db.ambulances.filter((a) => a.status === 'dispatched').length,
        busy: db.ambulances.filter((a) => a.status === 'busy').length,
        maintenance: db.ambulances.filter((a) => a.status === 'maintenance').length,
      },
      hospital_capacity: db.hospitals.map((h) => ({
        name: h.name,
        capacity: h.emergency_capacity,
        current: h.current_patients,
        icu_available: h.icu_available,
      })),
    });
  });

  // GET /api/admin/users
  router.get('/users', ...adminOnly, (req, res) => {
    const users = db.users.map((u) => {
      const { password_hash: _, ...safe } = u;
      return safe;
    });
    res.json({ users, count: users.length });
  });

  // PUT /api/admin/ambulances/:id
  router.put('/ambulances/:id', ...adminOnly, (req, res) => {
    const amb = db.ambulances.find((a) => a.id === req.params.id);
    if (!amb) return res.status(404).json({ error: 'Ambulance not found' });

    const { status, driver_id, hospital_id } = req.body;
    if (status) amb.status = status;
    if (driver_id) amb.driver_id = driver_id;
    if (hospital_id) amb.hospital_id = hospital_id;
    amb.last_updated = new Date();

    res.json({ message: 'Ambulance updated', ambulance: amb });
  });

  // GET /api/admin/heatmap
  router.get('/heatmap', ...adminOnly, (req, res) => {
    const heatmapData = db.emergencies.map((e) => ({
      lat: e.lat,
      lng: e.lng,
      weight: e.severity === 'Critical' ? 3 : e.severity === 'High' ? 2 : 1,
      type: e.emergency_type,
    }));
    res.json({ heatmap: heatmapData, count: heatmapData.length });
  });

  return router;
};
