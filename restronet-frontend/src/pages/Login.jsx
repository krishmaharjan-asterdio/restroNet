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
    <div className="min-h-screen flex bg-[#fcfcfd]">
      {/* Left brand panel - Hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center overflow-hidden bg-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80')" }}
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
            Taste the Best <br/> Kathmandu has to offer.
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-gray-300 text-lg leading-relaxed font-medium"
          >
            Log in to access your saved restaurants, personalized recommendations, and past reservations.
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
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Welcome Back</h2>
            <p className="text-gray-500 font-medium">Continue your culinary journey</p>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Email Address</label>
                  <div className="group flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary focus-within:bg-white transition-all">
                    <Mail size={20} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      className="flex-1 outline-none text-gray-800 bg-transparent placeholder-gray-400 font-semibold"
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-sm font-bold text-gray-700">Password</label>
                    <Link to="/forgot-password" size="small" className="text-primary text-xs font-bold hover:underline">Forgot?</Link>
                  </div>
                  <div className="group flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary focus-within:bg-white transition-all">
                    <Lock size={20} className="text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="flex-1 outline-none text-gray-800 bg-transparent placeholder-gray-400 font-semibold"
                      required
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-2xl text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:translate-y-0"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={20} /></>
                )}
              </button>
            </form>
          </div>

          <p className="text-center mt-10 text-gray-500 font-semibold">
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
