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
    <div className="min-h-screen flex bg-[#fafaf9]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-3/5 relative flex-col items-center justify-center overflow-hidden bg-gray-950">
        <motion.div
          initial={{ scale: 1.1, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 0.55 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/80 to-primary/20" />

        <div className="relative z-10 text-center px-24 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <div className="p-4 rounded-2xl bg-primary text-white shadow-[0_20px_50px_rgba(250,101,0,0.4)] rotate-6">
              <Utensils size={36} />
            </div>
            <h1 className="text-5xl font-bold text-white tracking-tight">
              RESTRO<span className="text-primary">NET</span>
            </h1>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="font-medium italic text-white leading-[1.1] mb-8"
            style={{
              fontFamily: "Cormorant Garamond, serif",
              fontSize: "clamp(3rem, 5vw, 4.5rem)",
            }}
          >
            Kathmandu's <br /> Finest Tables.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-white/60 text-lg leading-relaxed font-medium"
          >
            Experience the art of discovery. Sign in to access your curated collection and personalized recommendations.
          </motion.p>
        </div>

        <div className="absolute top-20 right-20 w-32 h-32 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-primary/10 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-center px-8 py-16 bg-[#fafaf9] relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-14 lg:hidden justify-center">
            <div className="p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
              <Utensils size={26} />
            </div>
            <span className="text-3xl font-bold text-warm-900 tracking-tight">
              RESTRO<span className="text-primary">NET</span>
            </span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2
              className="text-4xl font-medium text-warm-900 mb-2 leading-tight"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            >
              Welcome Back
            </h2>
            <p className="text-warm-600 text-sm font-medium">Continue your culinary journey</p>
          </div>

          <div className="bg-white rounded-2xl border border-warm-200 shadow-[0_4px_24px_rgba(26,24,20,0.06)] p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {/* Email field */}
                <div>
                  <label className="block text-sm font-semibold text-warm-900 mb-2">Email address</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="bg-warm-50 border border-warm-200 rounded-xl pl-11 pr-4 py-3 text-warm-900 placeholder-warm-400 font-medium outline-none focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all w-full"
                      required
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-warm-900">Password</label>
                    <Link
                      to="/forgot-password"
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400">
                      <Lock size={18} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="bg-warm-50 border border-warm-200 rounded-xl pl-11 pr-11 py-3 text-warm-900 placeholder-warm-400 font-medium outline-none focus:bg-white focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all w-full"
                      required
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl w-full transition-all shadow-[0_8px_24px_rgba(250,101,0,0.22)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center mt-10 text-warm-600 font-medium text-sm">
            New to RestroNet?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline ml-1">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
