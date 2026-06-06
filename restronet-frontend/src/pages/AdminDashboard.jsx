import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  Users,
  Store,
  MessageSquare,
  Menu as MenuIcon,
  TrendingUp,
  Star,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';

/* ─── Accent tokens for dark admin panel ─────────────────────────────────── */
const ACCENT_META = {
  blue: {
    border: 'border-blue-500',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    circle: 'rgba(59,130,246,0.07)',
    topBorder: '#3b82f6',
  },
  orange: {
    border: 'border-[#fa6500]',
    iconBg: 'bg-[#fa6500]/10',
    iconText: 'text-[#fa6500]',
    circle: 'rgba(250,101,0,0.07)',
    topBorder: '#fa6500',
  },
  green: {
    border: 'border-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    circle: 'rgba(16,185,129,0.07)',
    topBorder: '#10b981',
  },
  purple: {
    border: 'border-purple-500',
    iconBg: 'bg-purple-500/10',
    iconText: 'text-purple-400',
    circle: 'rgba(168,85,247,0.07)',
    topBorder: '#a855f7',
  },
};

/* ─── StatCard ────────────────────────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, accent, trend, delay = 0 }) => {
  const meta = ACCENT_META[accent] ?? ACCENT_META.orange;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`relative overflow-hidden bg-[#131e35] rounded-2xl border border-[#1e2d47] p-6 min-h-[140px] flex flex-col justify-between border-t-2 ${meta.border}`}
    >
      {/* Decorative blurred circle */}
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

      {/* Top row: title + icon */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[#8b98b0] text-sm font-semibold leading-snug">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.iconText}`}>
          <Icon size={18} />
        </div>
      </div>

      {/* Bottom: value + trend */}
      <div className="mt-4 relative z-10">
        <h3 className="text-3xl font-bold text-slate-100 tabular-nums">
          {value ?? '—'}
        </h3>
        {trend && (
          <p className="text-xs text-[#8b98b0] font-medium mt-1">{trend}</p>
        )}
      </div>
    </motion.div>
  );
};

/* ─── Skeleton card for loading state ────────────────────────────────────── */
const StatSkeleton = () => (
  <div className="bg-[#131e35] rounded-2xl border border-[#1e2d47] h-36 animate-pulse" />
);

/* ─── AdminDashboard ──────────────────────────────────────────────────────── */
const AdminDashboard = () => {
  const { admin } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/admin/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  /* Full-page loading spinner */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-[#0f1629]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-11 w-11 border-2 border-[#1e2d47] border-t-[#fa6500]" />
          <span className="text-[#8b98b0] text-sm">Loading overview…</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { stats: mainStats, recentVenues, recentReviews, trendingVenues } = stats;

  /* Formatted current date */
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5"
      >
        <div>
          <h1
            className="text-3xl font-medium text-slate-100 leading-tight"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            Executive Overview
          </h1>
          <p className="text-[#8b98b0] text-sm mt-1">
            Real-time pulse of your restaurant network
          </p>
          <p className="text-[#4a5a78] text-xs mt-1.5 font-medium">{today}</p>
        </div>

        {/* Admin profile card */}
        <div className="flex items-center gap-3 bg-[#131e35] border border-[#1e2d47] px-4 py-3 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-[#fa6500] text-white flex items-center justify-center font-bold text-base shrink-0 select-none">
            {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-100">{admin?.name}</p>
            <span className="inline-block text-[10px] font-bold text-[#fa6500] bg-[#fa6500]/10 px-2 py-0.5 rounded-full capitalize tracking-wide mt-0.5">
              {admin?.role}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {admin?.role === 'superadmin' && (
          <StatCard
            title="Total Users"
            value={mainStats.totalUsers}
            icon={Users}
            accent="blue"
            trend="Active members"
            delay={0}
          />
        )}
        <StatCard
          title="Restaurants"
          value={mainStats.totalVenues}
          icon={Store}
          accent="orange"
          trend="Live venues"
          delay={0.05}
        />
        <StatCard
          title="Total Reviews"
          value={mainStats.totalReviews}
          icon={MessageSquare}
          accent="green"
          trend="Guest feedback"
          delay={0.1}
        />
        <StatCard
          title="Menu Items"
          value={mainStats.totalMenus}
          icon={MenuIcon}
          accent="purple"
          trend="Across catalog"
          delay={0.15}
        />
      </div>

      {/* ── Lower panels ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* High Performers (2/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="lg:col-span-2 bg-[#131e35] rounded-2xl border border-[#1e2d47] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <TrendingUp size={17} className="text-[#fa6500]" />
              <h2 className="text-base font-semibold text-slate-100">High Performers</h2>
            </div>
            <button className="text-xs font-semibold text-[#fa6500] hover:underline underline-offset-2 transition-colors">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {trendingVenues.length === 0 ? (
              <p className="text-[#4a5a78] col-span-full text-center py-10 text-sm italic">
                Awaiting more data…
              </p>
            ) : (
              trendingVenues.map((venue, idx) => {
                const logoUrl = getImageUrl(venue.logo);
                return (
                  <motion.div
                    key={venue._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + idx * 0.05 }}
                    className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-[#1e2d47] transition-colors duration-200 cursor-default"
                  >
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#1e2d47] shrink-0 bg-[#0f1629]">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          className="w-full h-full object-cover"
                          alt={venue.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8b98b0] font-bold text-base">
                          {venue.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-100 truncate text-sm">
                        {venue.name}
                      </h4>
                      <p className="text-xs text-[#8b98b0] font-medium mt-0.5">
                        {venue.totalReviews} reviews
                      </p>
                    </div>

                    {/* Rating badge */}
                    <div className="bg-emerald-900/50 text-emerald-400 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shrink-0">
                      <Star size={10} className="fill-current" />
                      {venue.averageRating.toFixed(1)}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Latest Feedback (1/3 width) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="bg-[#131e35] rounded-2xl border border-[#1e2d47] p-6"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <MessageSquare size={17} className="text-[#fa6500]" />
            <h2 className="text-base font-semibold text-slate-100">Latest Feedback</h2>
          </div>

          <div className="space-y-5">
            {recentReviews.length === 0 ? (
              <p className="text-[#4a5a78] text-center py-10 text-sm italic">
                No recent activity.
              </p>
            ) : (
              recentReviews.map((review, idx) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.06 }}
                  className="pb-5 border-b border-[#1e2d47] last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 text-sm truncate">
                        {review.user?.name || 'Guest'}
                      </p>
                      <p className="text-xs text-[#fa6500] font-medium truncate mt-0.5">
                        {review.venue?.name}
                      </p>
                    </div>
                    {/* Stars */}
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
                  <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                    {review.comment}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

      </div>

      {/* ── Recently Added Venues ─────────────────────────────────────── */}
      {recentVenues?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="bg-[#131e35] rounded-2xl border border-[#1e2d47] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Clock size={17} className="text-[#fa6500]" />
              <h2 className="text-base font-semibold text-slate-100">Recently Added</h2>
            </div>
            <span className="text-[10px] font-bold text-[#4a5a78] uppercase tracking-widest">
              New Venues
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {recentVenues.map((venue, idx) => {
              const logoUrl = getImageUrl(venue.logo);
              const added = new Date(venue.createdAt);
              const daysAgo = Math.floor((Date.now() - added) / (1000 * 60 * 60 * 24));
              return (
                <motion.div
                  key={venue._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 + idx * 0.04 }}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-[#1e2d47] transition-colors duration-200 cursor-default"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#1e2d47] shrink-0 bg-[#0f1629]">
                    {logoUrl ? (
                      <img src={logoUrl} className="w-full h-full object-cover" alt={venue.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8b98b0] font-bold text-sm">
                        {venue.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-100 truncate text-sm">{venue.name}</h4>
                    <p className="text-xs text-[#8b98b0] mt-0.5">
                      {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
                    </p>
                  </div>
                  {venue.isActive !== false && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminDashboard;
