const express = require('express');

module.exports = function (db, authMiddleware, haversineDistance) {
  const router = express.Router();

  // GET /api/hospitals - List all hospitals
  router.get('/', (req, res) => {
    const hospitals = db.hospitals
      .filter((h) => h.is_active)
      .map((h) => ({
        ...h,
        available_capacity: h.emergency_capacity - h.current_patients,
        occupancy_percent: Math.round((h.current_patients / h.emergency_capacity) * 100),
      }));
    res.json({ hospitals, count: hospitals.length });
  });

  // GET /api/hospitals/nearest - Find nearest hospitals within optional radius
  router.get('/nearest', (req, res) => {
    const { lat, lng, limit = 20, radius } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 25; // default 25km

    const sorted = db.hospitals
      .filter((h) => h.is_active)
      .map((h) => ({
        ...h,
        distance: haversineDistance(userLat, userLng, h.lat, h.lng),
        available_capacity: h.emergency_capacity - h.current_patients,
        occupancy_percent: Math.round((h.current_patients / h.emergency_capacity) * 100),
      }))
      .filter((h) => h.distance <= radiusKm) // filter by radius
      .sort((a, b) => a.distance - b.distance)
      .slice(0, parseInt(limit));

    res.json({ hospitals: sorted, count: sorted.length, radius_km: radiusKm });
  });

  // GET /api/hospitals/:id
  router.get('/:id', (req, res) => {
    const hospital = db.hospitals.find((h) => h.id === req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const activeEmergencies = db.emergencies.filter(
      (e) => e.hospital_id === hospital.id && !['resolved', 'cancelled'].includes(e.status)
    );

    res.json({
      hospital: {
        ...hospital,
        available_capacity: hospital.emergency_capacity - hospital.current_patients,
        occupancy_percent: Math.round((hospital.current_patients / hospital.emergency_capacity) * 100),
        active_emergencies: activeEmergencies.length,
        ambulances: db.ambulances.filter((a) => a.hospital_id === hospital.id),
      },
    });
  });

  // PUT /api/hospitals/:id/capacity - Update hospital capacity
  router.put('/:id/capacity', authMiddleware, (req, res) => {
    const hospital = db.hospitals.find((h) => h.id === req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const { current_patients, icu_available, emergency_capacity } = req.body;
    if (current_patients !== undefined) hospital.current_patients = parseInt(current_patients);
    if (icu_available !== undefined) hospital.icu_available = parseInt(icu_available);
    if (emergency_capacity !== undefined) hospital.emergency_capacity = parseInt(emergency_capacity);

    res.json({ message: 'Capacity updated', hospital });
  });

  // GET /api/hospitals/:id/emergencies - Get emergencies for a hospital
  router.get('/:id/emergencies', authMiddleware, (req, res) => {
    const hospital = db.hospitals.find((h) => h.id === req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });

    const emergencies = db.emergencies
      .filter((e) => e.hospital_id === req.params.id)
      .map((e) => ({
        ...e,
        patient: (() => {
          const u = db.users.find((u) => u.id === e.user_id);
          if (!u) return null;
          const { password_hash: _, ...safe } = u;
          return safe;
        })(),
        ambulance: db.ambulances.find((a) => a.id === e.ambulance_id),
        timeline: db.emergencyTimeline.filter((t) => t.emergency_id === e.id),
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ emergencies, count: emergencies.length });
  });

  return router;
};
