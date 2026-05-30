-- RAKSHA Emergency Response Platform - PostgreSQL Schema
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'driver', 'hospital_admin', 'system_admin')),
    blood_group VARCHAR(5),
    allergies TEXT[],
    medical_conditions TEXT[],
    age INTEGER CHECK (age > 0 AND age < 150),
    address TEXT,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    emergency_pin VARCHAR(6),
    profile_photo_url TEXT,
    insurance_provider VARCHAR(100),
    insurance_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ─── Emergency Contacts ───────────────────────────────────────────────────────
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    relationship VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_user ON emergency_contacts(user_id);

-- ─── Hospitals ────────────────────────────────────────────────────────────────
CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    emergency_phone VARCHAR(15),
    emergency_capacity INTEGER DEFAULT 0,
    current_patients INTEGER DEFAULT 0,
    icu_beds INTEGER DEFAULT 0,
    icu_available INTEGER DEFAULT 0,
    trauma_support BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3, 2) DEFAULT 0.0,
    specialties TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    admin_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hospitals_location ON hospitals(lat, lng);
CREATE INDEX idx_hospitals_active ON hospitals(is_active);

-- ─── Drivers ─────────────────────────────────────────────────────────────────
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    ambulance_id UUID,
    is_available BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drivers_available ON drivers(is_available);
CREATE INDEX idx_drivers_user ON drivers(user_id);

-- ─── Ambulances ───────────────────────────────────────────────────────────────
CREATE TABLE ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    driver_id UUID REFERENCES drivers(id),
    hospital_id UUID REFERENCES hospitals(id),
    status VARCHAR(20) DEFAULT 'available'
        CHECK (status IN ('available', 'dispatched', 'busy', 'maintenance', 'offline')),
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7),
    equipment TEXT[],
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ambulances_status ON ambulances(status);
CREATE INDEX idx_ambulances_location ON ambulances(lat, lng);
CREATE INDEX idx_ambulances_hospital ON ambulances(hospital_id);

-- Add FK from drivers to ambulances
ALTER TABLE drivers ADD CONSTRAINT fk_driver_ambulance
    FOREIGN KEY (ambulance_id) REFERENCES ambulances(id);

-- ─── Emergencies ─────────────────────────────────────────────────────────────
CREATE TABLE emergencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id_code VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    emergency_type VARCHAR(50) NOT NULL DEFAULT 'General'
        CHECK (emergency_type IN ('Accident', 'Cardiac', 'Breathing', 'Bleeding', 'Burns', 'Seizure', 'Stroke', 'Poisoning', 'General', 'Other')),
    severity VARCHAR(20) DEFAULT 'High'
        CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')),
    status VARCHAR(30) DEFAULT 'searching'
        CHECK (status IN ('searching', 'ambulance_assigned', 'en_route', 'arrived', 'patient_onboard', 'reached_hospital', 'resolved', 'cancelled')),
    lat DECIMAL(10, 7) NOT NULL,
    lng DECIMAL(10, 7) NOT NULL,
    address TEXT,
    ambulance_id UUID REFERENCES ambulances(id),
    hospital_id UUID REFERENCES hospitals(id),
    eta_minutes INTEGER,
    pain_level INTEGER CHECK (pain_level >= 1 AND pain_level <= 10),
    is_breathing BOOLEAN,
    is_conscious BOOLEAN,
    bleeding_severity VARCHAR(20),
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_emergencies_user ON emergencies(user_id);
CREATE INDEX idx_emergencies_status ON emergencies(status);
CREATE INDEX idx_emergencies_created ON emergencies(created_at DESC);
CREATE INDEX idx_emergencies_ambulance ON emergencies(ambulance_id);
CREATE INDEX idx_emergencies_hospital ON emergencies(hospital_id);

-- ─── Emergency Timeline ───────────────────────────────────────────────────────
CREATE TABLE emergency_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    actor_id UUID REFERENCES users(id),
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_timeline_emergency ON emergency_timeline(emergency_id);
CREATE INDEX idx_timeline_timestamp ON emergency_timeline(timestamp DESC);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'info'
        CHECK (type IN ('emergency', 'info', 'warning', 'success', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    related_emergency_id UUID REFERENCES emergencies(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ─── Incident History ─────────────────────────────────────────────────────────
CREATE TABLE incident_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id UUID NOT NULL REFERENCES emergencies(id),
    user_id UUID NOT NULL REFERENCES users(id),
    summary TEXT,
    outcome VARCHAR(50)
        CHECK (outcome IN ('recovered', 'hospitalized', 'critical', 'deceased', 'false_alarm', 'unknown')),
    hospital_name VARCHAR(200),
    ambulance_number VARCHAR(20),
    response_time_minutes INTEGER,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_incident_history_user ON incident_history(user_id);
CREATE INDEX idx_incident_history_emergency ON incident_history(emergency_id);

-- ─── Chat Messages ────────────────────────────────────────────────────────────
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_id UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_role VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text'
        CHECK (message_type IN ('text', 'location', 'image', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_emergency ON chat_messages(emergency_id);
CREATE INDEX idx_chat_timestamp ON chat_messages(timestamp ASC);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ─── Functions & Triggers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_hospitals_updated BEFORE UPDATE ON hospitals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_emergencies_updated BEFORE UPDATE ON emergencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Seed Data: Kanyakumari Hospitals ────────────────────────────────────────
INSERT INTO hospitals (id, name, address, lat, lng, phone, emergency_capacity, current_patients, icu_beds, icu_available, trauma_support, rating, specialties, is_active) VALUES
('a1b2c3d4-0001-0001-0001-000000000001', 'Kanyakumari Government Hospital', 'Main Road, Kanyakumari, Tamil Nadu 629702', 8.0883, 77.5385, '04652-246200', 50, 18, 10, 4, TRUE, 4.2, ARRAY['Trauma', 'Cardiology', 'Emergency'], TRUE),
('a1b2c3d4-0002-0002-0002-000000000002', 'Sree Mookambika Mission Hospital', 'Colachel Road, Nagercoil, Tamil Nadu 629001', 8.1833, 77.4119, '04652-230100', 80, 35, 15, 7, TRUE, 4.5, ARRAY['Cardiology', 'Neurology', 'Trauma', 'Orthopedics'], TRUE),
('a1b2c3d4-0003-0003-0003-000000000003', 'Narayana Multi Speciality Hospital', 'Bypass Road, Nagercoil, Tamil Nadu 629004', 8.1765, 77.4321, '04652-235000', 60, 22, 12, 5, TRUE, 4.3, ARRAY['Cardiology', 'Oncology', 'Emergency'], TRUE),
('a1b2c3d4-0004-0004-0004-000000000004', 'Padmanabha Hospital', 'Thuckalay, Kanyakumari District, Tamil Nadu 629175', 8.2456, 77.3012, '04651-280100', 40, 12, 8, 3, FALSE, 3.9, ARRAY['General Medicine', 'Pediatrics'], TRUE),
('a1b2c3d4-0005-0005-0005-000000000005', 'Vivekananda Medical Mission', 'Kanyakumari Town, Tamil Nadu 629702', 8.0756, 77.5512, '04652-246500', 35, 10, 6, 2, FALSE, 4.0, ARRAY['General Medicine', 'Surgery'], TRUE);
