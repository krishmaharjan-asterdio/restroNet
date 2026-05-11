import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Users, Store, MessageSquare, Menu as MenuIcon, TrendingUp, Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, colorClass, trend }) => (
  <div className="hearth-card p-6 flex items-start gap-5 group">
    <div className={`p-4 rounded-2xl ${colorClass} shrink-0 transition-transform group-hover:scale-110`}>
      <Icon size={24} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-label mb-2">{title}</p>
      <h3 className="text-4xl font-black text-gray-900 tabular-nums mb-1">{value ?? '—'}</h3>
      {trend && <p className="text-xs text-gray-400 font-medium">{trend}</p>}
    </div>
  </div>
);

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
    <div className="space-y-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Executive Overview</h1>
          <p className="text-gray-500 mt-2 font-medium">Real-time pulse of your restaurant network</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 pr-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
            {admin?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <p className="text-label text-primary">{admin?.role}</p>
            <p className="font-bold text-gray-900">{admin?.name}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {admin?.role === 'superadmin' && (
          <StatCard title="Total Users" value={mainStats.totalUsers} icon={Users} colorClass="bg-blue-50 text-blue-600" trend="Active members" />
        )}
        <StatCard title="Restaurants" value={mainStats.totalVenues} icon={Store} colorClass="bg-orange-50 text-orange-600" trend="Live venues" />
        <StatCard title="Total Reviews" value={mainStats.totalReviews} icon={MessageSquare} colorClass="bg-green-50 text-green-600" trend="Guest feedback" />
        <StatCard title="Menu Items" value={mainStats.totalMenus} icon={MenuIcon} colorClass="bg-purple-50 text-purple-600" trend="Across catalog" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Trending Restaurants */}
        <div className="lg:col-span-2 hearth-card p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-primary" size={24} />
              <h2 className="text-2xl font-black text-gray-900">High Performers</h2>
            </div>
            <button className="text-sm font-bold text-primary hover:underline">View All</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trendingVenues.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-10 italic">Awaiting more data...</p>
            ) : (
              trendingVenues.map((venue) => (
                <div key={venue._id} className="flex items-center gap-5 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-colors group">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                    {venue.logo ? <img src={`http://localhost:5000${venue.logo}`} className="w-full h-full object-cover" alt={venue.name} /> : <div className="w-full h-full flex items-center justify-center font-black text-gray-300 text-xl">{venue.name.charAt(0)}</div>}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{venue.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">{venue.totalReviews} total reviews</p>
                  </div>
                  <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-black text-xs flex items-center gap-1">
                    {venue.averageRating.toFixed(1)} <Star size={10} className="fill-current" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="hearth-card p-8">
          <div className="flex items-center gap-3 mb-10">
            <MessageSquare className="text-primary" size={24} />
            <h2 className="text-2xl font-black text-gray-900">Latest Feedback</h2>
          </div>
          <div className="space-y-6">
            {recentReviews.length === 0 ? (
              <p className="text-gray-500 text-center py-10 italic">No recent activity.</p>
            ) : (
              recentReviews.map(review => (
                <div key={review._id} className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{review.user?.name || 'Guest'}</p>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">{review.venue?.name}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-yellow-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={10} className={i < review.rating.overall ? 'fill-current' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{review.comment}</p>
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
