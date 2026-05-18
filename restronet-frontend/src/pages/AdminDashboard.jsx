import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Users, Store, MessageSquare, Menu as MenuIcon, TrendingUp, Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';

const ACCENT_META = {
  blue:   { border: 'border-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-600',   circle: 'rgba(59,130,246,0.04)' },
  orange: { border: 'border-orange-500', bg: 'bg-orange-50', text: 'text-orange-600', circle: 'rgba(250,101,0,0.04)' },
  green:  { border: 'border-green-500',  bg: 'bg-green-50',  text: 'text-green-600',  circle: 'rgba(34,197,94,0.04)' },
  purple: { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600', circle: 'rgba(168,85,247,0.04)' },
};

const StatCard = ({ title, value, icon: Icon, accent, trend }) => {
  const meta = ACCENT_META[accent] ?? ACCENT_META.orange;

  return (
    <div
      className={`relative overflow-hidden p-6 rounded-2xl bg-white border border-warm-200 shadow-card flex flex-col justify-between min-h-[148px] border-t-2 ${meta.border}`}
    >
      {/* Decorative background circle */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-24px',
          bottom: '-24px',
          width: '140px',
          height: '140px',
          borderRadius: '9999px',
          background: meta.circle,
          pointerEvents: 'none',
        }}
      />

      {/* Top row: title + icon */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-warm-600 leading-snug">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.text}`}>
          <Icon size={18} />
        </div>
      </div>

      {/* Bottom: number + trend */}
      <div className="mt-4">
        <h3 className="text-3xl font-bold text-warm-900 tabular-nums">{value ?? '—'}</h3>
        {trend && (
          <p className="text-xs text-warm-500 font-medium mt-1">{trend}</p>
        )}
      </div>
    </div>
  );
};

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) return null;

  const { stats: mainStats, recentVenues, recentReviews, trendingVenues } = stats;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1
            className="text-3xl font-medium text-warm-900"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            Executive Overview
          </h1>
          <p className="text-sm text-warm-500 mt-1">Real-time pulse of your restaurant network</p>
        </div>

        {/* Admin profile card */}
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-warm-200 shadow-card">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 select-none">
            {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-warm-900">{admin?.name}</p>
            <span className="inline-block text-[10px] font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-full capitalize tracking-wide">
              {admin?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {admin?.role === 'superadmin' && (
          <StatCard
            title="Total Users"
            value={mainStats.totalUsers}
            icon={Users}
            accent="blue"
            trend="Active members"
          />
        )}
        <StatCard
          title="Restaurants"
          value={mainStats.totalVenues}
          icon={Store}
          accent="orange"
          trend="Live venues"
        />
        <StatCard
          title="Total Reviews"
          value={mainStats.totalReviews}
          icon={MessageSquare}
          accent="green"
          trend="Guest feedback"
        />
        <StatCard
          title="Menu Items"
          value={mainStats.totalMenus}
          icon={MenuIcon}
          accent="purple"
          trend="Across catalog"
        />
      </div>

      {/* Lower panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* High Performers */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-warm-200 shadow-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <TrendingUp size={18} className="text-primary" />
              <h2 className="text-lg font-semibold text-warm-900">High Performers</h2>
            </div>
            <button className="text-xs font-semibold text-primary hover:underline underline-offset-2 transition-colors">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trendingVenues.length === 0 ? (
              <p className="text-warm-500 col-span-full text-center py-10 text-sm italic">
                Awaiting more data…
              </p>
            ) : (
              trendingVenues.map((venue) => {
                const logoUrl = getImageUrl(venue.logo);
                return (
                  <div
                    key={venue._id}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-warm-50 transition-colors"
                  >
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-warm-200 shrink-0 bg-warm-100">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          className="w-full h-full object-cover"
                          alt={venue.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-warm-400 font-bold text-lg">
                          {venue.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-warm-900 truncate text-sm">{venue.name}</h4>
                      <p className="text-xs text-warm-500 font-medium mt-0.5">
                        {venue.totalReviews} reviews
                      </p>
                    </div>

                    {/* Rating badge */}
                    <div className="bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shrink-0">
                      <Star size={10} className="fill-current" />
                      {venue.averageRating.toFixed(1)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Latest Feedback */}
        <div className="bg-white rounded-2xl border border-warm-200 shadow-card p-6">
          <div className="flex items-center gap-2.5 mb-6">
            <MessageSquare size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-warm-900">Latest Feedback</h2>
          </div>

          <div className="space-y-5">
            {recentReviews.length === 0 ? (
              <p className="text-warm-500 text-center py-10 text-sm italic">No recent activity.</p>
            ) : (
              recentReviews.map((review) => (
                <div
                  key={review._id}
                  className="pb-5 border-b border-warm-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-warm-900 text-sm truncate">
                        {review.user?.name || 'Guest'}
                      </p>
                      <p className="text-xs text-primary font-medium truncate">
                        {review.venue?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 text-yellow-400 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < review.rating.overall ? 'fill-current' : 'text-warm-200 fill-current'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-warm-700 leading-relaxed line-clamp-2">
                    {review.comment}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
