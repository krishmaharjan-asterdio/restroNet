import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Store, MessageSquare, Calendar, Star, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const ACCENT_META = {
  orange: {
    border: 'border-[#fa6500]',
    iconBg: 'bg-[#fa6500]/10',
    iconText: 'text-[#fa6500]',
    circle: 'rgba(250,101,0,0.07)',
  },
  green: {
    border: 'border-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    circle: 'rgba(16,185,129,0.07)',
  },
  blue: {
    border: 'border-blue-500',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    circle: 'rgba(59,130,246,0.07)',
  },
};

const StatCard = ({ title, value, icon: Icon, accent, trend, delay = 0 }) => {
  const meta = ACCENT_META[accent] ?? ACCENT_META.orange;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`relative overflow-hidden bg-white dark:bg-[#131e35] rounded-2xl border border-slate-200 dark:border-[#1e2d47] p-6 min-h-[140px] flex flex-col justify-between border-t-2 ${meta.border}`}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-28px',
          bottom: '-28px',
          width: '148px',
          height: '148px',
          borderRadius: '9999px',
          background: `radial-gradient(circle, ${meta.circle} 0%, transparent 70%)`,
          pointerEvents: 'none',
          filter: 'blur(2px)',
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-slate-500 dark:text-[#8b98b0] text-sm font-semibold leading-snug">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.iconText}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
          {value ?? '—'}
        </h3>
        {trend && (
          <p className="text-xs text-slate-500 dark:text-[#8b98b0] font-medium mt-1">{trend}</p>
        )}
      </div>
    </motion.div>
  );
};

const OwnerDashboard = () => {
  const { admin } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to load your dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-slate-50 dark:bg-[#0f1629]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-11 w-11 border-2 border-slate-200 dark:border-[#1e2d47] border-t-[#fa6500]" />
          <span className="text-slate-500 dark:text-[#8b98b0] text-sm">Loading your dashboard…</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { stats: mainStats, recentReviews, todayReservations } = stats;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1
          className="text-3xl font-medium text-slate-800 dark:text-slate-100 leading-tight"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
        >
          Welcome back, {admin?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-slate-500 dark:text-[#8b98b0] text-sm mt-1">
          Here's what's happening at your restaurant today
        </p>
        <p className="text-slate-400 dark:text-[#4a5a78] text-xs mt-1.5 font-medium">{today}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Today's Reservations"
          value={mainStats.todayReservationsCount}
          icon={Calendar}
          accent="orange"
          trend="Guests booked today"
          delay={0}
        />
        <StatCard
          title="Total Reviews"
          value={mainStats.totalReviews}
          icon={MessageSquare}
          accent="green"
          trend="Guest feedback"
          delay={0.05}
        />
        <StatCard
          title="Restaurants"
          value={mainStats.totalVenues}
          icon={Store}
          accent="blue"
          trend="Managed by you"
          delay={0.1}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="lg:col-span-2 bg-white dark:bg-[#131e35] rounded-2xl border border-slate-200 dark:border-[#1e2d47] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Clock size={17} className="text-[#fa6500]" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Today's Reservations</h2>
            </div>
            <Link
              to="/owner/reservations"
              className="text-xs font-semibold text-[#fa6500] hover:underline underline-offset-2 transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="space-y-1">
            {todayReservations.length === 0 ? (
              <p className="text-[#4a5a78] text-center py-10 text-sm italic">
                No reservations booked for today yet.
              </p>
            ) : (
              todayReservations.map((res, idx) => (
                <motion.div
                  key={res._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.05 }}
                  className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1e2d47] transition-colors duration-200"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#fa6500]/10 text-[#fa6500] flex items-center justify-center font-bold text-sm shrink-0">
                    {res.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">
                      {res.user?.name || 'Guest'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-[#8b98b0] font-medium mt-0.5 truncate">
                      {res.venue?.name} · Party of {res.guests ?? '—'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0f1629] text-slate-500 dark:text-[#8b98b0] shrink-0">
                    {res.status}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="bg-white dark:bg-[#131e35] rounded-2xl border border-slate-200 dark:border-[#1e2d47] p-6"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <MessageSquare size={17} className="text-[#fa6500]" />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Latest Reviews</h2>
          </div>

          <div className="space-y-5">
            {recentReviews.length === 0 ? (
              <p className="text-[#4a5a78] text-center py-10 text-sm italic">
                No reviews yet.
              </p>
            ) : (
              recentReviews.map((review, idx) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + idx * 0.06 }}
                  className="pb-5 border-b border-slate-200 dark:border-[#1e2d47] last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                      {review.user?.name || 'Guest'}
                    </p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          className={
                            i < review.rating.overall
                              ? 'text-amber-400 fill-current'
                              : 'text-[#2d3d57] fill-current'
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {review.comment}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
