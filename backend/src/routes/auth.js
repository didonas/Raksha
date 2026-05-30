const express = require('express');

module.exports = function (db, jwt, bcrypt, uuidv4, JWT_SECRET) {
  const router = express.Router();

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    try {
      const { name, email, phone, password, age, blood_group, allergies, medical_conditions, emergency_contacts } = req.body;

      if (!name || !phone || !password) {
        return res.status(400).json({ error: 'Name, phone, and password are required' });
      }

      const existingUser = db.users.find((u) => u.phone === phone || (email && u.email === email));
      if (existingUser) {
        return res.status(409).json({ error: 'User with this phone or email already exists' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      const userId = uuidv4();

      const newUser = {
        id: userId,
        name,
        email: email || null,
        phone,
        password_hash,
        role: 'user',
        blood_group: blood_group || null,
        allergies: allergies || [],
        medical_conditions: medical_conditions || [],
        age: age || null,
        address: req.body.address || null,
        lat: null,
        lng: null,
        emergency_pin: req.body.emergency_pin || null,
        emergency_contacts: emergency_contacts || [],
        insurance_provider: req.body.insurance_provider || null,
        insurance_number: req.body.insurance_number || null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      db.users.push(newUser);

      const token = jwt.sign(
        { id: userId, name, phone, email, role: 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password_hash: _, ...userWithoutPassword } = newUser;

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: userWithoutPassword,
      });
    } catch (err) {
      console.error('[Auth] Register error:', err);
      res.status(500).json({ error: 'Registration failed', message: err.message });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { phone, email, password, emergency_pin } = req.body;

      const user = db.users.find((u) =>
        (phone && u.phone === phone) || (email && u.email === email)
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Emergency PIN login
      if (emergency_pin) {
        if (user.emergency_pin !== emergency_pin) {
          return res.status(401).json({ error: 'Invalid emergency PIN' });
        }
      } else {
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      user.last_login = new Date();

      const token = jwt.sign(
        { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password_hash: _, ...userWithoutPassword } = user;

      res.json({
        message: 'Login successful',
        token,
        user: userWithoutPassword,
      });
    } catch (err) {
      console.error('[Auth] Login error:', err);
      res.status(500).json({ error: 'Login failed', message: err.message });
    }
  });

  // ─── Helper: get authenticated user ────────────────────────────────────────
  function getAuthUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    try { return jwt.verify(authHeader.split(' ')[1], JWT_SECRET); }
    catch { return null; }
  }

  // ─── Helper: normalize Indian phone to E.164 ────────────────────────────────
  function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    if (digits.startsWith('+')) return phone.replace(/\s/g, '');
    return `+${digits}`;
  }

  // POST /api/auth/emergency-contact/add — save directly without OTP
  router.post('/emergency-contact/add', (req, res) => {
    const decoded = getAuthUser(req);
    if (!decoded) return res.status(401).json({ error: 'Not authenticated' });

    const { phone, name, relationship } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'Name and phone are required' });

    const userIndex = db.users.findIndex((u) => u.id === decoded.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    const user = db.users[userIndex];
    if (!user.emergency_contacts) user.emergency_contacts = [];
    if (user.emergency_contacts.length >= 5) return res.status(400).json({ error: 'Maximum 5 emergency contacts allowed' });

    const exists = user.emergency_contacts.find((c) => c.phone === phone);
    if (exists) return res.status(409).json({ error: 'This number is already added' });

    user.emergency_contacts.push({ name, phone, relationship: relationship || '', verified: false });
    user.updated_at = new Date();

    const { password_hash: _, ...userWithoutPassword } = user;
    res.json({ message: 'Emergency contact added', user: userWithoutPassword });
  });

  // POST /api/auth/emergency-contact/send-otp
  router.post('/emergency-contact/send-otp', async (req, res) => {
    const decoded = getAuthUser(req);
    if (!decoded) return res.status(401).json({ error: 'Not authenticated' });

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const normalized = normalizePhone(phone);
    // Validate Indian number
    if (!/^\+91[6-9]\d{9}$/.test(normalized)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    }

    const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!VERIFY_SID || VERIFY_SID === 'your_verify_service_sid') {
      // Dev fallback — store mock OTP
      if (!db.mockOTPs) db.mockOTPs = {};
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      db.mockOTPs[`${decoded.id}_${normalized}`] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
      console.log(`[Mock OTP] ${normalized} → ${otp}`);
      return res.json({ message: 'OTP sent', dev_otp: otp });
    }

    try {
      const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilioClient.verify.v2.services(VERIFY_SID).verifications.create({
        to: normalized,
        channel: 'sms',
      });
      res.json({ message: 'OTP sent successfully' });
    } catch (err) {
      console.error('[Twilio Verify Send Error]:', err.message);
      res.status(500).json({ error: 'Failed to send OTP. ' + err.message });
    }
  });

  // POST /api/auth/emergency-contact/verify-otp
  router.post('/emergency-contact/verify-otp', async (req, res) => {
    const decoded = getAuthUser(req);
    if (!decoded) return res.status(401).json({ error: 'Not authenticated' });

    const { phone, otp, name, relationship } = req.body;
    if (!phone || !otp || !name) return res.status(400).json({ error: 'Phone, OTP and name are required' });

    const normalized = normalizePhone(phone);
    const VERIFY_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

    // Dev fallback
    if (!VERIFY_SID || VERIFY_SID === 'your_verify_service_sid') {
      if (!db.mockOTPs) db.mockOTPs = {};
      const record = db.mockOTPs[`${decoded.id}_${normalized}`];
      if (!record) return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
      if (Date.now() > record.expiresAt) {
        delete db.mockOTPs[`${decoded.id}_${normalized}`];
        return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
      }
      if (record.otp !== otp) return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
      delete db.mockOTPs[`${decoded.id}_${normalized}`];
    } else {
      try {
        const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const check = await twilioClient.verify.v2.services(VERIFY_SID).verificationChecks.create({
          to: normalized,
          code: otp,
        });
        if (check.status !== 'approved') {
          return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }
      } catch (err) {
        console.error('[Twilio Verify Check Error]:', err.message);
        if (err.code === 20404) return res.status(400).json({ error: 'OTP expired or already used. Please request a new one.' });
        return res.status(400).json({ error: 'OTP verification failed. ' + err.message });
      }
    }

    // Save verified contact
    const userIndex = db.users.findIndex((u) => u.id === decoded.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    const user = db.users[userIndex];
    if (!user.emergency_contacts) user.emergency_contacts = [];
    if (user.emergency_contacts.length >= 5) return res.status(400).json({ error: 'Maximum 5 emergency contacts allowed' });

    const exists = user.emergency_contacts.find((c) => c.phone === normalized);
    if (exists) {
      exists.verified = true;
      exists.name = name;
      exists.relationship = relationship || exists.relationship;
    } else {
      user.emergency_contacts.push({ name, phone: normalized, relationship: relationship || '', verified: true });
    }
    user.updated_at = new Date();

    const { password_hash: _, ...userWithoutPassword } = user;
    res.json({ message: 'Emergency contact verified and saved', user: userWithoutPassword });
  });

  // DELETE /api/auth/emergency-contact/remove
  router.delete('/emergency-contact/remove', (req, res) => {
    const decoded = getAuthUser(req);
    if (!decoded) return res.status(401).json({ error: 'Not authenticated' });

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    const userIndex = db.users.findIndex((u) => u.id === decoded.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

    const user = db.users[userIndex];
    user.emergency_contacts = (user.emergency_contacts || []).filter((c) => c.phone !== phone);
    user.updated_at = new Date();

    const { password_hash: _, ...userWithoutPassword } = user;
    res.json({ message: 'Emergency contact removed', user: userWithoutPassword });
  });

  // POST /api/auth/verify-otp
  router.post('/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    // Simulated OTP verification (in production, use SMS service)
    if (otp === '123456') {
      const user = db.users.find((u) => u.phone === phone);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const token = jwt.sign(
        { id: user.id, name: user.name, phone: user.phone, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ message: 'OTP verified', token });
    }
    res.status(400).json({ error: 'Invalid OTP' });
  });

  // POST /api/auth/forgot-password
  router.post('/forgot-password', (req, res) => {
    const { phone, email } = req.body;
    const user = db.users.find((u) =>
      (phone && u.phone === phone) || (email && u.email === email)
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    // In production: send SMS/email with reset token
    res.json({ message: 'Password reset OTP sent to your registered phone number', otp_hint: '123456 (demo)' });
  });

  // POST /api/auth/reset-password
  router.post('/reset-password', async (req, res) => {
    const { phone, otp, new_password } = req.body;
    if (otp !== '123456') return res.status(400).json({ error: 'Invalid OTP' });
    const user = db.users.find((u) => u.phone === phone);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password_hash = await bcrypt.hash(new_password, 12);
    res.json({ message: 'Password reset successful' });
  });

  // GET /api/auth/profile
  router.get('/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.users.find((u) => u.id === decoded.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const { password_hash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // PUT /api/auth/profile
  router.put('/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Not authenticated' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userIndex = db.users.findIndex((u) => u.id === decoded.id);
      if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

      const allowedFields = ['name', 'email', 'age', 'address', 'blood_group', 'allergies', 'medical_conditions', 'emergency_contacts', 'insurance_provider', 'insurance_number', 'emergency_pin', 'lat', 'lng'];
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          db.users[userIndex][field] = req.body[field];
        }
      });
      db.users[userIndex].updated_at = new Date();

      const { password_hash: _, ...userWithoutPassword } = db.users[userIndex];
      res.json({ message: 'Profile updated', user: userWithoutPassword });
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
};
