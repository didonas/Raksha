const express = require('express');

module.exports = function (db, jwt, uuidv4, JWT_SECRET, io, haversineDistance, findNearestAmbulance, findNearestHospital) {
  const router = express.Router();

  function getUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    try {
      return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
      return null;
    }
  }

  // POST /api/emergencies/sos
  router.post('/sos', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { lat, lng, emergency_type, severity, address, pain_level, is_breathing, is_conscious, bleeding_severity } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location (lat, lng) is required' });
    }

    const emergencyId = `EMG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const nearestAmb = findNearestAmbulance(lat, lng);
    const nearestHosp = findNearestHospital(lat, lng);

    const emergency = {
      id: uuidv4(),
      emergency_id_code: emergencyId,
      user_id: user.id,
      emergency_type: emergency_type || 'General',
      severity: severity || 'High',
      status: nearestAmb ? 'ambulance_assigned' : 'searching',
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      address: address || 'GPS Location',
      ambulance_id: nearestAmb ? nearestAmb.id : null,
      hospital_id: nearestHosp ? nearestHosp.id : null,
      pain_level: pain_level || null,
      is_breathing: is_breathing !== undefined ? is_breathing : null,
      is_conscious: is_conscious !== undefined ? is_conscious : null,
      bleeding_severity: bleeding_severity || null,
      created_at: new Date(),
      resolved_at: null,
    };

    db.emergencies.push(emergency);

    const timeline = [
      { id: uuidv4(), emergency_id: emergency.id, status: 'gps_acquired', message: 'GPS location acquired successfully', timestamp: new Date() },
      { id: uuidv4(), emergency_id: emergency.id, status: 'broadcast_sent', message: 'Emergency broadcast sent to all nearby units', timestamp: new Date() },
    ];

    if (nearestAmb) {
      nearestAmb.status = 'dispatched';
      nearestAmb.current_emergency = emergency.id;
      const dist = haversineDistance(lat, lng, nearestAmb.lat, nearestAmb.lng);
      const eta = Math.max(1, Math.round((dist / 60) * 60));
      emergency.eta = eta;

      timeline.push({
        id: uuidv4(),
        emergency_id: emergency.id,
        status: 'ambulance_assigned',
        message: `Ambulance ${nearestAmb.vehicle_number} assigned. ETA: ${eta} minutes`,
        timestamp: new Date(),
      });
    }

    db.emergencyTimeline.push(...timeline);

    // Create notification
    db.notifications.push({
      id: uuidv4(),
      user_id: user.id,
      title: 'Emergency Activated',
      message: `Your emergency (${emergencyId}) has been registered. Help is on the way.`,
      type: 'emergency',
      is_read: false,
      related_emergency_id: emergency.id,
      created_at: new Date(),
    });

    // --- Twilio SMS & Call Integration ---
    const ambulanceNumber = '+918925137410';
    const topEmergencyNumber = '+918807905821';
    const victimAlertNumber = '+918438783710';
    
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
        const victimLat = parseFloat(lat).toFixed(6);
        const victimLng = parseFloat(lng).toFixed(6);
        const messageBody = `EMERGENCY SOS by ${user.name}. Victim Location: https://www.google.com/maps?q=${victimLat},${victimLng} (Lat:${victimLat}, Lng:${victimLng})`;
        
        // 1. Send SMS to Ambulance
        twilioClient.messages.create({
          body: messageBody,
          from: twilioFromNumber,
          to: ambulanceNumber
        }).then(msg => console.log(`[Twilio] SMS sent to Ambulance: ${msg.sid}`))
          .catch(err => console.error('[Twilio SMS Error - Ambulance]:', err.message));

        // 2. Send SMS to Emergency Number
        twilioClient.messages.create({
          body: messageBody,
          from: twilioFromNumber,
          to: topEmergencyNumber
        }).then(msg => console.log(`[Twilio] SMS sent to Emergency Contact: ${msg.sid}`))
          .catch(err => console.error('[Twilio SMS Error - Emergency Contact]:', err.message));

        // 3. Send SMS to victim alert number
        twilioClient.messages.create({
          body: messageBody,
          from: twilioFromNumber,
          to: victimAlertNumber
        }).then(msg => console.log(`[Twilio] SMS sent to Victim Alert Number: ${msg.sid}`))
          .catch(err => console.error('[Twilio SMS Error - Victim Alert]:', err.message));

        // 4. Send SMS to user's saved emergency contacts
        const userRecord = db.users.find((u) => u.id === user.id);
        if (userRecord && userRecord.emergency_contacts && userRecord.emergency_contacts.length > 0) {
          userRecord.emergency_contacts.forEach((contact) => {
            twilioClient.messages.create({
              body: messageBody,
              from: twilioFromNumber,
              to: contact.phone,
            }).then(msg => console.log(`[Twilio] SMS sent to emergency contact ${contact.name} (${contact.phone}): ${msg.sid}`))
              .catch(err => console.error(`[Twilio SMS Error - ${contact.name}]:`, err.message));
          });
        }

        // 5. Trigger Phone Call to Top Emergency Number
        twilioClient.calls.create({
          twiml: `<Response><Say>Emergency SOS has been triggered by ${user.name}. Please check the SMS for location details. I repeat, Emergency SOS has been triggered.</Say></Response>`,
          to: topEmergencyNumber,
          from: twilioFromNumber
        }).then(call => console.log(`[Twilio] Call initiated to Emergency Contact: ${call.sid}`))
          .catch(err => console.error('[Twilio Call Error]:', err.message));
          
      } else {
        console.log('\n--- [MOCK TWILIO DISPATCH] ---');
        const victimLat = parseFloat(lat).toFixed(6);
        const victimLng = parseFloat(lng).toFixed(6);
        console.log(`[Mock SMS] Sent to Ambulance (${ambulanceNumber}): EMERGENCY SOS. Victim Location: https://www.google.com/maps?q=${victimLat},${victimLng}`);
        console.log(`[Mock SMS] Sent to Emergency Number (${topEmergencyNumber}): EMERGENCY SOS. Victim Location: https://www.google.com/maps?q=${victimLat},${victimLng}`);
        console.log(`[Mock SMS] Sent to Victim Alert Number (${victimAlertNumber}): EMERGENCY SOS. Victim Location: https://www.google.com/maps?q=${victimLat},${victimLng}`);
        const userRecord = db.users.find((u) => u.id === user.id);
        if (userRecord && userRecord.emergency_contacts && userRecord.emergency_contacts.length > 0) {
          userRecord.emergency_contacts.forEach((contact) => {
            console.log(`[Mock SMS] Sent to emergency contact ${contact.name} (${contact.phone}): EMERGENCY SOS. Victim Location: https://www.google.com/maps?q=${victimLat},${victimLng}`);
          });
        }
        console.log(`[Mock Call] Initiated to Emergency Number (${topEmergencyNumber}): "Emergency SOS has been triggered..."`);
        console.log('------------------------------\n');
      }
    } catch (error) {
      console.error('[Twilio Setup Error]:', error.message);
    }
    // -------------------------------------

    const driver = nearestAmb ? db.drivers.find((d) => d.id === nearestAmb.driver_id) : null;

    res.status(201).json({
      message: 'Emergency SOS activated',
      emergency: {
        ...emergency,
        ambulance: nearestAmb ? { ...nearestAmb, driver } : null,
        hospital: nearestHosp,
        timeline,
      },
    });
  });

  // POST /api/emergencies/details-sms
  // Sends a detailed SMS with injury/accident info collected from the app flow
  router.post('/details-sms', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const { lat, lng, role, injury_type, accident_type, is_conscious, details } = req.body;

    const victimLat = lat ? parseFloat(lat).toFixed(6) : 'Unknown';
    const victimLng = lng ? parseFloat(lng).toFixed(6) : 'Unknown';
    const mapsLink = lat && lng ? `https://www.google.com/maps?q=${victimLat},${victimLng}` : 'Location unavailable';

    // Build detailed message
    let detailsMsg = '';
    if (role === 'victim') {
      detailsMsg = `RAKSHA EMERGENCY DETAILS\n` +
        `Person: ${user.name}\n` +
        `Role: Victim (self-reporting)\n` +
        `Injury: ${injury_type || 'Not specified'}\n` +
        `Location: ${mapsLink}\n` +
        `Coordinates: ${victimLat}, ${victimLng}\n` +
        `Time: ${new Date().toLocaleString('en-IN')}\n` +
        `${details ? 'Notes: ' + details : ''}`;
    } else {
      detailsMsg = `RAKSHA EMERGENCY DETAILS\n` +
        `Reported by: ${user.name}\n` +
        `Role: Bystander\n` +
        `Accident Type: ${accident_type || 'Not specified'}\n` +
        `Patient Conscious: ${is_conscious === true ? 'Yes' : is_conscious === false ? 'No' : 'Unknown'}\n` +
        `Location: ${mapsLink}\n` +
        `Coordinates: ${victimLat}, ${victimLng}\n` +
        `Time: ${new Date().toLocaleString('en-IN')}\n` +
        `${details ? 'Notes: ' + details : ''}`;
    }

    const ambulanceNumber = '+918925137410';
    const topEmergencyNumber = '+918807905821';
    const victimAlertNumber = '+918438783710';

    // Get user's saved emergency contacts
    const userRecord = db.users.find((u) => u.id === user.id);
    const savedContacts = (userRecord?.emergency_contacts || []).map(c => c.phone);
    const allRecipients = [ambulanceNumber, topEmergencyNumber, victimAlertNumber, ...savedContacts];

    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

        allRecipients.forEach((to) => {
          twilioClient.messages.create({ body: detailsMsg, from: twilioFromNumber, to })
            .then(msg => console.log(`[Twilio] Details SMS sent to ${to}: ${msg.sid}`))
            .catch(err => console.error(`[Twilio Details SMS Error - ${to}]:`, err.message));
        });
      } else {
        console.log('\n--- [MOCK DETAILS SMS] ---');
        console.log(detailsMsg);
        console.log(`Recipients: ${allRecipients.join(', ')}`);
        console.log('-------------------------\n');
      }
    } catch (err) {
      console.error('[Details SMS Error]:', err.message);
    }

    res.json({ message: 'Details SMS sent', recipients: allRecipients.length });
  });


  router.get('/active', (req, res) => {
    const user = getUser(req);
    if (!user || !['system_admin', 'hospital_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const active = db.emergencies
      .filter((e) => !['resolved', 'cancelled'].includes(e.status))
      .map((e) => ({
        ...e,
        ambulance: db.ambulances.find((a) => a.id === e.ambulance_id),
        hospital: db.hospitals.find((h) => h.id === e.hospital_id),
        patient: (() => {
          const u = db.users.find((u) => u.id === e.user_id);
          if (!u) return null;
          const { password_hash: _, ...safe } = u;
          return safe;
        })(),
      }));
    res.json({ emergencies: active, count: active.length });
  });

  // GET /api/emergencies/user/history
  router.get('/user/history', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const history = db.emergencies
      .filter((e) => e.user_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((e) => ({
        ...e,
        ambulance: db.ambulances.find((a) => a.id === e.ambulance_id),
        hospital: db.hospitals.find((h) => h.id === e.hospital_id),
        timeline: db.emergencyTimeline.filter((t) => t.emergency_id === e.id),
      }));

    res.json({ history, count: history.length });
  });

  // GET /api/emergencies/:id
  router.get('/:id', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const emergency = db.emergencies.find((e) => e.id === req.params.id || e.emergency_id_code === req.params.id);
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });

    if (emergency.user_id !== user.id && !['system_admin', 'hospital_admin', 'driver'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const amb = db.ambulances.find((a) => a.id === emergency.ambulance_id);
    const driver = amb ? db.drivers.find((d) => d.id === amb.driver_id) : null;
    const hospital = db.hospitals.find((h) => h.id === emergency.hospital_id);
    const timeline = db.emergencyTimeline.filter((t) => t.emergency_id === emergency.id);

    res.json({
      emergency: {
        ...emergency,
        ambulance: amb ? { ...amb, driver } : null,
        hospital,
        timeline,
      },
    });
  });

  // PUT /api/emergencies/:id/status
  router.put('/:id/status', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const emergency = db.emergencies.find((e) => e.id === req.params.id);
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });

    const { status, message } = req.body;
    const validStatuses = ['searching', 'ambulance_assigned', 'en_route', 'arrived', 'patient_onboard', 'reached_hospital', 'resolved', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', valid: validStatuses });
    }

    emergency.status = status;
    if (status === 'resolved' || status === 'cancelled') {
      emergency.resolved_at = new Date();
      const amb = db.ambulances.find((a) => a.id === emergency.ambulance_id);
      if (amb) {
        amb.status = 'available';
        amb.current_emergency = null;
      }
    }

    db.emergencyTimeline.push({
      id: uuidv4(),
      emergency_id: emergency.id,
      status,
      message: message || `Status updated to ${status}`,
      timestamp: new Date(),
    });

    io.to(`user_${emergency.user_id}`).emit('emergency_status_update', {
      emergencyId: emergency.id,
      status,
      message,
      timeline: db.emergencyTimeline.filter((t) => t.emergency_id === emergency.id),
    });

    res.json({ message: 'Status updated', emergency });
  });

  // POST /api/emergencies/:id/chat
  router.post('/:id/chat', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const emergency = db.emergencies.find((e) => e.id === req.params.id);
    if (!emergency) return res.status(404).json({ error: 'Emergency not found' });

    const chatMsg = {
      id: uuidv4(),
      emergency_id: emergency.id,
      sender_id: user.id,
      sender_role: user.role,
      message: req.body.message,
      timestamp: new Date(),
    };
    db.chatMessages.push(chatMsg);

    io.to(`user_${emergency.user_id}`).emit('new_chat_message', chatMsg);
    io.to('admin_room').emit('new_chat_message', chatMsg);

    res.status(201).json({ message: 'Message sent', chat: chatMsg });
  });

  // GET /api/emergencies/:id/chat
  router.get('/:id/chat', (req, res) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const messages = db.chatMessages
      .filter((m) => m.emergency_id === req.params.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({ messages, count: messages.length });
  });

  return router;
};
