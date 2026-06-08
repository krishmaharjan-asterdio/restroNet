import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, MapPin, Loader2, X, ChevronDown,
  Sparkles, Navigation, RefreshCw, Star, Utensils, Compass,
  Search, Brain
} from 'lucide-react';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';

// ─── Static data ──────────────────────────────────────────────────────────────

const PRICE_OPTIONS = [
  { value: 1, label: 'Value',    symbol: '$',    desc: 'Budget friendly' },
  { value: 2, label: 'Standard', symbol: '$$',   desc: 'Moderate' },
  { value: 3, label: 'Premium',  symbol: '$$$',  desc: 'Upscale' },
  { value: 4, label: 'Elite',    symbol: '$$$$', desc: 'Luxury' },
];

const MOODS = [
  { id: 'romantic',        label: 'Romantic',       emoji: '💑' },
  { id: 'family-friendly', label: 'Family',         emoji: '👨‍👩‍👧' },
  { id: 'cafe',            label: 'Cafe & Coffee',  emoji: '☕' },
  { id: 'luxury',          label: 'Luxury Dining',  emoji: '✨' },
  { id: 'nightlife',       label: 'Nightlife',      emoji: '🍺' },
  { id: 'casual',          label: 'Casual Hangout', emoji: '😎' },
  { id: 'work-friendly',   label: 'Work Friendly',  emoji: '💻' },
  { id: 'aesthetic',       label: 'Aesthetic',      emoji: '📸' },
];

const DISTANCE_OPTIONS = [5, 10, 20, 30, 50];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating',      label: 'Top Rated' },
  { value: 'distance',    label: 'Nearest' },
  { value: 'price_asc',   label: 'Price: Low → High' },
  { value: 'price_desc',  label: 'Price: High → Low' },
];

/* Hero tags wired to mood/cuisine filter */
const HERO_FOOD_TAGS = [
  { label: 'Fine Dining', emoji: '🍽️', moodId: 'luxury' },
  { label: 'Cafe',        emoji: '☕', moodId: 'cafe' },
  { label: 'Fast Food',   emoji: '🍔', moodId: 'casual' },
  { label: 'Desserts',    emoji: '🍰', moodId: null },
  { label: 'Pub & Bar',   emoji: '🍺', moodId: 'nightlife' },
  { label: 'Rooftop',     emoji: '🌆', moodId: 'aesthetic' },
  { label: 'Vegan',       emoji: '🥗', moodId: null },
  { label: 'Romantic',    emoji: '💑', moodId: 'romantic' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const FilterChip = ({ label, onRemove, color }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${color}`}>
    {label}
    <button onClick={onRemove} className="hover:opacity-70 transition-opacity ml-0.5">
      <X size={11} />
    </button>
  </div>
);

const SkeletonCard = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="rounded-3xl overflow-hidden"
    style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
  >
    <div className="skeleton h-52 rounded-none" />
    <div className="p-5 space-y-3">
      <div className="skeleton h-5 rounded-md w-3/4" />
      <div className="skeleton h-4 rounded-md w-1/2" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-6 rounded-full w-16" />
        <div className="skeleton h-6 rounded-full w-20" />
      </div>
      <div className="skeleton h-px w-full mt-2" />
      <div className="skeleton h-4 rounded-md w-1/3" />
    </div>
  </motion.div>
);

const EmptyState = ({ hasFilters, onClear }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col items-center justify-center py-28 text-center"
  >
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
      style={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))' }}
    >
      <Compass size={32} className="text-muted-foreground" />
    </div>
    <h3
      className="text-2xl font-medium mb-2"
      style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', color: 'hsl(var(--foreground))' }}
    >
      No restaurants found
    </h3>
    <p className="text-muted-foreground max-w-xs text-sm mb-7 leading-relaxed">
      {hasFilters
        ? "Try adjusting your filters — we might have something close to what you're looking for."
        : 'No restaurants are available right now. Check back soon!'}
    </p>
    {hasFilters && (
      <button onClick={onClear} className="btn-primary text-sm px-6 py-2.5">
        <RefreshCw size={14} /> Clear Filters
      </button>
    )}
  </motion.div>
);

const FilterSidebarContent = ({
  cuisines,
  selectedCuisines, toggleCuisine,
  selectedPrices, togglePrice,
  selectedMood, toggleMood,
  locationEnabled, locationError,
  maxDistance, setMaxDistance,
  requestLocation, disableLocation,
  clearAllFilters,
  activeFilterCount,
}) => (
  <div className="flex flex-col h-full">
    <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <div className="flex items-center justify-between mb-1">
        <h2
          className="text-2xl font-medium"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', color: 'hsl(var(--foreground))' }}
        >
          Filters
        </h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold transition-colors hover:text-primary"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            Clear all
          </button>
        )}
      </div>
      <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Find your perfect spot</p>
    </div>

    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

      {/* ── Cuisine ── */}
      <div>
        <p className="text-label mb-3">Cuisine</p>
        <div className="flex flex-wrap gap-2">
          {cuisines.map(c => {
            const active = selectedCuisines.includes(c._id);
            return (
              <button
                key={c._id}
                onClick={() => toggleCuisine(c._id)}
                className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150"
                style={{
                  background: active ? '#fa6500' : 'hsl(var(--card))',
                  borderColor: active ? '#fa6500' : 'hsl(var(--border))',
                  color: active ? '#ffffff' : 'hsl(var(--foreground))',
                }}
              >
                {c.icon && <span className="mr-1">{c.icon}</span>}
                {c.name}
              </button>
            );
          })}
          {cuisines.length === 0 && (
            <p className="text-sm italic" style={{ color: 'hsl(var(--muted-foreground))' }}>Loading cuisines…</p>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--border))' }} />

      {/* ── Price Range ── */}
      <div>
        <p className="text-label mb-3">Price Range</p>
        <div className="flex gap-2">
          {PRICE_OPTIONS.map(opt => {
            const active = selectedPrices.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => togglePrice(opt.value)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-center transition-all duration-150"
                style={{
                  background: active ? 'hsl(var(--foreground))' : 'hsl(var(--card))',
                  borderColor: active ? 'hsl(var(--foreground))' : 'hsl(var(--border))',
                  color: active ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
                }}
              >
                <span className="block text-base leading-none mb-0.5 font-bold">{opt.symbol}</span>
                <span className="block text-[10px] font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--border))' }} />

      {/* ── Mood & Vibe ── */}
      <div>
        <p className="text-label mb-3">Mood & Vibe</p>
        <div className="grid grid-cols-2 gap-2">
          {MOODS.map(mood => {
            const active = selectedMood === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => toggleMood(mood.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 cursor-pointer text-left"
                style={{
                  background: active ? 'rgba(250,101,0,0.08)' : 'hsl(var(--card))',
                  borderColor: active ? 'rgba(250,101,0,0.3)' : 'hsl(var(--border))',
                  color: active ? '#fa6500' : 'hsl(var(--foreground))',
                }}
              >
                <span className="text-base leading-none shrink-0">{mood.emoji}</span>
                <span className="text-xs font-medium leading-tight">{mood.label}</span>
                {active && <X size={11} className="ml-auto shrink-0" style={{ color: 'rgba(250,101,0,0.7)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid hsl(var(--border))' }} />

      {/* ── Location ── */}
      <div>
        <p className="text-label mb-3">Location</p>

        {!locationEnabled ? (
          <button
            onClick={requestLocation}
            className="flex items-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed text-sm font-medium transition-all hover:border-primary/40 hover:text-primary"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
          >
            <Navigation size={15} />
            Use my location
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
              style={{ background: 'rgba(250,101,0,0.06)', border: '1px solid rgba(250,101,0,0.2)' }}>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: '#fa6500' }} />
                <span className="text-sm font-medium" style={{ color: '#fa6500' }}>Location active</span>
              </div>
              <button onClick={disableLocation} className="text-primary/60 hover:text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Max Distance</span>
                <span className="text-xs font-bold" style={{ color: '#fa6500' }}>{maxDistance} km</span>
              </div>
              <div className="flex gap-1.5">
                {DISTANCE_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setMaxDistance(d)}
                    className="flex-1 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      background: maxDistance === d ? 'hsl(var(--foreground))' : 'hsl(var(--surface))',
                      color: maxDistance === d ? 'hsl(var(--background))' : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {locationError && (
          <p className="text-xs text-red-500 mt-2 font-medium">{locationError}</p>
        )}
      </div>

    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const Discover = () => {
  const [cuisines, setCuisines]           = useState([]);
  const [results, setResults]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [initialLoad, setInitialLoad]     = useState(true);
  const [filtersOpen, setFiltersOpen]     = useState(false);
  const [sortOpen, setSortOpen]           = useState(false);
  const [sortBy, setSortBy]               = useState('recommended');

  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedPrices, setSelectedPrices]     = useState([]);
  const [selectedMood, setSelectedMood]         = useState(null);
  const [locationEnabled, setLocationEnabled]   = useState(false);
  const [userCoords, setUserCoords]             = useState(null);
  const [locationError, setLocationError]       = useState(null);
  const [maxDistance, setMaxDistance]           = useState(10);
  const [aiExplanation, setAiExplanation]       = useState(null);
  const [trendingOnly, setTrendingOnly]         = useState(false);

  const debounceRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    api.get('/metadata/cuisines').then(res => {
      setCuisines(res.data.cuisines || []);
    }).catch(() => {});

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationEnabled(true);
        },
        err => console.warn('Location denied', err)
      );
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Fetch whenever any filter or sort changes */
  useEffect(() => {
    let active = true;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCuisines.length) params.set('cuisines', selectedCuisines.join(','));
        if (selectedPrices.length)   params.set('priceRange', selectedPrices.join(','));
        if (selectedMood)            params.set('mood', selectedMood);
        if (sortBy !== 'recommended') params.set('sortBy', sortBy);
        if (userCoords) {
          params.set('lat', userCoords.lat);
          params.set('lng', userCoords.lng);
          params.set('maxDistance', maxDistance);
        }
        if (trendingOnly) params.set('isTrending', 'true');
        params.set('limit', '24');

        const res = await api.get(`/recommendations/smart?${params.toString()}`);
        if (!active) return;

        setResults(res.data.recommendations || []);
        setAiExplanation(res.data.aiExplanation || null);
      } catch (err) {
        console.error('Fetch failed', err);
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    };

    const timer = setTimeout(fetchRecommendations, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedCuisines, selectedPrices, selectedMood, userCoords, maxDistance, sortBy, trendingOnly]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationEnabled(true);
        setLocationError(null);
      },
      () => {
        setLocationError('Unable to get your location. Please allow location access.');
        setLocationEnabled(false);
      }
    );
  };

  const disableLocation = () => {
    setLocationEnabled(false);
    setUserCoords(null);
    setLocationError(null);
  };

  const toggleCuisine = id => {
    setSelectedCuisines(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const togglePrice = val => {
    setSelectedPrices(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]);
  };

  const toggleMood = id => {
    setSelectedMood(prev => (prev === id ? null : id));
  };

  /* Wire hero tag click to mood filter */
  const handleHeroTagClick = (tag) => {
    if (tag.moodId) {
      toggleMood(tag.moodId);
    }
  };

  const clearAllFilters = () => {
    setSelectedCuisines([]);
    setSelectedPrices([]);
    setSelectedMood(null);
    setMaxDistance(10);
    setTrendingOnly(false);
  };

  const activeFilterCount =
    selectedCuisines.length +
    selectedPrices.length +
    (selectedMood ? 1 : 0) +
    (locationEnabled ? 1 : 0) +
    (trendingOnly ? 1 : 0);

  const activeMood = MOODS.find(m => m.id === selectedMood);
  const activeSortLabel = SORT_OPTIONS.find(s => s.value === sortBy)?.label || 'Recommended';

  const sidebarProps = {
    cuisines,
    selectedCuisines, toggleCuisine,
    selectedPrices, togglePrice,
    selectedMood, toggleMood,
    locationEnabled, locationError,
    maxDistance, setMaxDistance,
    requestLocation, disableLocation,
    clearAllFilters,
    activeFilterCount,
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(var(--background))' }}>

      {/* ─── LEFT SIDEBAR (desktop) ─── */}
      <aside
        className="hidden lg:flex flex-col w-72 shrink-0 h-screen sticky top-0 overflow-y-auto"
        style={{ background: 'hsl(var(--card))', borderRight: '1px solid hsl(var(--border))' }}
      >
        <FilterSidebarContent {...sidebarProps} />
      </aside>

      {/* ─── MOBILE FILTER SHEET ─── */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[85vh] flex flex-col lg:hidden"
              style={{ background: 'hsl(var(--card))' }}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'hsl(var(--border))' }} />
              </div>
              <div className="flex items-center justify-between px-6 py-3 shrink-0"
                style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <span className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>Filters</span>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <FilterSidebarContent {...sidebarProps} />
              </div>
              <div className="p-4 shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full text-sm">
                  Show {results.length} results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* ── HERO BANNER ── */}
        <div className="relative h-[280px] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80&auto=format&fit=crop')`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(10,8,5,0.55) 0%, rgba(10,8,5,0.72) 60%, rgba(10,8,5,0.92) 100%)',
            }}
          />
          {/* Grain texture */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px',
            }}
          />

          <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3"
              style={{ color: 'rgba(250,101,0,0.8)' }}
            >
              ✦ Curated Discovery
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[clamp(2.2rem,5.5vw,3.75rem)] font-medium leading-[1.02] text-white mb-2.5"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '-0.01em' }}
            >
              Kathmandu's <em>Finest</em>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
              className="text-sm font-medium mb-6"
              style={{ color: 'rgba(255,255,255,0.48)' }}
            >
              Every mood · Every craving · Every occasion
            </motion.p>

            {/* Food category tags — wired to mood filter */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="flex gap-2 overflow-x-auto scrollbar-hide px-2"
              style={{ maxWidth: '100%' }}
            >
              {HERO_FOOD_TAGS.map((tag, i) => {
                const isActive = tag.moodId && selectedMood === tag.moodId;
                return (
                  <motion.button
                    key={tag.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.35 + i * 0.04 }}
                    onClick={() => handleHeroTagClick(tag)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all duration-200 hover:scale-105"
                    style={{
                      background: isActive ? 'rgba(250,101,0,0.7)' : 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${isActive ? 'rgba(250,101,0,0.8)' : 'rgba(255,255,255,0.18)'}`,
                      color: 'rgba(255,255,255,0.9)',
                      cursor: tag.moodId ? 'pointer' : 'default',
                    }}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* ── STICKY FILTER BAR ── */}
        <div
          className="sticky top-0 z-30 px-5 md:px-8"
          style={{
            background: 'hsl(var(--card))',
            borderBottom: '1px solid hsl(var(--border))',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">

              {/* Mobile filter trigger */}
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all"
                style={{
                  background: activeFilterCount > 0 ? '#fa6500' : 'hsl(var(--surface))',
                  color: activeFilterCount > 0 ? '#fff' : 'hsl(var(--foreground))',
                  border: `1px solid ${activeFilterCount > 0 ? '#fa6500' : 'hsl(var(--border))'}`,
                }}
              >
                <SlidersHorizontal size={13} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Price chips */}
              {PRICE_OPTIONS.map(opt => {
                const active = selectedPrices.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => togglePrice(opt.value)}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all duration-200"
                    style={{
                      background: active ? '#fa6500' : 'hsl(var(--surface))',
                      color: active ? '#ffffff' : 'hsl(var(--muted-foreground))',
                      border: `1px solid ${active ? '#fa6500' : 'hsl(var(--border))'}`,
                      boxShadow: active ? '0 4px 14px rgba(250,101,0,0.18)' : 'none',
                    }}
                  >
                    {opt.symbol} {opt.label}
                  </button>
                );
              })}

              {/* Mood chips */}
              {MOODS.slice(0, 5).map(mood => {
                const active = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    onClick={() => toggleMood(mood.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all duration-200"
                    style={{
                      background: active ? '#fa6500' : 'hsl(var(--surface))',
                      color: active ? '#ffffff' : 'hsl(var(--muted-foreground))',
                      border: `1px solid ${active ? '#fa6500' : 'hsl(var(--border))'}`,
                      boxShadow: active ? '0 4px 14px rgba(250,101,0,0.18)' : 'none',
                    }}
                  >
                    <span>{mood.emoji}</span>
                    {mood.label}
                  </button>
                );
              })}

              {/* Location chip */}
              <button
                onClick={locationEnabled ? disableLocation : requestLocation}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all duration-200"
                style={{
                  background: locationEnabled ? '#fa6500' : 'hsl(var(--surface))',
                  color: locationEnabled ? '#ffffff' : 'hsl(var(--muted-foreground))',
                  border: `1px solid ${locationEnabled ? '#fa6500' : 'hsl(var(--border))'}`,
                  boxShadow: locationEnabled ? '0 4px 14px rgba(250,101,0,0.18)' : 'none',
                }}
              >
                <MapPin size={12} />
                {locationEnabled ? `Within ${maxDistance} km` : 'Nearby'}
              </button>

              {/* Trending chip */}
              <button
                onClick={() => setTrendingOnly(prev => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all duration-200"
                style={{
                  background: trendingOnly ? '#fa6500' : 'hsl(var(--surface))',
                  color: trendingOnly ? '#ffffff' : 'hsl(var(--muted-foreground))',
                  border: `1px solid ${trendingOnly ? '#fa6500' : 'hsl(var(--border))'}`,
                  boxShadow: trendingOnly ? '0 4px 14px rgba(250,101,0,0.18)' : 'none',
                }}
              >
                🔥 Trending
              </button>
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0" ref={sortRef}>
              <button
                onClick={() => setSortOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200"
                style={{
                  background: sortBy !== 'recommended' ? '#fa6500' : 'hsl(var(--surface))',
                  color: sortBy !== 'recommended' ? '#fff' : 'hsl(var(--foreground))',
                  border: `1px solid ${sortBy !== 'recommended' ? '#fa6500' : 'hsl(var(--border))'}`,
                }}
              >
                {activeSortLabel}
                <ChevronDown
                  size={13}
                  style={{ transform: sortOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                />
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-50"
                    style={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                    }}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-surface"
                        style={{
                          background: sortBy === opt.value ? 'rgba(250,101,0,0.08)' : 'transparent',
                          color: sortBy === opt.value ? '#fa6500' : 'hsl(var(--foreground))',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── RESULTS AREA ── */}
        <div className="flex-1 px-5 md:px-8 py-6">

          {/* AI explanation banner — improved */}
          <AnimatePresence>
            {aiExplanation && !loading && (
              <motion.div
                key="ai-explanation"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex items-start gap-3 rounded-2xl px-5 py-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(250,101,0,0.06) 0%, rgba(250,150,0,0.04) 100%)',
                  border: '1px solid rgba(250,101,0,0.18)',
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Brain size={14} style={{ color: '#fa6500' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: 'rgba(250,101,0,0.7)' }}>
                    Smart Pick
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground))', opacity: 0.8 }}>
                    {aiExplanation}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter chips row */}
          {(selectedMood || selectedCuisines.length > 0 || selectedPrices.length > 0 || locationEnabled || trendingOnly) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide"
            >
              {activeMood && (
                <FilterChip
                  label={`${activeMood.emoji} ${activeMood.label}`}
                  onRemove={() => setSelectedMood(null)}
                  color="bg-primary/10 text-primary border-primary/20"
                />
              )}
              {selectedPrices.map(p => {
                const opt = PRICE_OPTIONS.find(o => o.value === p);
                return (
                  <FilterChip
                    key={p}
                    label={`${opt.symbol} ${opt.label}`}
                    onRemove={() => togglePrice(p)}
                    color="bg-surface text-foreground border-border"
                  />
                );
              })}
              {cuisines.filter(c => selectedCuisines.includes(c._id)).map(c => (
                <FilterChip
                  key={c._id}
                  label={c.name}
                  onRemove={() => toggleCuisine(c._id)}
                  color="bg-primary/10 text-primary border-primary/20"
                />
              ))}
              {locationEnabled && (
                <FilterChip
                  label={`📍 Within ${maxDistance} km`}
                  onRemove={disableLocation}
                  color="bg-surface text-foreground border-border"
                />
              )}
              {trendingOnly && (
                <FilterChip
                  label="🔥 Trending"
                  onRemove={() => setTrendingOnly(false)}
                  color="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50"
                />
              )}
              {activeFilterCount > 1 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold shrink-0 ml-1 text-muted-foreground hover:text-primary transition-colors"
                >
                  Clear all
                </button>
              )}
            </motion.div>
          )}

          {/* Result count + sort indicator */}
          {!loading && !initialLoad && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between mb-5"
            >
              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {results.length} restaurant{results.length !== 1 ? 's' : ''} found
                {activeFilterCount > 0 && ' · filtered results'}
              </p>
              {sortBy !== 'recommended' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Sorted: {activeSortLabel}
                </span>
              )}
            </motion.div>
          )}

          {/* Inline loading indicator (not initial) */}
          {loading && !initialLoad && (
            <div className="flex items-center gap-2 mb-5">
              <Loader2 size={14} className="animate-spin" style={{ color: '#fa6500' }} />
              <span className="text-xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Finding restaurants…
              </span>
            </div>
          )}

          {/* Loading skeletons */}
          {(loading || initialLoad) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} delay={i * 0.07} />
              ))}
            </div>
          )}

          {/* Results grid */}
          {!loading && !initialLoad && results.length > 0 && (
            <motion.div
              key={`${selectedMood}-${selectedCuisines.join()}-${selectedPrices.join()}-${sortBy}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {results.map((venue, i) => (
                <motion.div
                  key={venue._id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: Math.min(i * 0.055, 0.45), ease: [0.22, 1, 0.36, 1] }}
                >
                  <RestaurantCard venue={venue} showScoreBreakdown />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && !initialLoad && results.length === 0 && (
            <EmptyState hasFilters={activeFilterCount > 0} onClear={clearAllFilters} />
          )}
        </div>
      </main>

      {/* ─── MOBILE STICKY FILTER BUTTON ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 lg:hidden">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-semibold"
          style={{
            background: 'hsl(var(--foreground))',
            color: 'hsl(var(--background))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          }}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span
              className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center -ml-0.5"
              style={{ background: '#fa6500', color: '#ffffff' }}
            >
              {activeFilterCount}
            </span>
          )}
        </motion.button>
      </div>

    </div>
  );
};

export default Discover;
