import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Utensils, User as UserIcon, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const Register = () => {
  const { registerUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
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
        api.get('/metadata/tags')
      ]);
      setMeta({ cuisines: cRes.data.cuisines, tags: tRes.data.tags });
    } catch (err) {
      console.error('Failed to load metadata');
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const toggleCuisine = (id) => {
    setPreferences(prev => ({
      ...prev,
      cuisines: prev.cuisines.includes(id)
        ? prev.cuisines.filter(c => c !== id)
        : [...prev.cuisines, id]
    }));
  };

  const toggleTag = (id) => {
    setPreferences(prev => ({
      ...prev,
      tags: prev.tags.includes(id)
        ? prev.tags.filter(t => t !== id)
        : [...prev.tags, id]
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
      return toast.error("Password must be at least 6 characters");
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
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      toast.error('Failed to save preferences');
      setStep(4);
      setTimeout(() => navigate('/'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <div className="min-h-screen flex bg-[#fafaf9]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gray-950">
        <motion.div
          initial={{ scale: 1.1, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 0.55 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/80 to-primary/20" />

        <div className="relative z-10 text-center px-16 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-3 mb-10"
          >
            <div className="p-4 rounded-2xl bg-primary text-white shadow-[0_20px_50px_rgba(250,101,0,0.4)] rotate-3">
              <Utensils size={34} />
            </div>
            <h1 className="text-5xl font-bold text-white tracking-tight">
              RESTRO<span className="text-primary">NET</span>
            </h1>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-medium italic text-white leading-[1.1] mb-6"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(3rem, 5vw, 4.5rem)",
            }}
          >
            Your Culinary Journey <br /> Begins Here.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-white/60 text-lg leading-relaxed font-medium"
          >
            Join the most exclusive community of foodies in Kathmandu. Discover hidden gems and manage your reservations effortlessly.
          </motion.p>
        </div>

        <div className="absolute top-20 right-20 w-32 h-32 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-primary/10 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 py-12 bg-[#fafaf9] relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-12 lg:hidden">
            <div className="p-2.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
              <Utensils size={22} />
            </div>
            <span className="text-2xl font-bold text-warm-900 tracking-tight">
              RESTRO<span className="text-primary">NET</span>
            </span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2
              className="text-4xl font-medium text-warm-900 mb-1 leading-tight"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              Create Account
            </h2>
            <p className="text-warm-600 text-sm font-medium mb-5">Follow the steps to join the community</p>

            {/* Step Indicator */}
            <div className="flex items-center justify-center lg:justify-start gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    step === s
                      ? 'w-10 bg-primary'
                      : s < step
                      ? 'w-6 bg-emerald-500'
                      : 'w-6 bg-warm-200'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-warm-200 shadow-[0_4px_24px_rgba(26,24,20,0.06)] p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Name & Email */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-warm-900 mb-2">What's your name?</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
                          <UserIcon size={18} />
                        </span>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Full Name"
                          className="bg-warm-50 border border-warm-200 rounded-xl pl-11 pr-4 py-3 text-warm-900 placeholder-warm-400 font-medium outline-none focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all w-full"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-warm-900 mb-2">And your email?</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
                          <Mail size={18} />
                        </span>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="email@example.com"
                          className="bg-warm-50 border border-warm-200 rounded-xl pl-11 pr-4 py-3 text-warm-900 placeholder-warm-400 font-medium outline-none focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={nextStep}
                    className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl w-full transition-all shadow-[0_8px_24px_rgba(250,101,0,0.22)] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    Continue <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {/* Step 2: Password */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-warm-900 mb-2">Create a password</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
                          <Lock size={18} />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Password (min 6 chars)"
                          className="bg-warm-50 border border-warm-200 rounded-xl pl-11 pr-11 py-3 text-warm-900 placeholder-warm-400 font-medium outline-none focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all w-full"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-warm-900 mb-2">Confirm password</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
                          <Lock size={18} />
                        </span>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Repeat password"
                          className="bg-warm-50 border border-warm-200 rounded-xl pl-11 pr-11 py-3 text-warm-900 placeholder-warm-400 font-medium outline-none focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all w-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-warm-400 hover:text-primary transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={prevStep}
                      className="w-12 h-12 bg-warm-50 border border-warm-200 text-warm-600 rounded-xl flex items-center justify-center hover:bg-warm-100 transition-colors shrink-0"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button
                      onClick={handleSubmitAccount}
                      disabled={loading}
                      className="flex-1 bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-all shadow-[0_8px_24px_rgba(250,101,0,0.22)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Next: Tastes <ArrowRight size={18} /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Preferences */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-7"
                >
                  {/* Cuisines */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Utensils size={15} className="text-primary" />
                      <label className="block text-sm font-semibold text-warm-900">Favorite Cuisines</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {meta.cuisines.map(c => (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          key={c._id}
                          onClick={() => toggleCuisine(c._id)}
                          className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${
                            preferences.cuisines.includes(c._id)
                              ? 'bg-primary border-primary text-white'
                              : 'bg-white border-warm-200 text-warm-600 hover:border-primary/40'
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
                      <Sparkles size={15} className="text-primary" />
                      <label className="block text-sm font-semibold text-warm-900">Your Vibe / Diet</label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {meta.tags.filter(t => t.category === 'ambience' || t.category === 'food').map(t => (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          key={t._id}
                          onClick={() => toggleTag(t._id)}
                          className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${
                            preferences.tags.includes(t._id)
                              ? 'bg-primary border-primary text-white'
                              : 'bg-white border-warm-200 text-warm-600 hover:border-primary/40'
                          }`}
                        >
                          {t.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin size={15} className="text-warm-900" />
                      <label className="block text-sm font-semibold text-warm-900">Budget Range</label>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(p => (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          key={p}
                          onClick={() => setPreferences({ ...preferences, priceRange: p })}
                          className={`rounded-xl py-3 flex-1 font-semibold border-2 transition-all text-lg ${
                            preferences.priceRange === p
                              ? 'bg-warm-900 border-warm-900 text-white'
                              : 'bg-white border-warm-200 text-warm-400'
                          }`}
                        >
                          {Array(p).fill('$').join('')}
                        </motion.button>
                      ))}
                    </div>
                    <p className="text-[11px] text-warm-400 font-medium mt-2 text-center">
                      {['Budget Friendly', 'Casual Dining', 'Mid-Range', 'Fine Dining'][preferences.priceRange - 1]}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={savePreferences}
                      disabled={loading}
                      className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl w-full transition-all shadow-[0_8px_24px_rgba(250,101,0,0.22)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Personalize My Feed <ArrowRight size={18} /></>
                      )}
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="w-full text-warm-400 text-sm font-medium hover:text-warm-600 transition-colors py-2"
                    >
                      Skip for now
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-10 space-y-8"
                >
                  <div className="relative inline-block">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100/50 relative z-10"
                    >
                      <CheckCircle2 size={56} strokeWidth={2} />
                    </motion.div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-emerald-100 rounded-full animate-ping opacity-60" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 border border-emerald-50 rounded-full animate-pulse opacity-40" />
                  </div>

                  <div className="space-y-2">
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl font-medium text-warm-900"
                      style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                    >
                      Bon Appétit!
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-warm-600 font-medium px-4 leading-relaxed text-sm"
                    >
                      Your taste profile is set. We've curated a special feed just for you.
                    </motion.p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                    <p className="text-warm-400 text-xs font-medium uppercase tracking-widest">Redirecting...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step < 3 && (
            <p className="text-center mt-8 text-warm-600 font-medium text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline ml-1">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
