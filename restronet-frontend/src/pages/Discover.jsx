import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, MapPin, Loader2, X, ChevronDown,
  Sparkles, Navigation, RefreshCw, Star, Utensils
} from 'lucide-react';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';

// ─── Static data ──────────────────────────────────────────────────────────────

const PRICE_OPTIONS = [
  { value: 1, label: 'Value',    symbol: '💰',    desc: 'Budget friendly' },
  { value: 2, label: 'Standard', symbol: '💰💰', desc: 'Moderate' },
  { value: 3, label: 'Premium',  symbol: '💎',    desc: 'Upscale' },
  { value: 4, label: 'Elite',    symbol: '💎💎', desc: 'Luxury' },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

const FilterChip = ({ label, onRemove, color }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 ${color}`}>
    {label}
    <button onClick={onRemove} className="hover:opacity-70 transition-opacity ml-0.5">
      <X size={11} />
    </button>
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white rounded-3xl border border-warm-200 overflow-hidden animate-pulse">
    <div className="h-52 bg-warm-200" />
    <div className="p-5 space-y-3">
      <div className="h-5 bg-warm-200 rounded-md w-3/4" />
      <div className="h-4 bg-warm-100 rounded-md w-1/2" />
      <div className="flex gap-2 pt-1">
        <div className="h-6 bg-warm-100 rounded-full w-16" />
        <div className="h-6 bg-warm-100 rounded-full w-20" />
      </div>
      <div className="h-px bg-warm-100 mt-2" />
      <div className="h-4 bg-warm-100 rounded-md w-1/3" />
    </div>
  </div>
);

const EmptyState = ({ hasFilters, onClear }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-28 text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-warm-100 border border-warm-200 flex items-center justify-center mb-5">
      <Utensils size={28} className="text-warm-400" />
    </div>
    <h3 className="text-xl font-semibold text-warm-600 mb-2" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
      No restaurants found
    </h3>
    <p className="text-warm-400 max-w-xs text-sm mb-6 leading-relaxed">
      {hasFilters
        ? 'Try adjusting your filters — we might have something close to what you\'re looking for.'
        : 'No restaurants are available right now. Check back soon!'}
    </p>
    {hasFilters && (
      <button
        onClick={onClear}
        className="flex items-center gap-2 bg-primary text-white font-semibold py-2.5 px-6 rounded-full hover:bg-primary/90 transition-colors text-sm"
      >
        <RefreshCw size={14} /> Clear Filters
      </button>
    )}
  </motion.div>
);

// ─── Filter Sidebar Content ───────────────────────────────────────────────────

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
    {/* Sidebar header */}
    <div className="px-6 pt-6 pb-4 border-b border-warm-100">
      <div className="flex items-center justify-between mb-1">
        <h1
          className="text-2xl font-medium text-warm-600"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
        >
          Discover
        </h1>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-warm-500 hover:text-primary transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      <p className="text-sm text-warm-400">Find your perfect spot</p>
    </div>

    {/* Filter sections */}
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

      {/* ── Cuisine ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-warm-500 mb-3">Cuisine</p>
        <div className="flex flex-wrap gap-2">
          {cuisines.map(c => {
            const active = selectedCuisines.includes(c._id);
            return (
              <button
                key={c._id}
                onClick={() => toggleCuisine(c._id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                  active
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white border-warm-200 text-warm-700 hover:border-primary/40'
                }`}
              >
                {c.icon && <span className="mr-1">{c.icon}</span>}
                {c.name}
              </button>
            );
          })}
          {cuisines.length === 0 && (
            <p className="text-sm text-warm-400 italic">Loading cuisines…</p>
          )}
        </div>
      </div>

      <div className="border-t border-warm-100" />

      {/* ── Price Range ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-warm-500 mb-3">Price Range</p>
        <div className="flex gap-2">
          {PRICE_OPTIONS.map(opt => {
            const active = selectedPrices.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => togglePrice(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 text-center transition-all duration-150 ${
                  active
                    ? 'bg-warm-900 border-warm-900 text-white'
                    : 'bg-white border-warm-200 text-warm-600 hover:border-warm-400'
                }`}
              >
                <span className="block text-base leading-none mb-0.5">{opt.symbol}</span>
                <span className="block text-[10px] font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-warm-100" />

      {/* ── Mood & Vibe ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-warm-500 mb-3">Mood & Vibe</p>
        <div className="grid grid-cols-2 gap-2">
          {MOODS.map(mood => {
            const active = selectedMood === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => toggleMood(mood.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-150 cursor-pointer text-left ${
                  active
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-white border-warm-200 text-warm-700 hover:border-warm-300'
                }`}
              >
                <span className="text-base leading-none shrink-0">{mood.emoji}</span>
                <span className="text-xs font-medium leading-tight">{mood.label}</span>
                {active && <X size={11} className="ml-auto text-primary/70 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-warm-100" />

      {/* ── Location ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-warm-500 mb-3">Location</p>

        {!locationEnabled ? (
          <button
            onClick={requestLocation}
            className="flex items-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-warm-300 text-warm-600 hover:border-primary/40 hover:text-primary transition-all text-sm font-medium"
          >
            <Navigation size={15} />
            Use my location
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                <span className="text-sm font-medium text-primary">Location active</span>
              </div>
              <button onClick={disableLocation} className="text-primary/60 hover:text-primary transition-colors">
                <X size={14} />
              </button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-warm-600">Max Distance</span>
                <span className="text-xs font-bold text-primary">{maxDistance} km</span>
              </div>
              <div className="flex gap-1.5">
                {DISTANCE_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setMaxDistance(d)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      maxDistance === d
                        ? 'bg-warm-900 text-white'
                        : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                    }`}
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

  // Active filters
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedPrices, setSelectedPrices]     = useState([]);
  const [selectedMood, setSelectedMood]         = useState(null);
  const [locationEnabled, setLocationEnabled]   = useState(false);
  const [userCoords, setUserCoords]             = useState(null);
  const [locationError, setLocationError]       = useState(null);
  const [maxDistance, setMaxDistance]           = useState(10);
  const [aiExplanation, setAiExplanation]       = useState(null);

  const debounceRef = useRef(null);

  // Load cuisines and auto-request location on mount
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

  // Fetch recommendations with debounce whenever filters change
  useEffect(() => {
    let active = true;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCuisines.length) params.set('cuisines', selectedCuisines.join(','));
        if (selectedPrices.length)   params.set('priceRange', selectedPrices.join(','));
        if (selectedMood)            params.set('mood', selectedMood);
        if (userCoords) {
          params.set('lat', userCoords.lat);
          params.set('lng', userCoords.lng);
          params.set('maxDistance', maxDistance);
        }
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
  }, [selectedCuisines, selectedPrices, selectedMood, userCoords, maxDistance]);

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
    setSelectedCuisines(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const togglePrice = val => {
    setSelectedPrices(prev =>
      prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]
    );
  };

  const toggleMood = id => {
    setSelectedMood(prev => (prev === id ? null : id));
  };

  const clearAllFilters = () => {
    setSelectedCuisines([]);
    setSelectedPrices([]);
    setSelectedMood(null);
    setMaxDistance(10);
  };

  const activeFilterCount =
    selectedCuisines.length +
    selectedPrices.length +
    (selectedMood ? 1 : 0) +
    (locationEnabled ? 1 : 0);

  const activeMood = MOODS.find(m => m.id === selectedMood);

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
    <div className="min-h-screen bg-warm-50 flex">

      {/* ─── LEFT SIDEBAR (desktop) ─── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-white border-r border-warm-200 h-screen sticky top-0 overflow-y-auto">
        <FilterSidebarContent {...sidebarProps} />
      </aside>

      {/* ─── MOBILE FILTER SHEET OVERLAY ─── */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] flex flex-col lg:hidden"
            >
              {/* Sheet drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-warm-200" />
              </div>
              <div className="flex items-center justify-between px-6 py-3 border-b border-warm-100 shrink-0">
                <span className="font-semibold text-warm-600 text-sm">Filters</span>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
                >
                  <X size={18} className="text-warm-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <FilterSidebarContent {...sidebarProps} />
              </div>
              <div className="p-4 border-t border-warm-100 shrink-0">
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="w-full py-3 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors"
                >
                  Show {results.length} results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <div className="bg-white border-b border-warm-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div>
            {!initialLoad && (
              <p className="text-sm font-medium text-warm-600">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    Finding restaurants…
                  </span>
                ) : (
                  <span>
                    <span className="font-bold text-warm-600">{results.length}</span> restaurants found
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Mobile filter trigger */}
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl border border-warm-200 bg-white text-sm font-medium text-warm-700 hover:border-primary/40 hover:text-primary transition-all"
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center -ml-0.5">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 px-6 py-6">

          {/* AI explanation */}
          <AnimatePresence>
            {aiExplanation && !loading && (
              <motion.div
                key="ai-explanation"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5"
              >
                <Sparkles size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 leading-relaxed">{aiExplanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filter chips */}
          {(selectedMood || selectedCuisines.length > 0 || selectedPrices.length > 0 || locationEnabled) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none"
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
                    color="bg-warm-100 text-warm-700 border-warm-200"
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
                  color="bg-warm-100 text-warm-700 border-warm-200"
                />
              )}
              {activeFilterCount > 1 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-warm-500 hover:text-primary transition-colors shrink-0 ml-1"
                >
                  Clear all
                </button>
              )}
            </motion.div>
          )}

          {/* Loading skeleton */}
          {(loading || initialLoad) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Results grid */}
          {!loading && !initialLoad && results.length > 0 && (
            <motion.div
              key={`${selectedMood}-${selectedCuisines.join()}-${selectedPrices.join()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {results.map((venue, i) => (
                <motion.div
                  key={venue._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4) }}
                >
                  <RestaurantCard venue={venue} showScoreBreakdown />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && !initialLoad && results.length === 0 && (
            <EmptyState
              hasFilters={activeFilterCount > 0}
              onClear={clearAllFilters}
            />
          )}
        </div>
      </main>

      {/* ─── MOBILE STICKY FILTER BUTTON ─── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 lg:hidden">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3 bg-warm-900 text-white rounded-full shadow-xl text-sm font-semibold"
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center -ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

    </div>
  );
};

export default Discover;
