import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Utensils, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh-light dark:bg-mesh-dark pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-3 mb-10"
        >
          <div className="p-3 rounded-2xl bg-primary text-white" style={{ boxShadow: '0 12px 28px rgba(250,101,0,0.28)' }}>
            <Utensils size={24} strokeWidth={2.2} />
          </div>
          <span className="text-[1.75rem] font-bold text-foreground tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            RESTRO<span className="text-primary">NET</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="mb-8 text-center"
        >
          <h2 className="text-[2rem] font-medium text-foreground mb-2 leading-tight" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Forgot Password
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="card p-8"
        >
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-foreground font-medium mb-2">Check your inbox</p>
              <p className="text-muted-foreground text-sm">
                If an account exists for {email}, a reset link has been sent.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Email address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Mail size={17} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-11 pr-4"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>

        <p className="text-center mt-8 text-muted-foreground font-medium text-sm">
          <Link to="/login" className="text-primary font-semibold hover:underline underline-offset-2 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
