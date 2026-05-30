require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'raksha_super_secret_jwt_key_2024';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ─── Persistent JSON Storage ──────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, '../data/users.json');

function loadUsers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw) || [];
    }
  } catch (e) {
    console.log('[DB] Could not load users.json:', e.message);
  }
  return [];
}

function saveUsers(users) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.log('[DB] Could not save users.json:', e.message);
  }
}

// Auto-save users every 10 seconds
setInterval(() => saveUsers(db.users), 10000);

// ─── In-Memory Data Stores ────────────────────────────────────────────────────
const db = {
  users: loadUsers(), // ← loaded from file on startup
  emergencies: [],
  ambulances: [],
  hospitals: [],
  drivers: [],
  notifications: [],
  emergencyTimeline: [],
  chatMessages: [],
  incidentHistory: [],
};

// ─── Seed Hospitals (Kanyakumari Region) ─────────────────────────────────────
db.hospitals = [
  {
    id: 'hosp-001',
    name: 'Kanyakumari Government Hospital',
    address: 'Main Road, Kanyakumari, Tamil Nadu 629702',
    lat: 8.0883,
    lng: 77.5385,
    phone: '04652-246200',
    emergency_capacity: 50,
    current_patients: 18,
    icu_beds: 10,
    icu_available: 4,
    trauma_support: true,
    rating: 4.2,
    is_active: true,
    specialties: ['Trauma', 'Cardiology', 'Emergency'],
  },
  {
    id: 'hosp-002',
    name: 'Sree Mookambika Mission Hospital',
    address: 'Colachel Road, Nagercoil, Tamil Nadu 629001',
    lat: 8.1833,
    lng: 77.4119,
    phone: '04652-230100',
    emergency_capacity: 80,
    current_patients: 35,
    icu_beds: 15,
    icu_available: 7,
    trauma_support: true,
    rating: 4.5,
    is_active: true,
    specialties: ['Cardiology', 'Neurology', 'Trauma', 'Orthopedics'],
  },
  {
    id: 'hosp-003',
    name: 'Narayana Multi Speciality Hospital',
    address: 'Bypass Road, Nagercoil, Tamil Nadu 629004',
    lat: 8.1765,
    lng: 77.4321,
    phone: '04652-235000',
    emergency_capacity: 60,
    current_patients: 22,
    icu_beds: 12,
    icu_available: 5,
    trauma_support: true,
    rating: 4.3,
    is_active: true,
    specialties: ['Cardiology', 'Oncology', 'Emergency'],
  },
  {
    id: 'hosp-004',
    name: 'Padmanabha Hospital',
    address: 'Thuckalay, Kanyakumari District, Tamil Nadu 629175',
    lat: 8.2456,
    lng: 77.3012,
    phone: '04651-280100',
    emergency_capacity: 40,
    current_patients: 12,
    icu_beds: 8,
    icu_available: 3,
    trauma_support: false,
    rating: 3.9,
    is_active: true,
    specialties: ['General Medicine', 'Pediatrics'],
  },
  {
    id: 'hosp-005',
    name: 'Vivekananda Medical Mission',
    address: 'Kanyakumari Town, Tamil Nadu 629702',
    lat: 8.0756,
    lng: 77.5512,
    phone: '04652-246500',
    emergency_capacity: 35,
    current_patients: 10,
    icu_beds: 6,
    icu_available: 2,
    trauma_support: false,
    rating: 4.0,
    is_active: true,
    specialties: ['General Medicine', 'Surgery'],
  },
];

// ─── Seed Drivers ─────────────────────────────────────────────────────────────
db.drivers = [
  { id: 'drv-001', name: 'Rajan Kumar', phone: '9876543210', license_number: 'TN01-2019-0012345', is_available: true, rating: 4.8, ambulance_id: 'amb-001' },
  { id: 'drv-002', name: 'Murugan S', phone: '9876543211', license_number: 'TN01-2018-0023456', is_available: true, rating: 4.6, ambulance_id: 'amb-002' },
  { id: 'drv-003', name: 'Selvam P', phone: '9876543212', license_number: 'TN01-2020-0034567', is_available: false, rating: 4.7, ambulance_id: 'amb-003' },
  { id: 'drv-004', name: 'Arjun Nair', phone: '9876543213', license_number: 'TN01-2017-0045678', is_available: true, rating: 4.9, ambulance_id: 'amb-004' },
  { id: 'drv-005', name: 'Suresh Babu', phone: '9876543214', license_number: 'TN01-2021-0056789', is_available: true, rating: 4.5, ambulance_id: 'amb-005' },
  { id: 'drv-006', name: 'Karthik M', phone: '9876543215', license_number: 'TN01-2019-0067890', is_available: true, rating: 4.4, ambulance_id: 'amb-006' },
  { id: 'drv-007', name: 'Vijay R', phone: '9876543216', license_number: 'TN01-2022-0078901', is_available: false, rating: 4.3, ambulance_id: 'amb-007' },
  { id: 'drv-008', name: 'Dinesh T', phone: '9876543217', license_number: 'TN01-2020-0089012', is_available: true, rating: 4.7, ambulance_id: 'amb-008' },
];

// ─── Seed Ambulances ──────────────────────────────────────────────────────────
db.ambulances = [
  { id: 'amb-001', vehicle_number: 'TN74-A-1001', driver_id: 'drv-001', hospital_id: 'hosp-001', status: 'available', lat: 8.0900, lng: 77.5400, last_updated: new Date() },
  { id: 'amb-002', vehicle_number: 'TN74-A-1002', driver_id: 'drv-002', hospital_id: 'hosp-001', status: 'available', lat: 8.0850, lng: 77.5350, last_updated: new Date() },
  { id: 'amb-003', vehicle_number: 'TN74-B-2001', driver_id: 'drv-003', hospital_id: 'hosp-002', status: 'busy', lat: 8.1800, lng: 77.4100, last_updated: new Date() },
  { id: 'amb-004', vehicle_number: 'TN74-B-2002', driver_id: 'drv-004', hospital_id: 'hosp-002', status: 'available', lat: 8.1850, lng: 77.4150, last_updated: new Date() },
  { id: 'amb-005', vehicle_number: 'TN74-C-3001', driver_id: 'drv-005', hospital_id: 'hosp-003', status: 'available', lat: 8.1750, lng: 77.4300, last_updated: new Date() },
  { id: 'amb-006', vehicle_number: 'TN74-D-4001', driver_id: 'drv-006', hospital_id: 'hosp-004', status: 'available', lat: 8.2400, lng: 77.3000, last_updated: new Date() },
  { id: 'amb-007', vehicle_number: 'TN74-E-5001', driver_id: 'drv-007', hospital_id: 'hosp-005', status: 'busy', lat: 8.0700, lng: 77.5500, last_updated: new Date() },
  { id: 'amb-008', vehicle_number: 'TN74-E-5002', driver_id: 'drv-008', hospital_id: 'hosp-005', status: 'available', lat: 8.0780, lng: 77.5480, last_updated: new Date() },
];

// ─── Seed Admin User ──────────────────────────────────────────────────────────
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  db.users.push({
    id: 'user-admin-001',
    name: 'System Admin',
    email: 'admin@raksha.in',
    phone: '9000000000',
    password_hash: hash,
    role: 'system_admin',
    blood_group: 'O+',
    allergies: [],
    medical_conditions: [],
    age: 35,
    address: 'Kanyakumari, Tamil Nadu',
    lat: 8.0883,
    lng: 77.5385,
    emergency_pin: '1234',
    is_active: true,
    created_at: new Date(),
  });
  const driverHash = await bcrypt.hash('driver123', 10);
  db.users.push({
    id: 'user-driver-001',
    name: 'Rajan Kumar',
    email: 'rajan@raksha.in',
    phone: '9876543210',
    password_hash: driverHash,
    role: 'driver',
    blood_group: 'A+',
    allergies: [],
    medical_conditions: [],
    age: 32,
    address: 'Kanyakumari, Tamil Nadu',
    lat: 8.0900,
    lng: 77.5400,
    emergency_pin: '5678',
    is_active: true,
    created_at: new Date(),
    driver_id: 'drv-001',
  });
})();

// ─── Utility: Haversine Distance ──────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Utility: Find Nearest Ambulance ─────────────────────────────────────────
function findNearestAmbulance(lat, lng) {
  const available = db.ambulances.filter((a) => a.status === 'available');
  if (!available.length) return null;
  return available.reduce((nearest, amb) => {
    const dist = haversineDistance(lat, lng, amb.lat, amb.lng);
    const nearestDist = haversineDistance(lat, lng, nearest.lat, nearest.lng);
    return dist < nearestDist ? amb : nearest;
  });
}

// ─── Utility: Find Nearest Hospital ──────────────────────────────────────────
function findNearestHospital(lat, lng) {
  return db.hospitals
    .filter((h) => h.is_active)
    .reduce((nearest, hosp) => {
      const dist = haversineDistance(lat, lng, hosp.lat, hosp.lng);
      const nearestDist = haversineDistance(lat, lng, nearest.lat, nearest.lng);
      return dist < nearestDist ? hosp : nearest;
    });
}

// ─── JWT Auth Middleware ──────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ─── Routes: Auth ─────────────────────────────────────────────────────────────
const authRouter = require('./routes/auth')(db, jwt, bcrypt, uuidv4, JWT_SECRET);
const emergenciesRouter = require('./routes/emergencies')(db, jwt, uuidv4, JWT_SECRET, io, haversineDistance, findNearestAmbulance, findNearestHospital);
const ambulancesRouter = require('./routes/ambulances')(db, authMiddleware, haversineDistance);
const hospitalsRouter = require('./routes/hospitals')(db, authMiddleware, haversineDistance);
const adminRouter = require('./routes/admin')(db, authMiddleware, requireRole, haversineDistance);
const notificationsRouter = require('./routes/notifications')(db, authMiddleware, uuidv4);

app.use('/api/auth', authRouter);
app.use('/api/emergencies', emergenciesRouter);
app.use('/api/ambulances', ambulancesRouter);
app.use('/api/hospitals', hospitalsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    emergencies: db.emergencies.length,
    ambulances: db.ambulances.length,
    hospitals: db.hospitals.length,
  });
});

// ─── Socket.io Real-Time Events ───────────────────────────────────────────────
const connectedUsers = new Map();
const driverSockets = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('authenticate', (data) => {
    try {
      const decoded = jwt.verify(data.token, JWT_SECRET);
      connectedUsers.set(decoded.id, socket.id);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      if (decoded.role === 'driver') {
        driverSockets.set(decoded.id, socket.id);
      }
      socket.join(`user_${decoded.id}`);
      if (decoded.role === 'system_admin' || decoded.role === 'hospital_admin') {
        socket.join('admin_room');
      }
      socket.emit('authenticated', { success: true, userId: decoded.id });
      console.log(`[Socket] Authenticated: ${decoded.id} (${decoded.role})`);
    } catch (err) {
      socket.emit('auth_error', { error: 'Invalid token' });
    }
  });

  // SOS Trigger
  socket.on('emergency_sos', async (data) => {
    const { userId, lat, lng, emergencyType, severity } = data;
    const emergencyId = `EMG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const nearestAmb = findNearestAmbulance(lat, lng);
    const nearestHosp = findNearestHospital(lat, lng);

    const emergency = {
      id: uuidv4(),
      emergency_id_code: emergencyId,
      user_id: userId,
      emergency_type: emergencyType || 'General',
      severity: severity || 'High',
      status: 'searching',
      lat,
      lng,
      address: data.address || 'Location acquired via GPS',
      ambulance_id: nearestAmb ? nearestAmb.id : null,
      hospital_id: nearestHosp ? nearestHosp.id : null,
      created_at: new Date(),
      resolved_at: null,
    };

    db.emergencies.push(emergency);

    const timeline = [
      { id: uuidv4(), emergency_id: emergency.id, status: 'gps_acquired', message: 'GPS location acquired', timestamp: new Date() },
      { id: uuidv4(), emergency_id: emergency.id, status: 'broadcast_sent', message: 'Emergency broadcast sent to all units', timestamp: new Date() },
    ];
    db.emergencyTimeline.push(...timeline);

    if (nearestAmb) {
      nearestAmb.status = 'dispatched';
      nearestAmb.current_emergency = emergency.id;
      const dist = haversineDistance(lat, lng, nearestAmb.lat, nearestAmb.lng);
      const eta = Math.round((dist / 60) * 60);

      db.emergencyTimeline.push({
        id: uuidv4(),
        emergency_id: emergency.id,
        status: 'ambulance_assigned',
        message: `Ambulance ${nearestAmb.vehicle_number} assigned. ETA: ${eta} minutes`,
        timestamp: new Date(),
      });

      emergency.status = 'ambulance_assigned';
      emergency.eta = eta;

      const driver = db.drivers.find((d) => d.id === nearestAmb.driver_id);

      // Notify user
      io.to(`user_${userId}`).emit('emergency_status_update', {
        emergencyId: emergency.id,
        status: 'ambulance_assigned',
        ambulance: { ...nearestAmb, driver },
        hospital: nearestHosp,
        eta,
        timeline: db.emergencyTimeline.filter((t) => t.emergency_id === emergency.id),
      });

      // Notify driver
      if (driver) {
        const driverSocketId = driverSockets.get(driver.id);
        if (driverSocketId) {
          io.to(driverSocketId).emit('new_emergency_request', {
            emergency,
            patient: db.users.find((u) => u.id === userId),
            distance: dist.toFixed(2),
            eta,
          });
        }
      }

      // Start ambulance simulation
      simulateAmbulanceMovement(emergency.id, nearestAmb.id, lat, lng);
    }

    // Notify admins
    io.to('admin_room').emit('new_emergency', {
      emergency,
      ambulance: nearestAmb,
      hospital: nearestHosp,
    });

    socket.emit('sos_confirmed', {
      emergencyId: emergency.id,
      emergencyCode: emergencyId,
      status: emergency.status,
      ambulance: nearestAmb,
      hospital: nearestHosp,
      timeline: db.emergencyTimeline.filter((t) => t.emergency_id === emergency.id),
    });
  });

  // Ambulance location update
  socket.on('ambulance_location_update', (data) => {
    const { ambulanceId, lat, lng } = data;
    const amb = db.ambulances.find((a) => a.id === ambulanceId);
    if (amb) {
      amb.lat = lat;
      amb.lng = lng;
      amb.last_updated = new Date();

      if (amb.current_emergency) {
        const emergency = db.emergencies.find((e) => e.id === amb.current_emergency);
        if (emergency) {
          const dist = haversineDistance(lat, lng, emergency.lat, emergency.lng);
          const eta = Math.round((dist / 60) * 60);
          io.to(`user_${emergency.user_id}`).emit('ambulance_position', {
            ambulanceId,
            lat,
            lng,
            eta,
            distanceKm: dist.toFixed(2),
          });
        }
      }
      io.to('admin_room').emit('fleet_update', { ambulanceId, lat, lng });
    }
  });

  // Driver accepts emergency
  socket.on('driver_accept_emergency', (data) => {
    const { emergencyId, driverId } = data;
    const emergency = db.emergencies.find((e) => e.id === emergencyId);
    if (emergency) {
      emergency.status = 'en_route';
      db.emergencyTimeline.push({
        id: uuidv4(),
        emergency_id: emergencyId,
        status: 'driver_accepted',
        message: 'Driver accepted and is en route',
        timestamp: new Date(),
      });
      io.to(`user_${emergency.user_id}`).emit('emergency_status_update', {
        emergencyId,
        status: 'en_route',
        message: 'Driver accepted and is en route to you',
        timeline: db.emergencyTimeline.filter((t) => t.emergency_id === emergencyId),
      });
    }
  });

  // Emergency status update
  socket.on('emergency_status_update', (data) => {
    const { emergencyId, status, message } = data;
    const emergency = db.emergencies.find((e) => e.id === emergencyId);
    if (emergency) {
      emergency.status = status;
      db.emergencyTimeline.push({
        id: uuidv4(),
        emergency_id: emergencyId,
        status,
        message: message || `Status updated to ${status}`,
        timestamp: new Date(),
      });
      io.to(`user_${emergency.user_id}`).emit('emergency_status_update', {
        emergencyId,
        status,
        message,
        timeline: db.emergencyTimeline.filter((t) => t.emergency_id === emergencyId),
      });
      io.to('admin_room').emit('emergency_updated', { emergencyId, status });
    }
  });

  // Hospital alert
  socket.on('hospital_alert', (data) => {
    const { hospitalId, emergencyId, patientInfo } = data;
    io.to(`hospital_${hospitalId}`).emit('incoming_patient', {
      emergencyId,
      patientInfo,
      eta: data.eta,
    });
  });

  // Chat message
  socket.on('chat_message', (data) => {
    const { emergencyId, senderId, senderRole, message } = data;
    const chatMsg = {
      id: uuidv4(),
      emergency_id: emergencyId,
      sender_id: senderId,
      sender_role: senderRole,
      message,
      timestamp: new Date(),
    };
    db.chatMessages.push(chatMsg);
    const emergency = db.emergencies.find((e) => e.id === emergencyId);
    if (emergency) {
      io.to(`user_${emergency.user_id}`).emit('new_chat_message', chatMsg);
      if (emergency.ambulance_id) {
        const amb = db.ambulances.find((a) => a.id === emergency.ambulance_id);
        if (amb) {
          const driver = db.drivers.find((d) => d.id === amb.driver_id);
          if (driver) {
            const driverSocketId = driverSockets.get(driver.id);
            if (driverSocketId) io.to(driverSocketId).emit('new_chat_message', chatMsg);
          }
        }
      }
    }
    io.to('admin_room').emit('new_chat_message', chatMsg);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      driverSockets.delete(socket.userId);
    }
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── Ambulance Movement Simulation ───────────────────────────────────────────
function simulateAmbulanceMovement(emergencyId, ambulanceId, targetLat, targetLng) {
  const amb = db.ambulances.find((a) => a.id === ambulanceId);
  if (!amb) return;

  const steps = 20;
  let step = 0;
  const startLat = amb.lat;
  const startLng = amb.lng;

  const interval = setInterval(() => {
    step++;
    const progress = step / steps;
    amb.lat = startLat + (targetLat - startLat) * progress;
    amb.lng = startLng + (targetLng - startLng) * progress;
    amb.last_updated = new Date();

    const emergency = db.emergencies.find((e) => e.id === emergencyId);
    if (emergency) {
      const dist = haversineDistance(amb.lat, amb.lng, targetLat, targetLng);
      const eta = Math.max(0, Math.round((dist / 60) * 60));

      io.to(`user_${emergency.user_id}`).emit('ambulance_position', {
        ambulanceId,
        lat: amb.lat,
        lng: amb.lng,
        eta,
        distanceKm: dist.toFixed(2),
        progress: Math.round(progress * 100),
      });
      io.to('admin_room').emit('fleet_update', { ambulanceId, lat: amb.lat, lng: amb.lng });
    }

    if (step >= steps) {
      clearInterval(interval);
      if (emergency) {
        emergency.status = 'arrived';
        db.emergencyTimeline.push({
          id: uuidv4(),
          emergency_id: emergencyId,
          status: 'arrived',
          message: 'Ambulance has arrived at your location',
          timestamp: new Date(),
        });
        io.to(`user_${emergency.user_id}`).emit('emergency_status_update', {
          emergencyId,
          status: 'arrived',
          message: 'Ambulance has arrived at your location',
          timeline: db.emergencyTimeline.filter((t) => t.emergency_id === emergencyId),
        });
      }
    }
  }, 3000);
}

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚨 RAKSHA Emergency Platform Backend`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Hospitals loaded: ${db.hospitals.length}`);
  console.log(`🚑 Ambulances loaded: ${db.ambulances.length}`);
  console.log(`👤 Drivers loaded: ${db.drivers.length}\n`);
});

module.exports = { app, server, db, io };
