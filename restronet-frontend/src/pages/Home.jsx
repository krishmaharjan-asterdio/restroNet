import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';

import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendRes, recRes] = await Promise.all([
        api.get('/venues?sortBy=rating&limit=8'),
        user ? api.get('/recommendations?limit=8') : Promise.resolve({ data: { recommendations: [] } })
      ]);
      setTrending(trendRes.data.docs);
      if (user) {
        setRecommendations(recRes.data.recommendations);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
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

  const SectionLoader = () => (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col w-full bg-gray-50">
      {/* ─── HERO SECTION ─── */}
      <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center bg-gray-900 overflow-hidden">
        {/* Background Image */}
        <motion.div 
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80')" }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-gray-50"></div>
        
        <div className="relative z-10 text-center px-4 max-w-5xl w-full flex flex-col items-center mt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="bg-primary/90 text-white text-sm font-bold uppercase tracking-wider py-1.5 px-4 rounded-full mb-6 inline-block backdrop-blur-sm">
              Discover & Book
            </span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-xl tracking-tight leading-tight"
          >
            Find your next <br className="hidden md:block"/> favorite meal.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl drop-shadow-md font-medium"
          >
            Explore top-rated restaurants, personalized just for you.
          </motion.p>

          <motion.form 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            onSubmit={handleSearch} 
            className="flex w-full max-w-4xl mx-auto bg-white rounded-2xl p-2.5 shadow-2xl items-center"
          >
            <div className="flex-1 flex items-center px-4 md:px-6">
              <Search className="text-gray-400 mr-3" size={24} />
              <input 
                type="text" 
                placeholder="Search for restaurants, cuisines, or dishes..."
                className="w-full h-14 outline-none text-lg text-gray-800 bg-transparent placeholder-gray-400 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="bg-primary hover:bg-primary-hover text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-primary/40 active:scale-95 whitespace-nowrap"
            >
              Search
            </button>
          </motion.form>
        </div>
      </section>

      {/* ─── RECOMMENDATIONS FOR USER ─── */}
      {user && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 w-full -mt-20 relative z-20">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Recommended For You
              </h2>
              <p className="text-gray-600 mt-2 text-lg">
                Based on your preferences and location
              </p>
            </div>
            <button 
              onClick={() => navigate('/search')}
              className="hidden md:flex items-center gap-1 text-primary font-bold hover:underline"
            >
              See all <ChevronRight size={18} />
            </button>
          </div>

          {loading ? <SectionLoader /> : (
            <Swiper
              slidesPerView={1.2}
              spaceBetween={20}
              freeMode={true}
              breakpoints={{
                640: { slidesPerView: 2.2 },
                768: { slidesPerView: 3.2 },
                1024: { slidesPerView: 4 },
              }}
              modules={[FreeMode]}
              className="pb-10"
            >
              {recommendations.map((venue) => (
                <SwiperSlide key={venue._id}>
                  <RestaurantCard venue={venue} />
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </section>
      )}

      {/* ─── TRENDING NOW ─── */}
      <section className={`max-w-7xl mx-auto px-4 md:px-8 pb-24 w-full ${!user ? '-mt-20 relative z-20' : 'pt-10'}`}>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Trending Now <span className="text-2xl">🔥</span>
            </h2>
            <p className="text-gray-600 mt-2 text-lg">
              Highly rated places everyone is talking about
            </p>
          </div>
          <button 
            onClick={() => navigate('/search')}
            className="hidden md:flex items-center gap-1 text-primary font-bold hover:underline"
          >
            See all <ChevronRight size={18} />
          </button>
        </div>

        {loading ? <SectionLoader /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trending.slice(0, 8).map((venue, index) => (
              <RestaurantCard key={venue._id} venue={venue} />
            ))}
          </div>
        )}
      </section>

      {/* ─── EXPLORE CATEGORIES ─── */}
      <section className="bg-white py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-12">Explore by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Fine Dining', 'Cafe', 'Fast Food', 'Pub'].map((cat, i) => (
              <div key={cat} onClick={() => navigate(`/search?q=${cat}`)} className="cursor-pointer group flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/30 hover:bg-orange-50 transition-all duration-300">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4 text-primary">
                  <Compass size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">{cat}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
