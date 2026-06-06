import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Utensils,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const Register = () => {
  const { registerUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState({ cuisines: [], tags: [], priceRange: 2 });
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ cuisines: [], tags: [] });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        api.get('/metadata/cuisines'),
        api.get('/metadata/tags'),
      ]);
      setMeta({ cuisines: cRes.data.cuisines, tags: tRes.data.tags });
    } catch (err) {
      console.error('Failed to load metadata');
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleCuisine = (id) => {
    setPreferences((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(id)
        ? prev.cuisines.filter((c) => c !== id)
        : [...prev.cuisines, id],
    }));
  };

  const toggleTag = (id) => {
    setPreferences((prev) => ({
      ...prev,
      tags: prev.tags.includes(id)
        ? prev.tags.filter((t) => t !== id)
        : [...prev.tags, id],
    }));
  };

  const nextStep = (e) => {
    e.preventDefault();
    if (step === 1 && (!formData.name || !formData.email)) {
      return toast.error('Please fill in your name and email');
    }
    if (step === 1 && !/\S+@\S+\.\S+/.test(formData.email)) {
      return toast.error('Please enter a valid email address');
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmitAccount = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords don't match");
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      await registerUser(formData.name, formData.email, formData.password);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      await api.put('/auth/profile', { preferences });
      toast.success('Preferences saved!');
      setStep(4);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      toast.error('Failed to save preferences');
      setStep(4);
      setTimeout(() => navigate('/'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: 36 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, x: -36, transition: { duration: 0.25 } },
  };

  /* Steps that count toward the progress bar (1–3 are real steps) */
  const TOTAL_STEPS = 3;

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left cinematic panel (desktop only) ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[60%] relative flex-col items-center justify-center overflow-hidden bg-gray-950">
        {/* Animated photo */}
        <motion.div
          initial={{ scale: 1.08, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 0.58 }}
          transition={{ duration: 14, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=85')",
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/75 to-primary/20" />

        {/* Decorative orbs */}
        <div className="absolute top-16 right-16 w-40 h-40 bg-primary/25 blur-[90px] rounded-full animate-breathe" />
        <div className="absolute bottom-24 left-16 w-56 h-56 bg-primary/12 blur-[110px] rounded-full animate-pulse-soft" />
        <div className="absolute top-1/2 left-1/3 w-28 h-28 bg-orange-400/10 blur-[70px] rounded-full animate-float" />

        {/* Brand content */}
        <div className="relative z-10 text-center px-20 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <div
              className="p-4 rounded-2xl bg-primary text-white rotate-3"
              style={{ boxShadow: '0 24px 60px rgba(250,101,0,0.45)' }}
            >
              <Utensils size={34} strokeWidth={2.2} />
            </div>
            <h1
              className="text-[2.8rem] font-bold text-white tracking-tight leading-none"
              style={{ letterSpacing: '-0.02em' }}
            >
              RESTRO<span className="text-primary">NET</span>
            </h1>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="italic text-white leading-[1.08] mb-7 font-medium"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 'clamp(3rem, 4.5vw, 4.5rem)',
            }}
          >
            Your Culinary Journey
            <br />
            Begins Here.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-white/55 text-lg leading-relaxed font-medium"
          >
            Join the most exclusive community of foodies in Kathmandu. Discover
            hidden gems and manage your reservations effortlessly.
          </motion.p>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.5 }}
            className="mt-12 h-px w-32 mx-auto"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(250,101,0,0.7), transparent)',
            }}
          />
        </div>

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
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center px-6 sm:px-10 py-12 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-light dark:bg-mesh-dark pointer-events-none" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-12 lg:hidden"
          >
            <div
              className="p-3 rounded-2xl bg-primary text-white"
              style={{ boxShadow: '0 12px 28px rgba(250,101,0,0.28)' }}
            >
              <Utensils size={22} strokeWidth={2.2} />
            </div>
            <span
              className="text-[1.65rem] font-bold text-foreground tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              RESTRO<span className="text-primary">NET</span>
            </span>
          </motion.div>

          {/* Heading + progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7"
          >
            <h2
              className="text-[2.3rem] font-medium text-foreground mb-1.5 leading-tight text-center lg:text-left"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              Create Account
            </h2>
            <p className="text-muted-foreground text-sm font-medium mb-5 text-center lg:text-left">
              Follow the steps to join the community
            </p>

            {/* Step progress dots */}
            {step < 4 && (
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                  const s = i + 1;
                  return (
                    <div
                      key={s}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        step === s
                          ? 'w-10 bg-primary'
                          : s < step
                          ? 'w-6 bg-emerald-500'
                          : 'w-6 bg-border'
                      }`}
                    />
                  );
                })}
                <span className="text-[11px] text-muted-foreground font-semibold ml-2 uppercase tracking-widest">
                  {step < 4 ? `Step ${step} of ${TOTAL_STEPS}` : ''}
                </span>
              </div>
            )}
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="card p-8"
          >
            <AnimatePresence mode="wait">
              {/* ── Step 1: Name & Email ──────────────────────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-5"
                >
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        What's your name?
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          <UserIcon size={17} />
                        </span>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Full Name"
                          className="input-field pl-11 pr-4"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        And your email?
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
                          placeholder="email@example.com"
                          className="input-field pl-11 pr-4"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={nextStep}
                    className="btn-primary w-full py-3 text-base"
                  >
                    Continue <ArrowRight size={17} />
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Password ─────────────────────────────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-5"
                >
                  <div className="space-y-4">
                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Create a password
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          <Lock size={17} />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Password (min 6 chars)"
                          className="input-field pl-11 pr-12"
                          autoFocus
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

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Confirm password
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                          <Lock size={17} />
                        </span>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Repeat password"
                          className="input-field pl-11 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={prevStep}
                      className="btn-secondary w-12 h-12 p-0 shrink-0"
                      style={{ minWidth: '3rem' }}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button
                      onClick={handleSubmitAccount}
                      disabled={loading}
                      className="btn-primary flex-1 py-3 text-base"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Next: Tastes <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Preferences ──────────────────────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  {/* Cuisines */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Utensils size={14} className="text-primary" />
                      <label className="text-sm font-semibold text-foreground">
                        Favourite Cuisines
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {meta.cuisines.map((c) => (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          key={c._id}
                          type="button"
                          onClick={() => toggleCuisine(c._id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            preferences.cuisines.includes(c._id)
                              ? 'bg-primary border-primary text-white shadow-primary-sm'
                              : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {c.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Vibe / Diet */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-primary" />
                      <label className="text-sm font-semibold text-foreground">
                        Your Vibe / Diet
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {meta.tags
                        .filter(
                          (t) => t.category === 'ambience' || t.category === 'food'
                        )
                        .map((t) => (
                          <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            key={t._id}
                            type="button"
                            onClick={() => toggleTag(t._id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              preferences.tags.includes(t._id)
                                ? 'bg-primary border-primary text-white shadow-primary-sm'
                                : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            }`}
                          >
                            {t.name}
                          </motion.button>
                        ))}
                    </div>
                  </div>

                  {/* Budget range */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={14} className="text-foreground" />
                      <label className="text-sm font-semibold text-foreground">
                        Budget Range
                      </label>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((p) => (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          key={p}
                          type="button"
                          onClick={() =>
                            setPreferences({ ...preferences, priceRange: p })
                          }
                          className={`rounded-xl py-3 flex-1 font-semibold border-2 transition-all text-base ${
                            preferences.priceRange === p
                              ? 'bg-foreground border-foreground text-background dark:bg-foreground dark:text-background'
                              : 'bg-card border-border text-muted-foreground hover:border-foreground/30'
                          }`}
                        >
                          {Array(p).fill('$').join('')}
                        </motion.button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-2 text-center">
                      {
                        ['Budget Friendly', 'Casual Dining', 'Mid-Range', 'Fine Dining'][
                          preferences.priceRange - 1
                        ]
                      }
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <button
                      onClick={savePreferences}
                      disabled={loading}
                      type="button"
                      className="btn-primary w-full py-3 text-base"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          Personalise My Feed <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="w-full text-muted-foreground text-sm font-medium hover:text-foreground transition-colors py-2"
                    >
                      Skip for now
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Success ──────────────────────────────────────────── */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center py-10 space-y-8"
                >
                  <div className="relative inline-block">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="w-24 h-24 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 rounded-full flex items-center justify-center mx-auto relative z-10"
                      style={{ boxShadow: '0 12px 40px rgba(16,185,129,0.2)' }}
                    >
                      <CheckCircle2 size={52} strokeWidth={1.8} />
                    </motion.div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-emerald-200 dark:border-emerald-700/40 rounded-full animate-ping opacity-50" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 border border-emerald-100 dark:border-emerald-800/30 rounded-full animate-pulse opacity-40" />
                  </div>

                  <div className="space-y-2">
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.22 }}
                      className="text-3xl font-medium text-foreground"
                      style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                    >
                      Bon Appétit!
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.34 }}
                      className="text-muted-foreground font-medium px-4 leading-relaxed text-sm"
                    >
                      Your taste profile is set. We've curated a special feed just
                      for you.
                    </motion.p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                      Redirecting…
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer link */}
          {step < 3 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-8 text-muted-foreground font-medium text-sm"
            >
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary font-semibold hover:underline underline-offset-2 ml-1"
              >
                Sign in
              </Link>
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
