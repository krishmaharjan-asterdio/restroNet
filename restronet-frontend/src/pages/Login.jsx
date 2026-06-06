import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Utensils, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Login = () => {
  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(formData.email, formData.password);
      toast.success('Welcome back to RestroNet!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left cinematic panel (desktop only) ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[60%] relative flex-col items-center justify-center overflow-hidden bg-gray-950">
        {/* Animated food photo */}
        <motion.div
          initial={{ scale: 1.08, opacity: 0.45 }}
          animate={{ scale: 1, opacity: 0.6 }}
          transition={{ duration: 14, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1400&q=85')",
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/75 to-primary/20" />

        {/* Decorative orbs */}
        <div className="absolute top-16 right-16 w-40 h-40 bg-primary/25 blur-[90px] rounded-full animate-breathe" />
        <div className="absolute bottom-24 left-16 w-56 h-56 bg-primary/12 blur-[110px] rounded-full animate-pulse-soft" />
        <div className="absolute top-1/2 right-8 w-24 h-24 bg-orange-400/15 blur-[60px] rounded-full animate-float" />

        {/* Brand content */}
        <div className="relative z-10 text-left px-16 max-w-2xl w-full">

          {/* Logo lockup */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 mb-16"
          >
            <div
              className="p-3 rounded-xl bg-primary text-white"
              style={{ boxShadow: '0 16px 40px rgba(250,101,0,0.4)' }}
            >
              <Utensils size={22} strokeWidth={2.2} />
            </div>
            <span
              className="text-[1.6rem] font-bold text-white tracking-tight leading-none"
              style={{ letterSpacing: '-0.02em' }}
            >
              RESTRO<span className="text-primary">NET</span>
            </span>
          </motion.div>

          {/* Editorial number */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 'clamp(5rem, 9vw, 8rem)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.05)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              display: 'block',
              marginBottom: '-0.5rem',
              userSelect: 'none',
            }}
          >
            01
          </motion.span>

          {/* Serif headline */}
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-white font-medium mb-7"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 'clamp(2.8rem, 4vw, 4.2rem)',
              lineHeight: 1.06,
              letterSpacing: '-0.01em',
              fontStyle: 'italic',
            }}
          >
            Kathmandu's<br />Finest Tables.
          </motion.h2>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-white/50 text-base leading-relaxed font-light max-w-sm"
          >
            Experience the art of discovery. Sign in to access your curated
            collection and personalised recommendations.
          </motion.p>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.5 }}
            className="mt-12 h-px w-24"
            style={{ background: 'linear-gradient(90deg, rgba(250,101,0,0.7), transparent)', transformOrigin: 'left' }}
          />
        </div>

        {/* Bottom caption */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="absolute bottom-10 left-0 right-0 flex justify-center"
        >
          <p className="text-white/30 text-xs font-semibold tracking-[0.2em] uppercase">
            Premium Restaurant Discovery
          </p>
        </motion.div>
      </div>

      {/* ── Right form panel ───────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center px-6 sm:px-10 py-16 bg-background relative overflow-hidden">
        {/* Subtle mesh background */}
        <div className="absolute inset-0 bg-mesh-light dark:bg-mesh-dark pointer-events-none" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile Logo — hidden on desktop */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-14 lg:hidden"
          >
            <div
              className="p-3 rounded-2xl bg-primary text-white"
              style={{ boxShadow: '0 12px 28px rgba(250,101,0,0.28)' }}
            >
              <Utensils size={24} strokeWidth={2.2} />
            </div>
            <span
              className="text-[1.75rem] font-bold text-foreground tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              RESTRO<span className="text-primary">NET</span>
            </span>
          </motion.div>

          {/* Heading block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 text-center lg:text-left"
          >
            <h2
              className="text-[2.4rem] font-medium text-foreground mb-2 leading-tight"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              Welcome Back
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              Continue your culinary journey
            </p>
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="card p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Email address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Mail size={17} />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="input-field pl-11 pr-4"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-primary text-xs font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Lock size={17} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input-field pl-11 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Footer link */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 text-muted-foreground font-medium text-sm"
          >
            New to RestroNet?{' '}
            <Link
              to="/register"
              className="text-primary font-semibold hover:underline underline-offset-2 ml-1"
            >
              Create an account
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default Login;
