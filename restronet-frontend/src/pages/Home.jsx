import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    } else {
      fetchTrending();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recommendations?limit=4');
      setRecommendations(res.data.recommendations);
    } catch (err) {
      console.error('Failed to fetch recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/venues?sortBy=rating&limit=4');
      setRecommendations(res.data.docs);
    } catch (err) {
      console.error('Failed to fetch trending', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full h-[500px] flex items-center justify-center bg-gray-900">
        <div 
          className="absolute inset-0 opacity-40 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="relative z-10 text-center px-4 max-w-4xl w-full animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
            Discover Your Next Favorite Meal
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-10 drop-shadow-md">
            Personalized restaurant recommendations powered by intelligent content-based filtering.
          </p>

          <form onSubmit={handleSearch} className="flex w-full max-w-3xl mx-auto bg-white rounded-full p-2 shadow-2xl">
            <div className="flex-1 flex items-center px-4 border-r border-gray-200">
              <Search className="text-gray-400 mr-2" size={24} />
              <input 
                type="text" 
                placeholder="Search for restaurants, cuisines, or dishes..."
                className="w-full h-12 outline-none text-lg text-gray-800 bg-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-full transition-colors h-12 flex items-center">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Recommendations / Trending Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 w-full">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {user ? 'Recommended For You' : 'Trending Now'}
            </h2>
            <p className="text-gray-500 mt-2">
              {user ? 'Based on your cuisine and tag preferences' : 'Highly rated restaurants in your area'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/search')}
            className="text-primary font-semibold hover:underline"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((venue, index) => (
              <div key={venue._id || venue.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <RestaurantCard venue={venue} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
