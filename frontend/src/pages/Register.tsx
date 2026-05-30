import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, Lock, Heart, Plus, Trash2, Shield, MapPin, Bell, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Colleague', 'Other'];

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [personal, setPersonal] = useState({
    name: '',
    age: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    emergency_pin: '',
  });

  const [medical, setMedical] = useState({
    blood_group: '',
    allergies: '',
    medical_conditions: '',
    insurance_provider: '',
    insurance_number: '',
  });

  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { name: '', phone: '', relationship: '' },
  ]);

  const [permissions, setPermissions] = useState({
    location: false,
    notifications: false,
    terms: false,
  });

  const steps = [
    { label: 'Personal', icon: User },
    { label: 'Medical', icon: Heart },
    { label: 'Contacts', icon: Phone },
    { label: 'Permissions', icon: Shield },
  ];

  const validateStep = () => {
    if (step === 1) {
      if (!personal.name || !personal.phone || !personal.password) {
        toast.error('Name, phone, and password are required');
        return false;
      }
      if (personal.password !== personal.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
      if (personal.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return false;
      }
    }
    if (step === 4 && !permissions.terms) {
      toast.error('Please accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const addContact = () => {
    if (contacts.length < 3) {
      setContacts([...contacts, { name: '', phone: '', relationship: '' }]);
    }
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  const requestLocationPermission = async () => {
    try {
      await navigator.geolocation.getCurrentPosition(() => {});
      setPermissions((p) => ({ ...p, location: true }));
      toast.success('Location permission granted');
    } catch {
      toast.error('Location permission denied');
    }
  };

  const handleSubmit = async () => {
    if (!permissions.terms) {
      toast.error('Please accept the terms');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.register({
        name: personal.name,
        phone: personal.phone,
        email: personal.email || undefined,
        password: personal.password,
        age: personal.age ? parseInt(personal.age) : undefined,
        blood_group: medical.blood_group || undefined,
        allergies: medical.allergies ? medical.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        medical_conditions: medical.medical_conditions ? medical.medical_conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
        emergency_contacts: contacts.filter((c) => c.name && c.phone),
        emergency_pin: personal.emergency_pin || undefined,
      });

      const { token, user } = response.data;
      login(token, user);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden emergency-grid-bg py-8">
      <div className="absolute inset-0 emergency-radial-bg" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold font-emergency tracking-widest gradient-text-red">RAKSHA</h1>
          <p className="text-gray-400 text-sm">Create your emergency profile</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6 px-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === i + 1;
            const isDone = step > i + 1;
            return (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone ? 'bg-green-600 border-green-600' :
                    isActive ? 'bg-red-600 border-red-600' :
                    'bg-transparent border-gray-600'
                  }`}>
                    {isDone ? <Check className="w-5 h-5 text-white" /> : <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />}
                  </div>
                  <span className={`text-xs ${isActive ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > i + 1 ? 'bg-green-600' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 shadow-glass-lg">
          <AnimatePresence mode="wait">
            {/* Step 1: Personal */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Full name *" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} className="input-dark pl-10" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Age" value={personal.age} onChange={(e) => setPersonal({ ...personal, age: e.target.value })} className="input-dark" min="1" max="120" />
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="tel" placeholder="Phone *" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} className="input-dark pl-10" required />
                  </div>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" placeholder="Email (optional)" value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} className="input-dark pl-10" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" placeholder="Password *" value={personal.password} onChange={(e) => setPersonal({ ...personal, password: e.target.value })} className="input-dark pl-10" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" placeholder="Confirm password *" value={personal.confirmPassword} onChange={(e) => setPersonal({ ...personal, confirmPassword: e.target.value })} className="input-dark pl-10" required />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Emergency PIN (for quick access)</label>
                  <input type="password" placeholder="4-6 digit PIN" value={personal.emergency_pin} onChange={(e) => setPersonal({ ...personal, emergency_pin: e.target.value })} className="input-dark tracking-widest text-center" maxLength={6} />
                </div>
              </motion.div>
            )}

            {/* Step 2: Medical */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Medical Information</h3>
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Blood Group</label>
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map((bg) => (
                      <button key={bg} type="button" onClick={() => setMedical({ ...medical, blood_group: bg })}
                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${medical.blood_group === bg ? 'bg-red-600 border-red-600 text-white' : 'border-gray-600 text-gray-400 hover:border-red-500'}`}>
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Allergies (comma separated)</label>
                  <input type="text" placeholder="e.g. Penicillin, Peanuts, Latex" value={medical.allergies} onChange={(e) => setMedical({ ...medical, allergies: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Medical Conditions (comma separated)</label>
                  <input type="text" placeholder="e.g. Diabetes, Hypertension, Asthma" value={medical.medical_conditions} onChange={(e) => setMedical({ ...medical, medical_conditions: e.target.value })} className="input-dark" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Insurance provider" value={medical.insurance_provider} onChange={(e) => setMedical({ ...medical, insurance_provider: e.target.value })} className="input-dark" />
                  <input type="text" placeholder="Policy number" value={medical.insurance_number} onChange={(e) => setMedical({ ...medical, insurance_number: e.target.value })} className="input-dark" />
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-xs text-blue-300">This information helps emergency responders provide better care. It's encrypted and secure.</p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Emergency Contacts */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Emergency Contacts</h3>
                {contacts.map((contact, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Contact {index + 1}</span>
                      {contacts.length > 1 && (
                        <button type="button" onClick={() => removeContact(index)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <input type="text" placeholder="Full name" value={contact.name} onChange={(e) => updateContact(index, 'name', e.target.value)} className="input-dark" />
                    <input type="tel" placeholder="Phone number" value={contact.phone} onChange={(e) => updateContact(index, 'phone', e.target.value)} className="input-dark" />
                    <select value={contact.relationship} onChange={(e) => updateContact(index, 'relationship', e.target.value)} className="input-dark bg-transparent">
                      <option value="">Relationship</option>
                      {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                ))}
                {contacts.length < 3 && (
                  <button type="button" onClick={addContact} className="w-full py-3 border border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-red-500 hover:text-red-400 flex items-center justify-center gap-2 transition-all">
                    <Plus className="w-4 h-4" />
                    Add another contact
                  </button>
                )}
              </motion.div>
            )}

            {/* Step 4: Permissions */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Permissions & Setup</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Location Access</p>
                        <p className="text-xs text-gray-400">Required for emergency dispatch</p>
                      </div>
                    </div>
                    <button type="button" onClick={requestLocationPermission}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${permissions.location ? 'bg-green-600 text-white' : 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'}`}>
                      {permissions.location ? '✓ Granted' : 'Allow'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Notifications</p>
                        <p className="text-xs text-gray-400">Emergency alerts and updates</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setPermissions((p) => ({ ...p, notifications: !p.notifications }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${permissions.notifications ? 'bg-green-600 text-white' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30'}`}>
                      {permissions.notifications ? '✓ Enabled' : 'Enable'}
                    </button>
                  </div>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={permissions.terms} onChange={(e) => setPermissions((p) => ({ ...p, terms: e.target.checked }))} className="mt-1 w-4 h-4 accent-red-600" />
                  <span className="text-xs text-gray-400">
                    I agree to the <span className="text-red-400">Terms of Service</span> and <span className="text-red-400">Privacy Policy</span>. I understand that RAKSHA will use my location and medical data to provide emergency services.
                  </span>
                </label>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-xl hover:border-gray-400 flex items-center justify-center gap-2 transition-all">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={handleNext} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emergency">
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <motion.button type="button" onClick={handleSubmit} disabled={isLoading} whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-emergency">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Shield className="w-4 h-4" />Create Account</>}
              </motion.button>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-red-400 hover:text-red-300 font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
