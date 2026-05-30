const express = require('express');

module.exports = function (db, authMiddleware, haversineDistance) {
  const router = express.Router();

  // GET /api/ambulances - List all ambulances
  router.get('/', authMiddleware, (req, res) => {
    const ambulances = db.ambulances.map((amb) => ({
      ...amb,
      driver: db.drivers.find((d) => d.id === amb.driver_id),
      hospital: db.hospitals.find((h) => h.id === amb.hospital_id),
    }));
    res.json({ ambulances, count: ambulances.length });
  });

  // GET /api/ambulances/nearest - Find nearest available ambulance
  router.get('/nearest', (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const available = db.ambulances
      .filter((a) => a.status === 'available')
      .map((amb) => ({
        ...amb,
        driver: db.drivers.find((d) => d.id === amb.driver_id),
        hospital: db.hospitals.find((h) => h.id === amb.hospital_id),
        distance: haversineDistance(userLat, userLng, amb.lat, amb.lng),
        eta: Math.max(1, Math.round((haversineDistance(userLat, userLng, amb.lat, amb.lng) / 60) * 60)),
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({
      nearest: available[0] || null,
      all: available,
      count: available.length,
    });
  });

  // GET /api/ambulances/:id
  router.get('/:id', authMiddleware, (req, res) => {
    const amb = db.ambulances.find((a) => a.id === req.params.id);
    if (!amb) return res.status(404).json({ error: 'Ambulance not found' });

    res.json({
      ambulance: {
        ...amb,
        driver: db.drivers.find((d) => d.id === amb.driver_id),
        hospital: db.hospitals.find((h) => h.id === amb.hospital_id),
        current_emergency: db.emergencies.find((e) => e.id === amb.current_emergency) || null,
      },
    });
  });

  // PUT /api/ambulances/:id/location - Update ambulance GPS position
  router.put('/:id/location', authMiddleware, (req, res) => {
    const { lat, lng } = req.body;
    const amb = db.ambulances.find((a) => a.id === req.params.id);
    if (!amb) return res.status(404).json({ error: 'Ambulance not found' });

    amb.lat = parseFloat(lat);
    amb.lng = parseFloat(lng);
    amb.last_updated = new Date();

    res.json({ message: 'Location updated', ambulance: amb });
  });

  // PUT /api/ambulances/:id/status - Update ambulance status
  router.put('/:id/status', authMiddleware, (req, res) => {
    const { status } = req.body;
    const validStatuses = ['available', 'dispatched', 'busy', 'maintenance', 'offline'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', valid: validStatuses });
    }

    const amb = db.ambulances.find((a) => a.id === req.params.id);
    if (!amb) return res.status(404).json({ error: 'Ambulance not found' });

    amb.status = status;
    amb.last_updated = new Date();

    res.json({ message: 'Status updated', ambulance: amb });
  });

  return router;
};
