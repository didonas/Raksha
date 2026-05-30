# 🚨 RAKSHA — Emergency Response Platform

A full-stack, production-grade emergency response platform built for the Kanyakumari region. RAKSHA provides instant SOS activation, real-time ambulance tracking, AI-guided first aid, and a complete emergency management ecosystem.

---

## 🏗️ Architecture Overview

```
raksha/
├── frontend/          # React + TypeScript + Tailwind CSS (PWA)
│   ├── src/
│   │   ├── pages/     # 13 complete screen components
│   │   ├── components/# 12 reusable UI components
│   │   ├── store/     # Zustand state management
│   │   ├── services/  # API + Socket.io client
│   │   ├── hooks/     # Custom React hooks
│   │   └── utils/     # Utilities + offline storage
│   └── public/        # PWA manifest, HTML template
└── backend/           # Node.js + Express + Socket.io
    └── src/
        ├── index.js   # Main server + Socket.io events
        ├── routes/    # 5 REST API route modules
        ├── middleware/ # JWT auth + RBAC
        └── database/  # PostgreSQL schema
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and install
cd raksha
npm install
npm install --workspace=frontend
npm install --workspace=backend

# Start both frontend and backend
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

---

## 🔐 Demo Credentials

| Role | Email/Phone | Password |
|------|-------------|----------|
| System Admin | admin@raksha.in | admin123 |
| Driver | 9876543210 | driver123 |
| User | Register new account | — |

---

## 📱 Features

### User Features
- **SOS Button** — Press & hold 3 seconds to trigger emergency
- **Live Tracking** — Real-time ambulance tracking on Leaflet map
- **Victim Assistant** — Step-by-step emergency diagnosis & first aid
- **Bystander Guide** — CPR, bleeding control, recovery position
- **Hospital Directory** — 5 Kanyakumari hospitals with live capacity
- **Voice Assistant** — Web Speech API for hands-free operation
- **Offline Mode** — Emergency guides cached for offline use
- **PWA** — Installable as mobile app

### Driver Features
- Incoming emergency requests with 30-second accept timer
- Real-time navigation to patient location
- Status updates: En Route → Arrived → Patient Onboard → Hospital
- Emergency chat with patient

### Admin Features
- Live emergency feed with real-time updates
- Fleet management (8 ambulances)
- Analytics: hourly charts, type distribution, response times
- Hospital capacity monitoring
- User management

### Hospital Admin Features
- Incoming patient alerts
- Bed capacity management
- ICU availability tracking

---

## 🗺️ Pre-loaded Data (Kanyakumari Region)

### Hospitals
1. Kanyakumari Government Hospital (8.0883°N, 77.5385°E)
2. Sree Mookambika Mission Hospital (8.1833°N, 77.4119°E)
3. Narayana Multi Speciality Hospital (8.1765°N, 77.4321°E)
4. Padmanabha Hospital (8.2456°N, 77.3012°E)
5. Vivekananda Medical Mission (8.0756°N, 77.5512°E)

### Ambulances
8 ambulances pre-loaded across all hospitals (TN74-A-1001 through TN74-E-5002)

---

## 🔌 API Reference

### Authentication
```
POST /api/auth/register     — Create account
POST /api/auth/login        — Login (password/PIN/OTP)
GET  /api/auth/profile      — Get profile
PUT  /api/auth/profile      — Update profile
```

### Emergencies
```
POST /api/emergencies/sos           — Trigger SOS
GET  /api/emergencies/:id           — Get emergency details
PUT  /api/emergencies/:id/status    — Update status
GET  /api/emergencies/user/history  — User's history
POST /api/emergencies/:id/chat      — Send chat message
GET  /api/emergencies/active        — Live emergencies (admin)
```

### Hospitals
```
GET /api/hospitals          — List all hospitals
GET /api/hospitals/nearest  — Nearest hospitals (?lat=&lng=)
GET /api/hospitals/:id      — Hospital details
PUT /api/hospitals/:id/capacity — Update capacity
```

### Ambulances
```
GET /api/ambulances         — List all
GET /api/ambulances/nearest — Nearest available (?lat=&lng=)
PUT /api/ambulances/:id/location — Update GPS
PUT /api/ambulances/:id/status   — Update status
```

### Admin
```
GET /api/admin/dashboard        — Stats overview
GET /api/admin/emergencies/live — Live feed
GET /api/admin/analytics        — Charts data
GET /api/admin/heatmap          — Emergency heatmap
```

---

## ⚡ Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | `{ token }` | Authenticate socket connection |
| `emergency_sos` | `{ userId, lat, lng, emergencyType }` | Trigger SOS |
| `ambulance_location_update` | `{ ambulanceId, lat, lng }` | Update ambulance GPS |
| `driver_accept_emergency` | `{ emergencyId, driverId }` | Driver accepts request |
| `emergency_status_update` | `{ emergencyId, status, message }` | Update status |
| `chat_message` | `{ emergencyId, senderId, message }` | Send chat |

### Server → Client
| Event | Description |
|-------|-------------|
| `sos_confirmed` | SOS activated, ambulance assigned |
| `emergency_status_update` | Status changed |
| `ambulance_position` | Real-time ambulance GPS |
| `new_chat_message` | New chat message |
| `new_emergency_request` | New request for driver |
| `fleet_update` | Ambulance position (admin) |

---

## 🛡️ Security

- JWT authentication with 7-day expiry
- Role-based access control (user, driver, hospital_admin, system_admin)
- Rate limiting: 200 requests per 15 minutes
- Helmet.js security headers
- CORS configured for frontend origin
- bcrypt password hashing (12 rounds)

---

## 📊 Database Schema

PostgreSQL schema with 10 tables:
- `users` — All user types with medical info
- `hospitals` — Hospital details and capacity
- `ambulances` — Fleet with GPS tracking
- `drivers` — Driver profiles and ratings
- `emergencies` — Emergency records with full details
- `emergency_timeline` — Status history
- `emergency_contacts` — User's emergency contacts
- `notifications` — Push notifications
- `chat_messages` — Emergency chat
- `incident_history` — Post-incident records

---

## 🎨 Design System

- **Primary**: Emergency Red (#DC2626)
- **Background**: Deep Dark (#0a0a0f)
- **Glass**: Glassmorphism with backdrop-blur
- **Animations**: Framer Motion + CSS keyframes
- **Maps**: Leaflet.js with OpenStreetMap
- **Charts**: Recharts
- **Icons**: Lucide React
- **Fonts**: Inter + Rajdhani (emergency)

---

## 📞 Emergency Numbers (India)

| Service | Number |
|---------|--------|
| Ambulance | **108** |
| Police | 100 |
| Fire | 101 |
| Disaster | 1078 |
| Women Helpline | 1091 |

---

## 🤝 Good Samaritan Law

RAKSHA prominently displays Good Samaritan Law protections to encourage bystander assistance. Under Indian law, anyone providing emergency assistance in good faith is legally protected from civil and criminal liability.

---

*Built with ❤️ for emergency response in Kanyakumari, Tamil Nadu*
