import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Utensils, Lock, Eye, EyeOff, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const AdminLogin = () => {
  const { loginAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginAdmin(formData.email, formData.password);
      toast.success('Admin authenticated successfully');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#080d1a] min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* Decorative orbs */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-[#fa6500]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-[#fa6500]/4 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Login card */}
      <motion.div
        className="relative w-full max-w-[440px] bg-[#0f1629] border border-[#1e2d47] rounded-3xl p-10 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* Logo + wordmark */}
        <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-[#fa6500] rounded-2xl flex items-center justify-center mb-4 shadow-[0_8px_24px_rgba(250,101,0,0.35)]">
            <Utensils size={26} className="text-white" />
          </div>
          <span className="text-xs font-bold tracking-[0.25em] text-[#fa6500] uppercase mb-3">
            RestroNet Admin
          </span>
          <h1 className="text-[1.75rem] font-extrabold text-slate-100 tracking-tight leading-tight mb-2">
            Admin Sign In
          </h1>
          <p className="text-sm text-[#8b98b0]">
            Restricted access — authorized personnel only
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          variants={itemVariants}
          className="h-px bg-gradient-to-r from-transparent via-[#1e2d47] to-transparent mb-7"
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="text-[#8b98b0] text-sm font-medium block">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5a78] pointer-events-none"
              />
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@restronet.com"
                autoComplete="email"
                required
                className="bg-[#131e35] border border-[#1e2d47] text-slate-100 placeholder-[#4a5a78] rounded-xl pl-11 pr-4 py-3 w-full focus:outline-none focus:border-[#fa6500] focus:ring-2 focus:ring-[#fa6500]/15 transition-all text-sm"
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants} className="space-y-1.5">
            <label className="text-[#8b98b0] text-sm font-medium block">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4a5a78] pointer-events-none"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="bg-[#131e35] border border-[#1e2d47] text-slate-100 placeholder-[#4a5a78] rounded-xl pl-11 pr-11 py-3 w-full focus:outline-none focus:border-[#fa6500] focus:ring-2 focus:ring-[#fa6500]/15 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#4a5a78] hover:text-[#8b98b0] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </motion.div>

          {/* Submit button */}
          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-[#fa6500] hover:bg-[#e05800] text-white font-semibold py-3 rounded-xl w-full transition-all shadow-[0_8px_24px_rgba(250,101,0,0.22)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm"
            >
              {loading ? (
                <>
                  <div className="border-2 border-white/30 border-t-white rounded-full w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.div
          variants={itemVariants}
          className="mt-8 pt-6 border-t border-[#1e2d47] flex items-center justify-between"
        >
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#8b98b0] hover:text-slate-100 transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
            Back to RestroNet
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#4a5a78]">
            <ShieldCheck size={12} />
            Secured connection
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default AdminLogin;
