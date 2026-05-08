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
  { value: 1, label: 'Budget',  symbol: '₹',    desc: 'Under 500 NPR'   },
  { value: 2, label: 'Mid',     symbol: '₹₹',   desc: '500 – 1500 NPR'  },
  { value: 3, label: 'Premium', symbol: '₹₹₹',  desc: '1500 – 3000 NPR' },
  { value: 4, label: 'Luxury',  symbol: '₹₹₹₹', desc: 'Above 3000 NPR'  },
];

const MOODS = [
  { id: 'romantic',        label: 'Romantic',       emoji: '💑', bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700',   activeBg: 'bg-pink-500',   activeBorder: 'border-pink-500' },
  { id: 'family-friendly', label: 'Family',         emoji: '👨‍👩‍👧', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   activeBg: 'bg-blue-500',   activeBorder: 'border-blue-500' },
  { id: 'cafe',            label: 'Cafe & Coffee',  emoji: '☕', bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  activeBg: 'bg-amber-500',  activeBorder: 'border-amber-500' },
  { id: 'luxury',          label: 'Luxury Dining',  emoji: '✨', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', activeBg: 'bg-purple-500', activeBorder: 'border-purple-500' },
  { id: 'nightlife',       label: 'Nightlife',      emoji: '🍺', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', activeBg: 'bg-indigo-500', activeBorder: 'border-indigo-500' },
  { id: 'casual',          label: 'Casual Hangout', emoji: '😎', bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  activeBg: 'bg-green-500',  activeBorder: 'border-green-500' },
  { id: 'work-friendly',   label: 'Work Friendly',  emoji: '💻', bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   activeBg: 'bg-gray-700',   activeBorder: 'border-gray-700' },
  { id: 'aesthetic',       label: 'Aesthetic',      emoji: '📸', bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   activeBg: 'bg-rose-500',   activeBorder: 'border-rose-500' },
];

const DISTANCE_OPTIONS = [5, 10, 20, 30, 50];

// ─── Component ────────────────────────────────────────────────────────────────

const Discover = () => {
  const [cuisines, setCuisines]             = useState([]);
  const [results, setResults]               = useState([]);
  const [loading, setLoading]               = useState(false);
  const [initialLoad, setInitialLoad]       = useState(true);
  const [filtersOpen, setFiltersOpen]       = useState(true);

  // Active filters
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedPrices, setSelectedPrices]     = useState([]);
  const [selectedMood, setSelectedMood]         = useState(null);
  const [locationEnabled, setLocationEnabled]   = useState(false);
  const [userCoords, setUserCoords]             = useState(null);
  const [locationError, setLocationError]       = useState(null);
  const [maxDistance, setMaxDistance]           = useState(10);

  const debounceRef = useRef(null);

  // Load cuisines on mount
  useEffect(() => {
    api.get('/metadata/cuisines').then(res => {
      setCuisines(res.data.cuisines || []);
    }).catch(() => {});
  }, []);

  // Fetch recommendations with debounce whenever filters change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRecommendations();
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [selectedCuisines, selectedPrices, selectedMood, userCoords, maxDistance]);

  const fetchRecommendations = useCallback(async () => {
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
      setResults(res.data.recommendations || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── HERO ─── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <span className="text-sm font-bold text-primary uppercase tracking-widest">
                  Personalized for You
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Discover <span className="text-primary">Restaurants</span>
              </h1>
              <p className="text-gray-500 mt-3 text-lg">
                Smart recommendations tailored to your cuisine, mood, budget, and location.
              </p>
            </div>

            {/* Results summary */}
            {!initialLoad && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 bg-gray-50 rounded-2xl px-5 py-3 border border-gray-100 shrink-0"
              >
                <Utensils size={18} className="text-primary" />
                <div>
                  <p className="text-2xl font-extrabold text-gray-900 leading-none">{results.length}</p>
                  <p className="text-xs text-gray-500 font-medium">Restaurants Found</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ─── FILTER PANEL (Sidebar) ─── */}
          <aside className="lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">

              {/* Filter header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-gray-700" />
                  <span className="font-bold text-gray-900">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-red-500 font-semibold hover:text-red-600 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={12} /> Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setFiltersOpen(o => !o)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
                  >
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform ${filtersOpen ? '' : '-rotate-90'}`}
                    />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {(filtersOpen || window.innerWidth >= 1024) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 space-y-7">

                      {/* ── Cuisine ── */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                          Cuisine
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {cuisines.map(c => {
                            const active = selectedCuisines.includes(c._id);
                            return (
                              <button
                                key={c._id}
                                onClick={() => toggleCuisine(c._id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150 ${
                                  active
                                    ? 'bg-primary border-primary text-white shadow-sm shadow-primary/30'
                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-primary/50 hover:text-primary'
                                }`}
                              >
                                {c.icon && <span className="mr-1">{c.icon}</span>}
                                {c.name}
                              </button>
                            );
                          })}
                          {cuisines.length === 0 && (
                            <p className="text-sm text-gray-400 italic">Loading cuisines…</p>
                          )}
                        </div>
                      </div>

                      {/* ── Price Range ── */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                          Price Range
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {PRICE_OPTIONS.map(opt => {
                            const active = selectedPrices.includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                onClick={() => togglePrice(opt.value)}
                                className={`flex flex-col items-start px-3 py-2.5 rounded-xl border transition-all duration-150 ${
                                  active
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-primary/40'
                                }`}
                              >
                                <span className="font-bold text-sm">{opt.symbol}</span>
                                <span className={`text-[11px] font-medium mt-0.5 ${active ? 'text-white/80' : 'text-gray-500'}`}>
                                  {opt.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Mood & Vibe ── */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                          Mood & Vibe
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {MOODS.map(mood => {
                            const active = selectedMood === mood.id;
                            return (
                              <button
                                key={mood.id}
                                onClick={() => toggleMood(mood.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-150 text-left ${
                                  active
                                    ? `${mood.activeBg} ${mood.activeBorder} text-white shadow-sm`
                                    : `${mood.bg} ${mood.border} ${mood.text} hover:opacity-90`
                                }`}
                              >
                                <span className="text-lg leading-none">{mood.emoji}</span>
                                <span className={`text-xs font-semibold leading-tight ${active ? 'text-white' : ''}`}>
                                  {mood.label}
                                </span>
                                {active && <X size={12} className="ml-auto text-white/80 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Location ── */}
                      <div>
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                          Location
                        </h3>

                        {!locationEnabled ? (
                          <button
                            onClick={requestLocation}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-primary hover:text-primary font-semibold text-sm transition-all group"
                          >
                            <Navigation size={16} className="group-hover:scale-110 transition-transform" />
                            Use my location
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-green-600" />
                                <span className="text-sm font-semibold text-green-700">Location active</span>
                              </div>
                              <button
                                onClick={disableLocation}
                                className="text-green-600 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-gray-600">Max Distance</span>
                                <span className="text-xs font-bold text-primary">{maxDistance} km</span>
                              </div>
                              <div className="flex gap-1.5">
                                {DISTANCE_OPTIONS.map(d => (
                                  <button
                                    key={d}
                                    onClick={() => setMaxDistance(d)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                      maxDistance === d
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>

          {/* ─── RESULTS ─── */}
          <main className="flex-1 min-w-0">
            {/* Active filter summary */}
            {(selectedMood || selectedCuisines.length > 0 || selectedPrices.length > 0 || locationEnabled) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 mb-5"
              >
                {activeMood && (
                  <FilterChip
                    label={`${activeMood.emoji} ${activeMood.label}`}
                    onRemove={() => setSelectedMood(null)}
                    color="bg-purple-100 text-purple-700 border-purple-200"
                  />
                )}
                {selectedPrices.map(p => {
                  const opt = PRICE_OPTIONS.find(o => o.value === p);
                  return (
                    <FilterChip
                      key={p}
                      label={`${opt.symbol} ${opt.label}`}
                      onRemove={() => togglePrice(p)}
                      color="bg-amber-100 text-amber-700 border-amber-200"
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
                    color="bg-green-100 text-green-700 border-green-200"
                  />
                )}
              </motion.div>
            )}

            {/* Loading skeleton */}
            {(loading || initialLoad) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
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
          </main>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FilterChip = ({ label, onRemove, color }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${color}`}>
    {label}
    <button onClick={onRemove} className="hover:opacity-70 transition-opacity">
      <X size={11} />
    </button>
  </div>
);

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="h-52 bg-gray-200" />
    <div className="p-5 space-y-3">
      <div className="h-5 bg-gray-200 rounded-md w-3/4" />
      <div className="h-4 bg-gray-100 rounded-md w-1/2" />
      <div className="flex gap-2 pt-1">
        <div className="h-6 bg-gray-100 rounded-full w-16" />
        <div className="h-6 bg-gray-100 rounded-full w-20" />
      </div>
      <div className="h-px bg-gray-100 mt-2" />
      <div className="h-4 bg-gray-100 rounded-md w-1/3" />
    </div>
  </div>
);

const EmptyState = ({ hasFilters, onClear }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-24 text-center"
  >
    <div className="text-6xl mb-5">🍽️</div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
    <p className="text-gray-500 max-w-sm text-sm mb-6">
      {hasFilters
        ? 'Try adjusting your filters — we might have something close to what you\'re looking for.'
        : 'No restaurants are available right now. Check back soon!'}
    </p>
    {hasFilters && (
      <button
        onClick={onClear}
        className="flex items-center gap-2 bg-primary text-white font-bold py-2.5 px-6 rounded-full hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30"
      >
        <RefreshCw size={15} /> Clear Filters
      </button>
    )}
  </motion.div>
);

export default Discover;
