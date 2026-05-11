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
  const [coords, setCoords] = useState(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn("Location access denied", err)
      );
    }
  }, []);

  useEffect(() => {
    let active = true;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const latLng = coords ? `&lat=${coords.lat}&lng=${coords.lng}` : '';
        const [trendRes, recRes] = await Promise.all([
          api.get(`/venues?sortBy=rating&limit=8${latLng}`),
          user ? api.get(`/recommendations?limit=8${latLng}`) : Promise.resolve({ data: { recommendations: [] } })
        ]);
        
        if (!active) return;
        
        setTrending(trendRes.data.docs || trendRes.data.recommendations || []);
        if (user) {
          setRecommendations(recRes.data.recommendations || []);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [user, coords]);

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
    <div className="flex-1 flex flex-col w-full bg-white">
      {/* ─── HERO SECTION ─── */}
      <section className="relative w-full h-[95vh] flex items-center justify-center bg-gray-950 overflow-hidden">
        <motion.div 
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-white"></div>
        
        <div className="relative z-10 text-center px-6 max-w-7xl w-full flex flex-col items-center mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <span className="text-label text-primary mb-6 inline-block bg-primary/10 backdrop-blur-md px-6 py-2 rounded-full border border-primary/20">
              The Finest in Kathmandu
            </span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-[clamp(3.5rem,8vw,6rem)] font-black text-white mb-10 tracking-tighter leading-[0.9] drop-shadow-2xl"
          >
            Taste the <br className="hidden md:block"/> Extraordinary.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-2xl text-white/80 mb-16 max-w-2xl font-medium leading-relaxed"
          >
            A curated selection of the city's most soulful dining experiences, personalized for your palate.
          </motion.p>

          <motion.form 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            onSubmit={handleSearch} 
            className="flex w-full max-w-4xl mx-auto bg-white/95 backdrop-blur-2xl rounded-[3rem] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.3)] items-center border border-white/20"
          >
            <div className="flex-1 flex items-center px-8 border-r border-gray-100">
              <Search className="text-primary mr-5" size={24} />
              <input 
                type="text" 
                placeholder="Where should we take you?"
                className="w-full h-16 outline-none text-xl text-gray-900 bg-transparent placeholder-gray-400 font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary-hearth h-16 px-12 rounded-[2rem] text-lg"
            >
              Search
            </button>
          </motion.form>
        </div>
      </section>

      {/* ─── RECOMMENDATIONS FOR USER ─── */}
      {user && (
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-40 w-full relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <div className="text-label text-primary mb-6">Personalized for {user.name.split(' ')[0]}</div>
              <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter leading-none">
                Soulful Spots <br/> Just for You
              </h2>
            </motion.div>
            <motion.button
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onClick={() => navigate('/discover')}
              className="btn-secondary-hearth h-16 px-10 text-lg border-2"
            >
              View Collection <ChevronRight size={20} />
            </motion.button>
          </div>

          {loading ? <SectionLoader /> : (
            recommendations.length > 0 ? (
              <div className="relative group">
                <Swiper
                  slidesPerView={1.1}
                  spaceBetween={32}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  breakpoints={{
                    1024: { slidesPerView: 2.1 },
                    1280: { slidesPerView: 3 },
                  }}
                  modules={[FreeMode, Navigation, Pagination]}
                  className="pb-20"
                >
                  {recommendations.map((venue, i) => (
                    <SwiperSlide key={venue._id}>
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <RestaurantCard venue={venue} />
                      </motion.div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            ) : (
              <div className="hearth-card p-20 text-center border-dashed border-2">
                <Sparkles size={48} className="text-gray-200 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-gray-900 mb-2">Build your profile</h3>
                <p className="text-gray-500 text-lg mb-8">Tell us what you love and we'll show you the magic.</p>
                <button onClick={() => navigate('/profile')} className="btn-primary-hearth">Update Preferences</button>
              </div>
            )
          )}
        </section>
      )}

      {/* ─── CATEGORY MASONRY ─── */}
      <section className="bg-gray-50 py-40 border-y border-gray-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-24">
            <div className="text-label text-gray-400 mb-6">Explore the landscape</div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">Choose your vibe.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-2 gap-6 h-[800px]">
            {[
              { name: 'Fine Dining', Icon: UtensilsCrossed, color: 'from-amber-500 to-amber-700', span: 'md:col-span-8', img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b' },
              { name: 'Cafe',        Icon: Coffee,          color: 'from-orange-400 to-orange-600', span: 'md:col-span-4', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93' },
              { name: 'Fast Food',   Icon: Zap,             color: 'from-red-500 to-red-700',    span: 'md:col-span-4', img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330' },
              { name: 'Pub',         Icon: Beer,            color: 'from-emerald-500 to-emerald-700', span: 'md:col-span-8', img: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c' },
            ].map(({ name, Icon, color, span, img }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/search?q=${name}`)}
                className={`relative group cursor-pointer overflow-hidden rounded-[2.5rem] ${span} shadow-2xl shadow-gray-200`}
              >
                <img src={`${img}?auto=format&fit=crop&w=1200&q=80`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className={`absolute inset-0 bg-gradient-to-br ${color} mix-blend-multiply opacity-40 group-hover:opacity-20 transition-opacity`} />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-10 left-10 text-white">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
                    <Icon size={32} />
                  </div>
                  <h3 className="text-3xl font-black tracking-tight">{name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRENDING NOW ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-40 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-label text-orange-500 mb-6 flex items-center gap-2">
              <Zap size={14} fill="currentColor" /> Trending Now
            </div>
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter">
              Hot in the City
            </h2>
          </motion.div>
          <motion.button 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate('/discover')}
            className="btn-secondary-hearth h-16 px-10 text-lg border-2"
          >
            Discover More <ChevronRight size={20} />
          </motion.button>
        </div>

        {loading ? <SectionLoader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {trending.slice(0, 8).map((venue, i) => (
              <motion.div
                key={venue._id}
                initial={{ opacity: 0, y: 30 }}
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

    </div>
  );
};

export default Home;
