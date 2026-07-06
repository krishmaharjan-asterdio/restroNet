import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, ChevronRight, UtensilsCrossed, Coffee,
  Zap, Beer, Sparkles, Utensils, Brain, ArrowUpRight,
} from 'lucide-react';
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

/* ─── Marquee strip data ─────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  'Fine Dining', 'Rooftop Views', 'Authentic Nepali', 'Cafe Culture',
  'Date Night', 'Family Tables', 'Craft Cocktails', 'Seasonal Menus',
  'Hidden Gems', 'Chef Specials', 'Local Flavors', 'Artisan Coffee',
];

/* ─── Site stats ─────────────────────────────────────────────────────────── */
const STATS = [
  { value: '200+', label: 'Restaurants' },
  { value: '4.8★', label: 'Avg Rating' },
  { value: '12k+', label: 'Reservations' },
  { value: '100%', label: 'Local Picks' },
];

/* ─── Category tiles ─────────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    name: 'Fine Dining',
    Icon: UtensilsCrossed,
    span: 'md:col-span-8',
    img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b',
    desc: 'White tablecloths, curated wine lists, unforgettable evenings.',
  },
  {
    name: 'Cafe',
    Icon: Coffee,
    span: 'md:col-span-4',
    img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
    desc: 'Third-wave coffee, quiet corners, creative menus.',
  },
  {
    name: 'Fast Food',
    Icon: Zap,
    span: 'md:col-span-4',
    img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330',
    desc: 'Quick, bold, and deeply satisfying.',
  },
  {
    name: 'Pub',
    Icon: Beer,
    span: 'md:col-span-8',
    img: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c',
    desc: 'Live music, cold pints, and the kind of place you stay too long.',
  },
];

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
const SectionLoader = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
    {[0, 1, 2].map(i => (
      <div key={i} className="h-[480px] skeleton rounded-3xl" />
    ))}
  </div>
);

/* ─── Marquee ────────────────────────────────────────────────────────────── */
const MarqueeStrip = ({ dark = false }) => {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className={`overflow-hidden py-3.5 border-y ${
      dark
        ? 'bg-warm-900 dark:bg-[#100d09] border-warm-800/60 dark:border-white/[0.04]'
        : 'bg-warm-50 dark:bg-surface/30 border-warm-200 dark:border-border'
    }`}>
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-3 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.28em] mx-7 ${
              dark ? 'text-warm-600 dark:text-white/20' : 'text-warm-500 dark:text-muted-foreground'
            }`}
          >
            <span
              className="w-1 h-1 rounded-full shrink-0"
              style={{ background: dark ? 'rgba(250,101,0,0.5)' : '#fa6500' }}
            />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

/* ─── Stats bar ──────────────────────────────────────────────────────────── */
const StatsBar = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.7, delay: 0.2 }}
    className="w-full bg-warm-900 dark:bg-[#0d0b08]"
    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
  >
    <div className="section-container py-5 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">

      {/* Brand mark */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
          <Utensils size={12} className="text-white" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-warm-500 dark:text-white/20">
          RestroNet
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 sm:gap-10">
        {STATS.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div className="w-px h-6 bg-warm-700/50 dark:bg-white/[0.06]" />}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              className="stat-item"
            >
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      {/* Tagline */}
      <p className="hidden lg:block text-[10px] font-semibold tracking-[0.2em] uppercase text-warm-700 dark:text-white/[0.08] shrink-0 italic"
        style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic' }}>
        Kathmandu's&nbsp;Finest&nbsp;Tables
      </p>
    </div>
  </motion.div>
);

/* ─── Section header ─────────────────────────────────────────────────────── */
const SectionHeader = ({ num, eyebrow, title, cta, onCta }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
    <div className="flex items-end gap-5 md:gap-7">
      {/* Oversized editorial number */}
      <span className="section-num leading-none select-none -mb-2">{num}</span>

      <motion.div
        initial={{ opacity: 0, x: -16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="text-label text-warm-500 dark:text-muted-foreground mb-3">
          {eyebrow}
        </div>
        <h2
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          className="text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[1.0] text-warm-900 dark:text-white tracking-tight"
        >
          {title}
        </h2>
      </motion.div>
    </div>

    {cta && (
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        onClick={onCta}
        className="group flex items-center gap-2 text-sm font-semibold text-warm-500 dark:text-muted-foreground hover:text-primary dark:hover:text-primary transition-colors duration-200 shrink-0 pb-1"
      >
        {cta}
        <ArrowUpRight
          size={14}
          strokeWidth={2.5}
          className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </motion.button>
    )}
  </div>
);

/* ─── Stagger variants ───────────────────────────────────────────────────── */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const item = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* ══════════════════════════════════════════════════════════════════════════ */

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
        err => console.warn('Location access denied', err)
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
          api.get(`/venues?sortBy=trending&limit=8${latLng}`),
          user
            ? api.get(`/recommendations?limit=8${latLng}`)
            : Promise.resolve({ data: { recommendations: [] } }),
        ]);
        if (!active) return;
        setTrending(trendRes.data.docs || trendRes.data.recommendations || []);
        if (user) setRecommendations(recRes.data.recommendations || []);
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
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-background">

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative w-full h-[95vh] min-h-[640px] flex items-center justify-center bg-gray-950 overflow-hidden">

        {/* Cinematic background */}
        <motion.div
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=80')",
          }}
        />

        {/* Gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-background dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-primary/5 pointer-events-none" />

        {/* Film grain */}
        <div
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl w-full flex flex-col items-center mt-16">

          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-primary/90 mb-8 bg-white/[0.08] backdrop-blur-md px-5 py-2.5 rounded-full border border-white/[0.12] shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
              The Finest in Kathmandu
            </span>
          </motion.div>

          {/* Headline — word-by-word stagger */}
          <div className="overflow-hidden mb-7">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-0">
              {['Taste', 'the'].map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 48 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                  className="text-[clamp(3.5rem,8vw,7rem)] font-medium text-white leading-[1.0] tracking-[-0.02em] block"
                >
                  {word}
                </motion.span>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                className="text-[clamp(3.5rem,8vw,7rem)] font-medium italic text-white leading-[1.0] tracking-[-0.02em] block"
              >
                Extraordinary.
              </span>
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-base md:text-lg text-white/60 mb-12 max-w-lg leading-relaxed font-light"
          >
            A curated selection of the city's most soulful dining experiences,
            personalized for your palate.
          </motion.p>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.62, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={handleSearch}
            className="flex w-full max-w-3xl mx-auto bg-white dark:bg-card rounded-2xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.3)] items-center border border-white/20 dark:border-border backdrop-blur-sm"
          >
            <div className="flex-1 flex items-center px-4 gap-3">
              <Search className="text-primary shrink-0" size={18} />
              <input
                type="text"
                placeholder="Where should we take you tonight?"
                className="w-full h-12 outline-none text-[15px] text-warm-900 dark:text-foreground bg-transparent placeholder-warm-400 dark:placeholder-muted-foreground"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {/* City label */}
              <span className="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] font-semibold text-warm-400 dark:text-muted-foreground border-l border-warm-200 dark:border-border pl-4">
                <MapPin size={11} className="text-primary/60" />
                Kathmandu
              </span>
            </div>
            <button type="submit" className="btn-primary-hearth h-12 px-7 rounded-xl text-sm font-semibold shrink-0">
              Search
            </button>
          </motion.form>

          {/* Scroll nudge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.8 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/30"
          >
            <span className="text-[9px] uppercase tracking-[0.25em] font-bold">Explore</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.9, ease: 'easeInOut' }}
              className="w-px h-8 bg-gradient-to-b from-white/35 to-transparent"
            />
          </motion.div>
        </div>
      </section>

      {/* ══════════════ STATS BAR ══════════════ */}
      <StatsBar />

      {/* ══════════════ MARQUEE (dark) ══════════════ */}
      <MarqueeStrip dark />

      {/* ══════════════ SECTION 01 — FOR YOU ══════════════ */}
      {user && (
        <section className="section-container py-24 w-full">

          <SectionHeader
            num="01"
            eyebrow={`Personalized for ${user.name?.split(' ')[0] || 'You'}`}
            title={<>Soulful Spots<br /><em>Just for You</em></>}
            cta="View Collection"
            onCta={() => navigate('/discover')}
          />

          {/* Smart pick context */}
          {!loading && recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-10 px-5 py-3.5 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(250,101,0,0.05), rgba(250,150,0,0.03))',
                border: '1px solid rgba(250,101,0,0.13)',
              }}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(250,101,0,0.10)' }}>
                <Brain size={13} style={{ color: '#fa6500' }} />
              </div>
              <p className="text-sm text-warm-600 dark:text-muted-foreground leading-relaxed">
                Curated from your dining history, preferences, and what's trending near you.
              </p>
            </motion.div>
          )}

          {/* Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {[0, 1, 2].map(i => <div key={i} className="h-[480px] skeleton rounded-3xl" />)}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="relative">
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
                      transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <RestaurantCard venue={venue} />
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-card dark:bg-card rounded-3xl border-2 border-dashed border-warm-200 dark:border-border p-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-warm-100 dark:bg-surface flex items-center justify-center mx-auto mb-6">
                <Sparkles size={26} className="text-warm-300 dark:text-muted-foreground" />
              </div>
              <h3
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                className="text-2xl font-medium text-warm-900 dark:text-foreground mb-2"
              >
                Build your palate profile
              </h3>
              <p className="text-warm-500 dark:text-muted-foreground text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                Tell us what you love and we'll surface the perfect spots for you.
              </p>
              <button onClick={() => navigate('/profile')} className="btn-primary-hearth">
                Set Preferences
              </button>
            </motion.div>
          )}
        </section>
      )}

      {/* ══════════════ SECTION 02 — EXPLORE ══════════════ */}
      <section className="py-24 overflow-hidden" style={{ background: 'hsl(var(--surface)/0.4)', borderTop: '1px solid hsl(var(--border))', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="section-container">

          <SectionHeader
            num="02"
            eyebrow="Explore the landscape"
            title={<>Choose<br /><em>your vibe.</em></>}
          />

          {/* Masonry grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-1 md:grid-rows-2 gap-4 md:h-[720px]">
            {CATEGORIES.map(({ name, Icon, span, img, desc }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => navigate(`/search?q=${name}`)}
                className={`cat-card relative group cursor-pointer overflow-hidden rounded-[2rem] ${span} shadow-xl shadow-warm-200/40 dark:shadow-black/40 h-56 md:h-auto`}
              >
                {/* Image */}
                <img
                  src={`${img}?auto=format&fit=crop&w=1200&q=80`}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  alt={name}
                />

                {/* Overlay — shifts to orange on hover */}
                <div className="cat-overlay" />

                {/* Bottom info */}
                <div className="absolute bottom-7 left-7 right-7 text-white z-10">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center mb-3 border border-white/20 shadow-lg group-hover:bg-white/25 transition-colors duration-300">
                        <Icon size={18} />
                      </div>
                      <h3 className="text-xl font-bold tracking-tight drop-shadow-sm">{name}</h3>
                    </div>

                    {/* Description — fades in on hover */}
                    <div className="max-w-[180px] text-right opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-1 group-hover:translate-y-0">
                      <p className="text-xs font-medium text-white/85 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </div>

                {/* Arrow badge */}
                <div className="absolute top-5 right-5 w-8 h-8 bg-white/10 backdrop-blur-md rounded-full border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                  <ChevronRight size={14} className="text-white" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ MARQUEE (light) ══════════════ */}
      <MarqueeStrip />

      {/* ══════════════ SECTION 03 — TRENDING ══════════════ */}
      <section className="section-container py-24 w-full">

        <SectionHeader
          num="03"
          eyebrow="Trending Now"
          title={<>Hot in<br /><em>the City</em></>}
          cta="Discover More"
          onCta={() => navigate('/discover')}
        />

        {loading ? (
          <SectionLoader />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7"
          >
            {trending.slice(0, 6).map((venue, i) => (
              <motion.div key={venue._id} variants={item} className="relative">
                {/* Editorial rank number */}
                <span
                  className="absolute -top-3 -left-1 z-20 font-bold text-[10px] tracking-widest uppercase text-warm-300 dark:text-white/20 select-none"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '11px' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <RestaurantCard venue={venue} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

    </div>
  );
};

export default Home;
