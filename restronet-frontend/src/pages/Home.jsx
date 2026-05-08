import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, UtensilsCrossed, Coffee, Zap, Beer, Sparkles, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

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
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-20 w-full -mt-24 relative z-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-[0.2em] mb-2">
                <Sparkles size={16} /> Made for you
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">
                Recommended For You
              </h2>
              <p className="text-gray-500 mt-2 text-lg font-medium">
                Based on your {user.preferences?.cuisines?.length > 0 ? 'favorite cuisines' : 'tastes'} and Kathmandu's top spots
              </p>
            </motion.div>
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onClick={() => navigate('/search')}
              className="group flex items-center gap-2 bg-white text-gray-900 font-bold px-6 py-3 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
            >
              Explore All <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>

          {loading ? <SectionLoader /> : (
            recommendations.length > 0 ? (
              <div className="relative group">
                <Swiper
                  slidesPerView={1.2}
                  spaceBetween={24}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  navigation={{
                    nextEl: '.swiper-button-next-custom',
                    prevEl: '.swiper-button-prev-custom',
                  }}
                  breakpoints={{
                    640: { slidesPerView: 2.2 },
                    768: { slidesPerView: 3.2 },
                    1024: { slidesPerView: 4 },
                  }}
                  modules={[FreeMode, Navigation, Pagination]}
                  className="pb-12"
                >
                  {recommendations.map((venue, i) => (
                    <SwiperSlide key={venue._id}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <RestaurantCard venue={venue} />
                      </motion.div>
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Custom Navigation Buttons */}
                <button className="swiper-button-prev-custom absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-30 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center text-gray-900 opacity-0 group-hover:opacity-100 group-hover:-translate-x-4 transition-all duration-300 disabled:opacity-0 pointer-events-auto">
                    <ChevronRight className="rotate-180" size={24} />
                </button>
                <button className="swiper-button-next-custom absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-30 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-100 flex items-center justify-center text-gray-900 opacity-0 group-hover:opacity-100 group-hover:translate-x-4 transition-all duration-300 disabled:opacity-0 pointer-events-auto">
                    <ChevronRight size={24} />
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-12 text-center border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils size={24} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">No recommendations yet</h3>
                <p className="text-gray-500">Add some preferences in your profile to see tailored spots!</p>
              </div>
            )
          )}
        </section>
      )}

      {/* ─── TRENDING NOW ─── */}
      <section className={`max-w-7xl mx-auto px-4 md:px-8 pb-32 w-full ${!user ? '-mt-24 relative z-20' : 'pt-10'}`}>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 text-orange-500 font-bold text-sm uppercase tracking-[0.2em] mb-2">
              <Zap size={16} fill="currentColor" /> Hot this week
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">
              Trending Now
            </h2>
            <p className="text-gray-500 mt-2 text-lg font-medium">
              Top rated places everyone is visiting right now
            </p>
          </motion.div>
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate('/search')}
            className="group flex items-center gap-2 bg-white text-gray-900 font-bold px-6 py-3 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
          >
            See Popular <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        {loading ? <SectionLoader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trending.slice(0, 8).map((venue, i) => (
              <motion.div
                key={venue._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <RestaurantCard venue={venue} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ─── EXPLORE CATEGORIES ─── */}
      <section className="bg-white py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Explore by Category</h2>
          <p className="text-gray-500 mb-12 text-lg">Find the perfect dining experience for any occasion</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Fine Dining', Icon: UtensilsCrossed, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', hover: 'hover:border-amber-200 hover:bg-amber-50' },
              { name: 'Cafe',        Icon: Coffee,          iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', hover: 'hover:border-yellow-200 hover:bg-yellow-50' },
              { name: 'Fast Food',   Icon: Zap,             iconBg: 'bg-red-100',    iconColor: 'text-red-500',    hover: 'hover:border-red-200 hover:bg-red-50' },
              { name: 'Pub',         Icon: Beer,            iconBg: 'bg-green-100',  iconColor: 'text-green-600',  hover: 'hover:border-green-200 hover:bg-green-50' },
            ].map(({ name, Icon, iconBg, iconColor, hover }) => (
              <div
                key={name}
                onClick={() => navigate(`/search?q=${name}`)}
                className={`cursor-pointer group flex flex-col items-center p-8 rounded-2xl border border-gray-100 ${hover} transition-all duration-300`}
              >
                <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mb-4`}>
                  <Icon size={28} className={iconColor} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
