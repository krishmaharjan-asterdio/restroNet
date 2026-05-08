import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Utensils, User as UserIcon, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

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
      setStep(3); // Go to Preferences step
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
      setStep(4); // Show success step
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      toast.error('Failed to save preferences');
      // Still redirect anyway as the account is created
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
    <div className="min-h-screen flex bg-[#fcfcfd]">
      {/* Left brand panel - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900/80 to-primary/30" />

        <div className="relative z-10 text-center px-16 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center gap-3 mb-10"
          >
            <div className="p-4 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/40 rotate-3">
              <Utensils size={36} />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              RESTRO<span className="text-primary">NET</span>
            </h1>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl font-extrabold text-white mb-6 leading-tight tracking-tight"
          >
            Your Culinary Journey <br /> Begins Here.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-gray-300 text-lg leading-relaxed font-medium"
          >
            Join the most exclusive community of foodies in Kathmandu. Discover hidden gems and manage your reservations effortlessly.
          </motion.p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Abstract shapes for background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 mb-12 lg:hidden">
            <div className="p-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
              <Utensils size={24} />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tighter">
              RESTRO<span className="text-primary">NET</span>
            </span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Create Account</h2>
            <p className="text-gray-500 font-medium">Follow the steps to join the community</p>

            {/* Step Indicator */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? 'w-10 bg-primary' : s < step ? 'w-6 bg-green-500' : 'w-6 bg-gray-200'
                    }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50">
            <AnimatePresence mode="wait">
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
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">What's your name?</label>
                      <div className="group flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary focus-within:bg-white transition-all">
                        <UserIcon size={20} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Full Name"
                          className="flex-1 outline-none text-gray-800 bg-transparent placeholder-gray-400 font-semibold"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">And your email?</label>
                      <div className="group flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary focus-within:bg-white transition-all">
                        <Mail size={20} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="email@example.com"
                          className="flex-1 outline-none text-gray-800 bg-transparent placeholder-gray-400 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={nextStep}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95"
                  >
                    Continue <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}

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
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Secure your account</label>
                      <div className="group flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary focus-within:bg-white transition-all">
                        <Lock size={20} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Password (min 6 chars)"
                          className="flex-1 outline-none text-gray-800 bg-transparent placeholder-gray-400 font-semibold"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Confirm password</label>
                      <div className="group flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary focus-within:bg-white transition-all">
                        <Lock size={20} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Repeat password"
                          className="flex-1 outline-none text-gray-800 bg-transparent placeholder-gray-400 font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-gray-400 hover:text-primary transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={prevStep}
                      className="w-16 h-16 bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                    >
                      <ArrowLeft size={24} />
                    </button>
                    <button
                      onClick={handleSubmitAccount}
                      disabled={loading}
                      className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:translate-y-0"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Next: Tastes <ArrowRight size={20} /></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={formVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8"
                >
                  <div className="space-y-8">
                    {/* Cuisines Section */}
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="flex items-center gap-2 mb-3 ml-1">
                        <Utensils size={16} className="text-primary" />
                        <label className="block text-sm font-bold text-gray-800">Favorite Cuisines</label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {meta.cuisines.map(c => (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            key={c._id}
                            onClick={() => toggleCuisine(c._id)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border-2 ${preferences.cuisines.includes(c._id)
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                              : 'bg-white border-gray-100 text-gray-500 hover:border-primary/30'
                              }`}
                          >
                            {c.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Vibe Section */}
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
                      <div className="flex items-center gap-2 mb-3 ml-1">
                        <Sparkles size={16} className="text-orange-500" />
                        <label className="block text-sm font-bold text-gray-800">Your Vibe / Diet</label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {meta.tags.filter(t => t.category === 'ambience' || t.category === 'food').map(t => (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            key={t._id}
                            onClick={() => toggleTag(t._id)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border-2 ${preferences.tags.includes(t._id)
                              ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                              : 'bg-white border-gray-100 text-gray-500 hover:border-orange-500/30'
                              }`}
                          >
                            {t.name}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
                      <div className="flex items-center gap-2 mb-3 ml-1">
                        <MapPin size={16} className="text-gray-900" />
                        <label className="block text-sm font-bold text-gray-800">Budget Range</label>
                      </div>
                      <div className="flex gap-3">
                        {[1, 2, 3, 4].map(p => (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={p}
                            onClick={() => setPreferences({ ...preferences, priceRange: p })}
                            className={`flex-1 py-4 rounded-[1.25rem] font-black text-xl transition-all border-2 ${preferences.priceRange === p
                              ? 'bg-gray-900 border-gray-900 text-white shadow-xl shadow-gray-900/20'
                              : 'bg-white border-gray-100 text-gray-300 hover:border-gray-200'
                              }`}
                          >
                            {Array(p).fill('₨').join('')}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold mt-2 ml-1 uppercase tracking-widest text-center">
                        {['Budget Friendly', 'Casual Dining', 'Mid-Range', 'Fine Dining'][preferences.priceRange - 1]}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <button
                      onClick={savePreferences}
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70"
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Personalize My Feed <ArrowRight size={20} /></>
                      )}
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="w-full text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors py-2"
                    >
                      Skip for now
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-8"
                >
                  <div className="relative inline-block">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="w-28 h-28 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-100 relative z-10"
                    >
                      <CheckCircle2 size={64} strokeWidth={2.5} />
                    </motion.div>
                    {/* Decorative rings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-green-100 rounded-full animate-ping opacity-75" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-green-50 rounded-full animate-pulse opacity-50" />
                  </div>

                  <div className="space-y-3">
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-3xl font-black text-gray-900 tracking-tight"
                    >
                      Bon Appétit!
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-gray-500 font-bold px-6 leading-relaxed"
                    >
                      Your taste profile is set. We've curated a special feed just for you.
                    </motion.p>
                  </div>

                  <div className="pt-4 flex flex-col items-center">
                    <div className="flex gap-1.5 mb-3">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          className="w-2 h-2 bg-primary rounded-full"
                        />
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em]">Redirecting...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {step < 3 && (
            <p className="text-center mt-10 text-gray-500 font-semibold">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-black hover:underline ml-1">
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
