import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { User, Settings, Heart } from 'lucide-react';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  if (!user) return <Navigate to="/login" />;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await api.put('/auth/profile', formData);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setSuccessMsg('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Profile Form */}
          <div className="md:col-span-2 modern-card p-6">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <User className="text-primary" />
              <h2 className="text-xl font-bold">Personal Information</h2>
            </div>

            {successMsg && <div className="bg-green-50 text-green-700 p-3 rounded mb-4">{successMsg}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary/50 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={user.email}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  type="text" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="btn-primary-modern w-full mt-4"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Preferences Summary */}
          <div className="modern-card p-6 h-fit">
            <div className="flex items-center gap-2 mb-6 border-b pb-4">
              <Heart className="text-pink-500" />
              <h2 className="text-xl font-bold">Preferences</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              These preferences help our Content-Based Filtering engine recommend the best restaurants for you.
            </p>

            <div className="space-y-3">
              <div>
                <span className="font-semibold text-sm">Cuisines: </span>
                {user.preferences?.cuisines?.length > 0 
                  ? user.preferences.cuisines.map(c => c.name).join(', ')
                  : <span className="text-gray-400 italic">None set</span>
                }
              </div>
              <div>
                <span className="font-semibold text-sm">Tags: </span>
                {user.preferences?.tags?.length > 0 
                  ? user.preferences.tags.map(t => t.name).join(', ')
                  : <span className="text-gray-400 italic">None set</span>
                }
              </div>
              <button className="text-primary text-sm font-semibold mt-2 hover:underline">
                Update Preferences
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
