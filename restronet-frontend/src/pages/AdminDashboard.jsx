import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Users, Store, MessageSquare, Menu as MenuIcon, TrendingUp, Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, colorClass, borderColor, trend }) => (
  <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-200 border-l-4 ${borderColor}`}>
    <div className={`p-3.5 rounded-xl ${colorClass} shrink-0`}>
      <Icon size={22} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">{title}</p>
      <h3 className="text-3xl font-extrabold text-gray-900 tabular-nums">{value ?? '—'}</h3>
      {trend && <p className="text-xs text-gray-400 font-medium mt-0.5">{trend}</p>}
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
    <div className="space-y-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-400 mt-1 text-sm">Real-time statistics and recent activity</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Welcome back</p>
            <p className="font-bold text-gray-900 text-lg">{admin?.name || 'Admin'}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users"    value={mainStats.totalUsers}   icon={Users}       colorClass="bg-blue-50 text-blue-600"     borderColor="border-blue-400"   trend="Registered members" />
          <StatCard title="Restaurants"    value={mainStats.totalVenues}  icon={Store}       colorClass="bg-orange-50 text-orange-600"  borderColor="border-orange-400" trend="Listed venues" />
          <StatCard title="Total Reviews"  value={mainStats.totalReviews} icon={MessageSquare} colorClass="bg-green-50 text-green-600"  borderColor="border-green-400"  trend="User reviews" />
          <StatCard title="Menu Items"     value={mainStats.totalMenus}   icon={MenuIcon}    colorClass="bg-purple-50 text-purple-600"  borderColor="border-purple-400" trend="Across all venues" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trending Restaurants */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Trending Restaurants</h2>
            </div>
            <div className="space-y-4">
              {trendingVenues.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No trending restaurants yet.</p>
              ) : (
                trendingVenues.map((venue, i) => (
                  <div key={venue._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center font-bold text-gray-400">
                        {venue.logo ? <img src={`http://localhost:5000${venue.logo}`} className="w-full h-full object-cover" alt={venue.name} /> : venue.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{venue.name}</h4>
                        <p className="text-sm text-gray-500">{venue.totalReviews} reviews</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md font-bold text-sm">
                      {venue.averageRating.toFixed(1)} <Star size={12} className="fill-current" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Recent Reviews</h2>
            </div>
            <div className="space-y-4">
              {recentReviews.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No reviews submitted yet.</p>
              ) : (
                recentReviews.map(review => (
                  <div key={review._id} className="p-4 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-gray-900">{review.user?.name || 'Unknown'}</span>
                        <span className="text-gray-500 text-sm mx-2">on</span>
                        <span className="font-semibold text-primary">{review.venue?.name || 'Deleted Venue'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
                        {review.rating.overall} <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
