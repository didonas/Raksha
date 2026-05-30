import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Edit2, Save, X, LogOut, User, Phone, Mail, Heart, Shield, MapPin, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import BottomNav from '../components/BottomNav';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ecOpen, setEcOpen] = useState(false);
  const [ecForm, setEcForm] = useState({ name: '', phone: '', relationship: '' });
  const [ecSaving, setEcSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    age: user?.age?.toString() || '',
    address: user?.address || '',
    blood_group: user?.blood_group || '',
    allergies: user?.allergies?.join(', ') || '',
    medical_conditions: user?.medical_conditions?.join(', ') || '',
    insurance_provider: user?.insurance_provider || '',
    insurance_number: user?.insurance_number || '',
    emergency_pin: user?.emergency_pin || '',
    emergency_contacts: user?.emergency_contacts || [],
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await authAPI.updateProfile({
        name: form.name,
        email: form.email || undefined,
        age: form.age ? parseInt(form.age) : undefined,
        address: form.address,
        blood_group: form.blood_group,
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        medical_conditions: form.medical_conditions.split(',').map((s) => s.trim()).filter(Boolean),
        insurance_provider: form.insurance_provider,
        insurance_number: form.insurance_number,
        emergency_pin: form.emergency_pin,
        emergency_contacts: form.emergency_contacts,
      });
      updateProfile(response.data.user);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleAddContact = async () => {
    const digits = ecForm.phone.replace(/\D/g, '');
    if (digits.length < 10) { toast.error('Enter a valid 10-digit mobile number'); return; }
    if (!ecForm.name.trim()) { toast.error('Enter contact name'); return; }
    setEcSaving(true);
    try {
      const res = await authAPI.addEmergencyContact({
        name: ecForm.name.trim(),
        phone: digits.length === 10 ? `+91${digits}` : `+${digits}`,
        relationship: ecForm.relationship.trim(),
      });
      updateProfile(res.data.user);
      toast.success(`${ecForm.name} added — SOS SMS will be sent to this number`);
      setEcOpen(false);
      setEcForm({ name: '', phone: '', relationship: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add contact');
    } finally { setEcSaving(false); }
  };

  const removeAlertContact = async (phone: string) => {
    try {
      const res = await authAPI.removeEmergencyContact(phone);
      updateProfile(res.data.user);
      toast.success('Contact removed');
    } catch { toast.error('Failed to remove contact'); }
  };

  const addContact = () => {
    setForm({ ...form, emergency_contacts: [...form.emergency_contacts, { name: '', phone: '', relationship: '' }] });
  };

  const removeContact = (index: number) => {
    setForm({ ...form, emergency_contacts: form.emergency_contacts.filter((_, i) => i !== index) });
  };

  const updateContact = (index: number, field: string, value: string) => {
    const updated = [...form.emergency_contacts];
    (updated[index] as any)[field] = value;
    setForm({ ...form, emergency_contacts: updated });
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-full glass flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-white">My Profile</h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                <X className="w-5 h-5 text-gray-300" />
              </button>
              <button onClick={handleSave} disabled={isSaving} className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5 text-white" />}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-gray-300" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto pb-24 space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-3xl font-bold text-white mb-3">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h2 className="text-xl font-bold text-white">{user?.name}</h2>
          <span className={`mt-1 px-3 py-1 rounded-full text-xs font-medium ${
            user?.role === 'system_admin' ? 'bg-purple-600/20 text-purple-400' :
            user?.role === 'driver' ? 'bg-blue-600/20 text-blue-400' :
            'bg-green-600/20 text-green-400'
          }`}>
            {user?.role?.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Personal Info */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-white">Personal Information</h3>
          </div>
          <div className="space-y-3">
            {isEditing ? (
              <>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-dark" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Age</label>
                    <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="input-dark" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Phone</label>
                    <input value={user?.phone || ''} disabled className="input-dark opacity-50 cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dark" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-dark" />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {[
                  { icon: User, label: 'Name', value: user?.name },
                  { icon: Phone, label: 'Phone', value: user?.phone },
                  { icon: Mail, label: 'Email', value: user?.email || 'Not set' },
                  { icon: MapPin, label: 'Address', value: user?.address || 'Not set' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="text-sm text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Medical Info */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-white">Medical Information</h3>
          </div>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Blood Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button key={bg} type="button" onClick={() => setForm({ ...form, blood_group: bg })}
                      className={`py-2 rounded-lg text-sm font-medium border transition-all ${form.blood_group === bg ? 'bg-red-600 border-red-600 text-white' : 'border-gray-600 text-gray-400'}`}>
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Allergies</label>
                <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Comma separated" className="input-dark" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Medical Conditions</label>
                <input value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} placeholder="Comma separated" className="input-dark" />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 py-2 border-b border-white/5">
                <span className="text-2xl">🩸</span>
                <div>
                  <p className="text-xs text-gray-500">Blood Group</p>
                  <p className="text-sm font-bold text-red-400">{user?.blood_group || 'Not set'}</p>
                </div>
              </div>
              <div className="py-2 border-b border-white/5">
                <p className="text-xs text-gray-500 mb-1">Allergies</p>
                <div className="flex flex-wrap gap-1">
                  {user?.allergies?.length ? user.allergies.map((a) => (
                    <span key={a} className="px-2 py-0.5 bg-orange-600/20 text-orange-400 rounded-full text-xs">{a}</span>
                  )) : <p className="text-sm text-gray-400">None</p>}
                </div>
              </div>
              <div className="py-2">
                <p className="text-xs text-gray-500 mb-1">Medical Conditions</p>
                <div className="flex flex-wrap gap-1">
                  {user?.medical_conditions?.length ? user.medical_conditions.map((c) => (
                    <span key={c} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full text-xs">{c}</span>
                  )) : <p className="text-sm text-gray-400">None</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Emergency Contacts */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-400" />
              <h3 className="font-semibold text-white">Emergency Contacts</h3>
            </div>
            {isEditing && form.emergency_contacts.length < 3 && (
              <button onClick={addContact} className="text-xs text-red-400 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-3">
              {form.emergency_contacts.map((contact: any, i: number) => (
                <div key={i} className="p-3 bg-white/5 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Contact {i + 1}</span>
                    <button onClick={() => removeContact(i)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <input value={contact.name} onChange={(e) => updateContact(i, 'name', e.target.value)} placeholder="Name" className="input-dark text-sm py-2" />
                  <input value={contact.phone} onChange={(e) => updateContact(i, 'phone', e.target.value)} placeholder="Phone" className="input-dark text-sm py-2" />
                  <input value={contact.relationship} onChange={(e) => updateContact(i, 'relationship', e.target.value)} placeholder="Relationship" className="input-dark text-sm py-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {user?.emergency_contacts?.length ? user.emergency_contacts.map((contact: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{contact.name}</p>
                    <p className="text-xs text-gray-400">{contact.relationship} • {contact.phone}</p>
                  </div>
                  <a href={`tel:${contact.phone}`} className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-green-400" />
                  </a>
                </div>
              )) : <p className="text-sm text-gray-400">No emergency contacts added</p>}
            </div>
          )}
        </div>

        {/* Emergency PIN */}
        {isEditing && (
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-red-400" />
              <h3 className="font-semibold text-white">Emergency PIN</h3>
            </div>
            <input
              type="password"
              value={form.emergency_pin}
              onChange={(e) => setForm({ ...form, emergency_pin: e.target.value })}
              placeholder="4-6 digit PIN for quick access"
              maxLength={6}
              className="input-dark tracking-widest text-center text-xl"
            />
          </div>
        )}

        {/* Emergency Alert Numbers */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-red-400" />
              <h3 className="font-semibold text-white">Emergency Alert Numbers</h3>
            </div>
            {!ecOpen && (user?.emergency_contacts?.length || 0) < 5 && (
              <button onClick={() => setEcOpen(true)} className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300 transition">
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            These numbers receive an SMS with your location when SOS is triggered. Add the number and verify it in your Twilio console.
          </p>

          {/* Saved contacts */}
          <div className="space-y-2 mb-3">
            {!(user?.emergency_contacts?.length) && !ecOpen && (
              <p className="text-sm text-gray-500 text-center py-3">No emergency numbers added yet</p>
            )}
            {(user?.emergency_contacts || []).map((contact: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{contact.name}</p>
                    <p className="text-xs text-gray-400">{contact.phone}{contact.relationship ? ` • ${contact.relationship}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => removeAlertContact(contact.phone)} className="text-red-400 hover:text-red-300 p-1 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add form */}
          <AnimatePresence>
            {ecOpen && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">New Emergency Contact</p>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Contact Name *</label>
                  <input value={ecForm.name} onChange={(e) => setEcForm({ ...ecForm, name: e.target.value })}
                    placeholder="e.g. Mom, Brother" className="input-dark" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Mobile Number * (Indian)</label>
                  <div className="flex items-center input-dark gap-2 px-3">
                    <span className="text-gray-400 text-sm font-medium flex-shrink-0">+91</span>
                    <input
                      value={ecForm.phone}
                      onChange={(e) => setEcForm({ ...ecForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="98765 43210"
                      type="tel"
                      maxLength={10}
                      className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm py-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Relationship (optional)</label>
                  <input value={ecForm.relationship} onChange={(e) => setEcForm({ ...ecForm, relationship: e.target.value })}
                    placeholder="e.g. Mother, Friend" className="input-dark" />
                </div>
                <p className="text-xs text-yellow-400/80">
                  ⚠️ Make sure this number is verified in your Twilio console to receive SMS.
                </p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setEcOpen(false); setEcForm({ name: '', phone: '', relationship: '' }); }}
                    className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm font-medium hover:bg-white/5 transition">
                    Cancel
                  </button>
                  <button onClick={handleAddContact} disabled={ecSaving}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-60">
                    {ecSaving
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : 'Save Number'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3 border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center gap-2 hover:bg-red-600/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  );
}
