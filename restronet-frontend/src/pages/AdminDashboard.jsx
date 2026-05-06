import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Store, Star, Menu as MenuIcon } from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="modern-card p-6 flex items-center gap-4">
    <div className={`p-4 rounded-xl ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { admin } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin) fetchDashboard();
  }, [admin]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRebuildVectors = async () => {
    try {
      await api.post('/recommendations/admin/rebuild-vectors');
      alert('Recommendation vectors are rebuilding in the background.');
    } catch (err) {
      console.error(err);
      alert('Failed to rebuild vectors');
    }
  };

  if (!admin) return <Navigate to="/admin/login" />;

  if (loading) return <div className="p-10 text-center">Loading dashboard...</div>;

  const chartData = stats.trendingVenues.map(v => ({
    name: v.name.length > 15 ? v.name.substring(0, 15) + '...' : v.name,
    rating: v.averageRating,
    reviews: v.totalReviews
  }));

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Superadmin Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage RESTRONET platform data</p>
          </div>
          <button 
            onClick={handleRebuildVectors}
            className="btn-primary-modern"
          >
            Rebuild Recommendation Vectors
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={stats.stats.totalUsers} icon={Users} color="bg-blue-500" />
          <StatCard title="Total Restaurants" value={stats.stats.totalVenues} icon={Store} color="bg-primary" />
          <StatCard title="Total Reviews" value={stats.stats.totalReviews} icon={Star} color="bg-green-500" />
          <StatCard title="Total Menus" value={stats.stats.totalMenus} icon={MenuIcon} color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="modern-card p-6">
            <h2 className="text-xl font-bold mb-6">Trending Restaurants (Reviews)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar yAxisId="left" dataKey="reviews" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Reviews" />
                  <Bar yAxisId="right" dataKey="rating" fill="#10b981" radius={[4, 4, 0, 0]} name="Average Rating" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Reviews List */}
          <div className="modern-card p-6">
            <h2 className="text-xl font-bold mb-6">Recent Reviews</h2>
            <div className="space-y-4">
              {stats.recentReviews.map(r => (
                <div key={r._id} className="flex justify-between items-start border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-gray-900">{r.venue?.name}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{r.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">By {r.user?.name}</p>
                  </div>
                  <div className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded text-sm font-bold">
                    {r.rating.overall} <Star size={12} className="ml-1 fill-current" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
