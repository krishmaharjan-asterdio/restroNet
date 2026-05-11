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
    <div className="min-h-screen flex bg-white">
      {/* Left brand panel - Immersive & Motion-rich */}
      <div className="hidden lg:flex lg:w-3/5 relative flex-col items-center justify-center overflow-hidden bg-gray-950">
        <motion.div
          initial={{ scale: 1.1, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 0.6 }}
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
            <div className="p-5 rounded-3xl bg-primary text-white shadow-[0_20px_50px_rgba(250,101,0,0.4)] rotate-6">
              <Utensils size={40} />
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter">
              RESTRO<span className="text-primary">NET</span>
            </h1>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-display text-white mb-8 leading-[0.9]"
          >
            Kathmandu's <br/> Finest Tables.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-white/60 text-xl leading-relaxed font-medium"
          >
            Experience the art of discovery. Sign in to access your curated collection and personalized recommendations.
          </motion.p>
        </div>

        {/* Floating Accent Shapes */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-primary/10 blur-[100px] rounded-full animate-pulse delay-1000" />
      </div>

      {/* Right form panel - Clean & Tactile */}
      <div className="w-full lg:w-2/5 flex flex-col items-center justify-center px-10 py-16 relative overflow-hidden bg-gray-50/30">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-16 lg:hidden justify-center">
            <div className="p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
              <Utensils size={28} />
            </div>
            <span className="text-3xl font-black text-gray-900 tracking-tighter">
              RESTRO<span className="text-primary">NET</span>
            </span>
          </div>

          <div className="mb-12 text-center lg:text-left">
            <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-4 leading-none">Welcome Back</h2>
            <p className="text-gray-400 font-bold text-lg uppercase tracking-widest text-[10px]">Continue your culinary journey</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-[3.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.05)]">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-5">
                <div>
                  <label className="text-label ml-2 mb-3 block">Email Identity</label>
                  <div className="group flex items-center gap-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 focus-within:bg-white focus-within:border-primary/20 focus-within:shadow-[0_0_0_6px_rgba(250,101,0,0.05)] transition-all">
                    <Mail size={22} className="text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="flex-1 outline-none text-gray-900 bg-transparent placeholder-gray-300 font-bold text-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center ml-2 mb-3">
                    <label className="text-label">Security Key</label>
                    <Link to="/forgot-password" size="small" className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Forgot?</Link>
                  </div>
                  <div className="group flex items-center gap-4 bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-5 focus-within:bg-white focus-within:border-primary/20 focus-within:shadow-[0_0_0_6px_rgba(250,101,0,0.05)] transition-all">
                    <Lock size={22} className="text-gray-300 group-focus-within:text-primary transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="flex-1 outline-none text-gray-900 bg-transparent placeholder-gray-300 font-bold text-lg tracking-[0.2em]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary-hearth w-full py-5 rounded-[1.75rem] text-xl shadow-[0_20px_50px_rgba(250,101,0,0.3)]"
              >
                {loading ? (
                  <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={24} className="ml-2" /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center mt-12 text-gray-400 font-bold">
            New to RestroNet?{' '}
            <Link to="/register" className="text-primary font-black hover:underline ml-1">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
