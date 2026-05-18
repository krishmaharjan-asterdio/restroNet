import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Utensils, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';

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
    <div
      className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(250,101,0,0.08) 0%, transparent 70%)`,
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)] animate-fade-in-up">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center mb-5">
            <Utensils size={26} className="text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none mb-1">
            RESTRO<span className="text-primary">ADMIN</span>
          </h1>
          <div className="flex items-center gap-1.5 mt-2.5">
            <Lock size={12} className="text-[#64748b]" />
            <p className="text-[#64748b] text-sm font-medium">Administrative Access</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#334155] to-transparent mb-7" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[#94a3b8] text-sm font-medium block">
              Admin Email
            </label>
            <input
              // type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@restronet.com"
              autoComplete="email"
              required
              className="bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 text-white placeholder-[#475569] focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all w-full text-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[#94a3b8] text-sm font-medium block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="bg-[#0f172a] border border-[#334155] rounded-xl px-4 py-3 pr-11 text-white placeholder-[#475569] focus:border-primary/60 focus:ring-2 focus:ring-primary/20 outline-none transition-all w-full text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#475569] hover:text-[#94a3b8] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl w-full transition-all shadow-primary disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-1 text-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating…
              </>
            ) : (
              'Sign In to Admin Panel'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 pt-5 border-t border-[#1e293b] flex items-center justify-center">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94a3b8] transition-colors group"
          >
            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
