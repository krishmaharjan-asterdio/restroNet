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
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col w-full bg-warm-50">

      {/* ─── HERO SECTION ─── */}
      <section className="relative w-full h-[95vh] flex items-center justify-center bg-gray-950 overflow-hidden">
        <motion.div
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-warm-50" />

        <div className="relative z-10 text-center px-6 max-w-5xl w-full flex flex-col items-center mt-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80 mb-8 inline-block bg-white/10 backdrop-blur-md px-5 py-2 rounded-full border border-white/15">
              The Finest in Kathmandu
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            className="text-[clamp(3.5rem,8vw,7rem)] font-medium text-white leading-[1.0] tracking-[-0.01em] mb-8"
          >
            Taste the<br /><em>Extraordinary.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-lg text-white/70 mb-12 max-w-xl leading-relaxed"
          >
            A curated selection of the city's most soulful dining experiences, personalized for your palate.
          </motion.p>

          <motion.form
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            onSubmit={handleSearch}
            className="flex w-full max-w-3xl mx-auto bg-white rounded-2xl p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] items-center border border-white/30"
          >
            <div className="flex-1 flex items-center px-5">
              <Search className="text-primary mr-4 shrink-0" size={20} />
              <input
                type="text"
                placeholder="Where should we take you?"
                className="w-full h-12 outline-none text-base text-warm-900 bg-transparent placeholder-warm-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn-primary-hearth h-12 px-8 rounded-xl text-sm font-semibold"
            >
              Search
            </button>
          </motion.form>
        </div>
      </section>

      {/* ─── RECOMMENDATIONS FOR USER ─── */}
      {user && (
        <section className="max-w-7xl mx-auto px-6 md:px-12 py-24 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <div className="text-label text-warm-500 mb-4">Personalized for {user.name.split(' ')[0]}</div>
              <h2
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
                className="text-[clamp(2.5rem,5vw,4rem)] font-medium leading-tight text-warm-900"
              >
                Soulful Spots<br />Just for You
              </h2>
            </motion.div>
            <motion.button
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              onClick={() => navigate('/discover')}
              className="btn-secondary-hearth h-14 px-8 text-base border-2"
            >
              View Collection <ChevronRight size={18} />
            </motion.button>
          </div>

          {loading ? <SectionLoader /> : (
            recommendations.length > 0 ? (
              <div className="relative group">
                <Swiper
                  slidesPerView={1.1}
                  spaceBetween={28}
                  pagination={{ clickable: true, dynamicBullets: true }}
                  breakpoints={{
                    1024: { slidesPerView: 2.1 },
                    1280: { slidesPerView: 3 },
                  }}
                  modules={[FreeMode, Navigation, Pagination]}
                  className="pb-16"
                >
                  {recommendations.map((venue, i) => (
                    <SwiperSlide key={venue._id}>
                      <motion.div
                        initial={{ opacity: 0, y: 24 }}
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
              <div className="bg-white rounded-2xl border border-warm-200 shadow-card p-16 text-center border-dashed border-2">
                <Sparkles size={40} className="text-warm-200 mx-auto mb-5" />
                <h3 className="text-xl font-bold text-warm-900 mb-2">Build your profile</h3>
                <p className="text-warm-600 text-base mb-7">Tell us what you love and we'll show you the magic.</p>
                <button onClick={() => navigate('/profile')} className="btn-primary-hearth">Update Preferences</button>
              </div>
            )
          )}
        </section>
      )}

      {/* ─── CATEGORY MASONRY ─── */}
      <section className="bg-warm-50 py-24 border-y border-warm-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <div className="text-label text-warm-500 mb-4">Explore the landscape</div>
            <h2
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
              className="text-[clamp(2.5rem,5vw,4rem)] font-medium leading-tight text-warm-900"
            >
              Choose your vibe.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-2 gap-5 h-[760px]">
            {[
              { name: 'Fine Dining', Icon: UtensilsCrossed, span: 'md:col-span-8', img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b' },
              { name: 'Cafe',        Icon: Coffee,          span: 'md:col-span-4', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93' },
              { name: 'Fast Food',   Icon: Zap,             span: 'md:col-span-4', img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330' },
              { name: 'Pub',         Icon: Beer,            span: 'md:col-span-8', img: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c' },
            ].map(({ name, Icon, span, img }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(`/search?q=${name}`)}
                className={`relative group cursor-pointer overflow-hidden rounded-[2rem] ${span} shadow-xl shadow-warm-200/60`}
              >
                <img
                  src={`${img}?auto=format&fit=crop&w=1200&q=80`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  alt={name}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors duration-500" />
                <div className="absolute bottom-8 left-8 text-white">
                  <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center mb-4 border border-white/25">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">{name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRENDING NOW ─── */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-24 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-label text-warm-500 mb-4 flex items-center gap-2">
              <Zap size={13} fill="currentColor" className="text-primary" /> Trending Now
            </div>
            <h2
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
              className="text-[clamp(2.5rem,5vw,4rem)] font-medium leading-tight text-warm-900"
            >
              Hot in the City
            </h2>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => navigate('/discover')}
            className="btn-secondary-hearth h-14 px-8 text-base border-2"
          >
            Discover More <ChevronRight size={18} />
          </motion.button>
        </div>

        {loading ? <SectionLoader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {trending.slice(0, 8).map((venue, i) => (
              <motion.div
                key={venue._id}
                initial={{ opacity: 0, y: 24 }}
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
