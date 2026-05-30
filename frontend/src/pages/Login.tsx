import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, Lock, Eye, EyeOff, Shield, AlertTriangle, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

type LoginMode = 'password' | 'pin' | 'otp';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [mode, setMode] = useState<LoginMode>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [form, setForm] = useState({
    phone: '',
    email: '',
    password: '',
    emergency_pin: '',
    otp: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;

      if (mode === 'otp') {
        if (!otpSent) {
          // Send OTP
          await authAPI.forgotPassword({ phone: form.phone });
          setOtpSent(true);
          toast.success('OTP sent to your phone (use 123456 for demo)');
          setIsLoading(false);
          return;
        }
        response = await authAPI.verifyOTP({ phone: form.phone, otp: form.otp });
      } else if (mode === 'pin') {
        response = await authAPI.login({ phone: form.phone, emergency_pin: form.emergency_pin });
      } else {
        response = await authAPI.login({
          phone: form.phone || undefined,
          email: form.email || undefined,
          password: form.password,
        });
      }

      const { token, user } = response.data;
      login(token, user);
      toast.success(`Welcome back, ${user.name}!`);

      // Role-based redirect
      if (user.role === 'system_admin') navigate('/admin');
      else if (user.role === 'hospital_admin') navigate('/hospital-admin');
      else if (user.role === 'driver') navigate('/driver');
      else navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden emergency-grid-bg">
      {/* Background effects */}
      <div className="absolute inset-0 emergency-radial-bg" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500/50 mb-4"
          >
            <Shield className="w-10 h-10 text-red-400" />
          </motion.div>
          <h1 className="text-4xl font-bold font-emergency tracking-widest gradient-text-red">
            RAKSHA
          </h1>
          <p className="text-gray-400 text-sm mt-1">Emergency Response Platform</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-glass-lg">
          <h2 className="text-xl font-semibold text-white mb-6">Sign In</h2>

          {/* Mode Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
            {(['password', 'pin', 'otp'] as LoginMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setOtpSent(false); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                  mode === m
                    ? 'bg-red-600 text-white shadow-emergency'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'password' ? 'Password' : m === 'pin' ? 'Emergency PIN' : 'OTP'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone / Email */}
            {mode === 'password' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={handleChange}
                    className="input-dark pl-10"
                  />
                </div>
                <div className="text-center text-xs text-gray-500">— or —</div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={handleChange}
                    className="input-dark pl-10"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="input-dark pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : mode === 'pin' ? (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="input-dark pl-10"
                  />
                </div>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    name="emergency_pin"
                    placeholder="Emergency PIN (4-6 digits)"
                    value={form.emergency_pin}
                    onChange={handleChange}
                    maxLength={6}
                    required
                    className="input-dark pl-10 tracking-widest text-center text-xl"
                  />
                </div>
                <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <p className="text-xs text-orange-300">Emergency PIN provides quick access during emergencies</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="input-dark pl-10"
                  />
                </div>
                <AnimatePresence>
                  {otpSent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <input
                        type="text"
                        name="otp"
                        placeholder="Enter OTP"
                        value={form.otp}
                        onChange={handleChange}
                        maxLength={6}
                        required
                        className="input-dark tracking-widest text-center text-xl"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Forgot Password */}
            {mode === 'password' && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-red-400 hover:text-red-300">
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white font-semibold rounded-xl transition-all shadow-emergency flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {mode === 'otp' && !otpSent ? 'Send OTP' : 'Sign In'}
                </>
              )}
            </motion.button>
          </form>

          {/* Demo credentials */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-300 font-medium mb-1">Demo Credentials:</p>
            <p className="text-xs text-gray-400">Admin: admin@raksha.in / admin123</p>
            <p className="text-xs text-gray-400">Driver: 9876543210 / driver123</p>
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            New to RAKSHA?{' '}
            <Link to="/register" className="text-red-400 hover:text-red-300 font-medium">
              Create account
            </Link>
          </p>
        </div>

        {/* Emergency call */}
        <div className="text-center mt-6">
          <a
            href="tel:108"
            className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium"
          >
            <Phone className="w-4 h-4" />
            Emergency? Call 108 directly
          </a>
        </div>
      </motion.div>
    </div>
  );
}
