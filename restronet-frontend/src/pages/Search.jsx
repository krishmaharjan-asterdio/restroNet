import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Search as SearchIcon,
  Map as MapIcon,
  List,
  Columns2,
  Star,
  SearchX,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../services/api';
import { getImageUrl } from '../utils/imageUrl';
import RestaurantCard from '../components/RestaurantCard';
import { motion, AnimatePresence } from 'framer-motion';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

/* ─── Custom orange DivIcon for venue markers ──────────────────────────────── */
const orangeMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;
    background:#fa6500;
    border:3px solid #fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 3px 14px rgba(250,101,0,0.45);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
});

/* ─── MapUpdater: keeps map bounds & size in sync ───────────────────────────── */
const MapUpdater = ({ venues, userCoords }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (venues.length > 0 || userCoords) {
      const points = venues.map(v => [v.location.coordinates[1], v.location.coordinates[0]]);
      if (userCoords) points.push([userCoords.lat, userCoords.lng]);
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [venues, userCoords, map]);
  return null;
};

/* ─── Stagger variants ──────────────────────────────────────────────────────── */
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:   { opacity: 0, scale: 0.93, transition: { duration: 0.2 } },
};

/* ─── Rating filter options ─────────────────────────────────────────────────── */
const RATING_OPTIONS = [
  { label: 'All',  value: '' },
  { label: '4.5+', value: '4.5' },
  { label: '4.0+', value: '4.0' },
  { label: '3.5+', value: '3.5' },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   SEARCH PAGE
═══════════════════════════════════════════════════════════════════════════════ */
const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  /* localQuery drives the input; URL is only updated after a 500 ms pause */
  const [localQuery, setLocalQuery]     = useState(query);
  const [venues, setVenues]             = useState([]);
  const [suggestions, setSuggestions]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [viewMode, setViewMode]         = useState('split');

  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedRating,  setSelectedRating]  = useState('');
  const [cuisinesList, setCuisinesList]        = useState([]);
  const [coords, setCoords]                    = useState(null);

  /* Keep localQuery in sync when URL changes externally (back/forward) */
  useEffect(() => { setLocalQuery(query); }, [query]);

  /* Debounce: update URL 500 ms after the user stops typing */
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localQuery.trim();
      setSearchParams(trimmed ? { q: trimmed } : {});
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery]);

  /* Bootstrap: fetch cuisines, detect location, handle resize */
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get('/metadata/cuisines');
        setCuisinesList(res.data.cuisines);
      } catch (err) { console.error(err); }
    };
    fetchMeta();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn('Location denied', err)
      );
    }

    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'split') setViewMode('list');
      else if (window.innerWidth >= 1024 && viewMode !== 'split') setViewMode('split');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Fetch venues whenever URL query or filters change */
  useEffect(() => {
    let active = true;
    const fetchVenues = async () => {
      setLoading(true);
      try {
        let endpoint = `/recommendations/smart?limit=50`;
        if (query)           endpoint += `&prompt=${encodeURIComponent(query)}`;
        if (selectedCuisine) endpoint += `&cuisines=${selectedCuisine}`;
        if (selectedRating)  endpoint += `&minRating=${selectedRating}`;
        if (coords)          endpoint += `&lat=${coords.lat}&lng=${coords.lng}`;

        const res = await api.get(endpoint);
        if (!active) return;
        setVenues(res.data.recommendations || []);
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchVenues();
    return () => { active = false; };
  }, [query, selectedCuisine, selectedRating, coords]);

  /* Clicking a suggestion triggers an immediate search */
  const handleSuggestionClick = (suggestion) => {
    setLocalQuery(suggestion);
    setSearchParams({ q: suggestion });
  };

  const clearFilters = () => {
    setSearchParams({});
    setSelectedCuisine('');
    setSelectedRating('');
    setLocalQuery('');
  };

  const hasActiveFilters = query || selectedCuisine || selectedRating;

  /* ── Chip helper ─────────────────────────────────────────────────────────── */
  const chipCls = (active) =>
    `whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer select-none ${
      active
        ? 'bg-primary text-white shadow-primary-sm'
        : 'bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
    }`;

  /* ── View toggle button helper ───────────────────────────────────────────── */
  const toggleCls = (mode) =>
    `flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all duration-200 ${
      viewMode === mode
        ? 'bg-primary text-white'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  /* ── Grid columns: 1 col in split, 2 col in list on sm+, 3 col on xl ────── */
  const gridCls =
    viewMode === 'split'
      ? 'grid grid-cols-1 gap-5'
      : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5';

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full bg-background overflow-hidden">

      {/* ── STICKY TOP BAR ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border">

        {/* Row 1: search + view toggles */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3">

          {/* Search input */}
          <div className="relative flex-1 max-w-2xl">
            <SearchIcon
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search restaurants, cuisines, or dishes…"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="input-field pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1 hidden lg:block" />

          {/* View toggle pill group — hidden on mobile (use floating bar instead) */}
          <div className="hidden lg:flex items-center rounded-xl border border-border overflow-hidden">
            <button className={toggleCls('list')}    onClick={() => setViewMode('list')}>
              <List size={15} /> List
            </button>
            <button
              className={`${toggleCls('split')} border-x border-border`}
              onClick={() => setViewMode('split')}
            >
              <Columns2 size={15} /> Split
            </button>
            <button className={toggleCls('map')}     onClick={() => setViewMode('map')}>
              <MapIcon size={15} /> Map
            </button>
          </div>

          {/* Filter icon badge (mobile) */}
          <div className="lg:hidden relative">
            <SlidersHorizontal size={20} className="text-muted-foreground" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </div>
        </div>

        {/* Row 2: filter chips (horizontally scrollable) */}
        <div className="flex items-center gap-2 px-4 md:px-6 pb-3 overflow-x-auto scrollbar-hide">

          {/* Rating chips */}
          {RATING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedRating(opt.value)}
              className={chipCls(selectedRating === opt.value)}
            >
              {opt.value ? (
                <span className="flex items-center gap-1">
                  <Star size={12} className="fill-current" />
                  {opt.label}
                </span>
              ) : opt.label}
            </button>
          ))}

          {/* Divider dot */}
          {cuisinesList.length > 0 && (
            <span className="w-1 h-1 rounded-full bg-border shrink-0 mx-1" />
          )}

          {/* Cuisine chips */}
          {cuisinesList.length > 0 && (
            <>
              <button
                onClick={() => setSelectedCuisine('')}
                className={chipCls(selectedCuisine === '')}
              >
                All cuisines
              </button>
              {cuisinesList.map(c => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCuisine(c._id)}
                  className={chipCls(selectedCuisine === c._id)}
                >
                  {c.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── BODY (list + map panels) ─────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LIST PANEL ──────────────────────────────────────────────────────── */}
        <div
          className={[
            'flex flex-col h-full border-r border-border bg-background transition-all duration-300 overflow-hidden',
            viewMode === 'split' ? 'w-full lg:w-[40%]' : '',
            viewMode === 'list'  ? 'w-full' : '',
            viewMode === 'map'   ? 'hidden' : '',
          ].join(' ')}
        >
          {/* Result count row */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <p className="text-label">
              {loading
                ? 'Searching…'
                : `${venues.length} restaurant${venues.length !== 1 ? 's' : ''} found`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Scrollable card area */}
          <div className="flex-1 overflow-y-auto px-5 pb-24 lg:pb-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">

            {/* ── LOADING SKELETONS ──────────────────────────────────────────── */}
            {loading && (
              <div className={gridCls}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton h-[480px] rounded-3xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* ── EMPTY STATE ────────────────────────────────────────────────── */}
            {!loading && venues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mb-5 border border-border">
                  <SearchX size={34} className="text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No restaurants found
                </h3>
                {query ? (
                  <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                    We couldn't find anything for{' '}
                    <span className="font-semibold text-foreground">"{query}"</span>.
                    Try a different search term.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                    Try changing or clearing your filters to see more results.
                  </p>
                )}

                {suggestions.length > 0 ? (
                  <>
                    <p className="text-label mb-3">Try one of these</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      {suggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => handleSuggestionClick(s)}
                          className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-semibold hover:bg-primary hover:text-white transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <button onClick={clearFilters} className="btn-secondary">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {/* ── RESULTS GRID ───────────────────────────────────────────────── */}
            {!loading && venues.length > 0 && (
              <motion.div
                className={gridCls}
                variants={listVariants}
                initial="hidden"
                animate="show"
              >
                <AnimatePresence>
                  {venues.map(venue => (
                    <motion.div
                      key={venue._id}
                      variants={cardVariants}
                      exit="exit"
                      layout
                    >
                      <RestaurantCard venue={venue} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── MAP PANEL ───────────────────────────────────────────────────────── */}
        <div
          className={[
            'h-full bg-surface transition-all duration-300 relative',
            viewMode === 'split' ? 'hidden lg:block lg:w-[60%]' : '',
            viewMode === 'map'   ? 'w-full' : '',
            viewMode === 'list'  ? 'hidden' : '',
          ].join(' ')}
        >
          <div className="h-full w-full rounded-none lg:rounded-2xl overflow-hidden">
            <MapContainer
              center={[27.7172, 85.3240]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapUpdater venues={venues} userCoords={coords} />

              {/* User location marker */}
              {coords && (
                <Marker
                  position={[coords.lat, coords.lng]}
                  icon={L.divIcon({
                    className: '',
                    html: `<div class="relative flex items-center justify-center" style="width:20px;height:20px;">
                      <div style="width:20px;height:20px;background:#3b82f6;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div>
                      <div style="position:absolute;inset:-6px;background:rgba(59,130,246,0.18);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>
                    </div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  })}
                >
                  <Popup>You are here</Popup>
                </Marker>
              )}

              {/* Venue markers */}
              {venues.map(venue => (
                <Marker
                  key={venue._id}
                  position={[venue.location.coordinates[1], venue.location.coordinates[0]]}
                  icon={orangeMarkerIcon}
                >
                  <Popup className="custom-popup" closeButton={false}>
                    <a
                      href={`/restaurant/${venue.slug}`}
                      className="block overflow-hidden rounded-2xl min-w-[200px]"
                    >
                      {venue.logo && (
                        <img
                          src={getImageUrl(venue.logo)}
                          alt={venue.name}
                          className="w-full h-28 object-cover"
                        />
                      )}
                      <div className="px-3 py-2.5 bg-card">
                        <h4 className="font-semibold text-sm text-foreground mb-1 leading-tight">
                          {venue.name}
                        </h4>
                        <div className="flex items-center gap-1 text-sm font-bold text-primary">
                          <Star size={12} className="fill-primary text-primary" />
                          {venue.averageRating.toFixed(1)}
                          <span className="ml-auto text-xs font-semibold text-primary underline">
                            View →
                          </span>
                        </div>
                      </div>
                    </a>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

      </div>

      {/* ── MOBILE FLOATING VIEW TOGGLE ─────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.14)] overflow-hidden p-1 gap-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-primary text-white shadow-[0_2px_8px_rgba(250,101,0,0.35)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List size={15} /> List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              viewMode === 'map'
                ? 'bg-primary text-white shadow-[0_2px_8px_rgba(250,101,0,0.35)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapIcon size={15} /> Map
          </button>
        </div>
      </div>

    </div>
  );
};

export default Search;
