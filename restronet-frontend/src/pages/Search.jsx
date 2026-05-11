import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search as SearchIcon, Map as MapIcon, List, Star } from 'lucide-react';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { motion, AnimatePresence } from 'framer-motion';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ venues, userCoords }) => {
  const map = useMap();
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

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  // localQuery drives the input; URL is only updated after a 500ms pause
  const [localQuery, setLocalQuery] = useState(query);
  const [venues, setVenues]           = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [viewMode, setViewMode]       = useState('split');

  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedRating, setSelectedRating]   = useState('');
  const [cuisinesList, setCuisinesList]       = useState([]);
  const [coords, setCoords]                   = useState(null);

  // Keep localQuery in sync when URL changes externally (browser back/forward)
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounce: update URL 500ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localQuery.trim();
      setSearchParams(trimmed ? { q: trimmed } : {});
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery]);

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

  // Fetch venues whenever the URL query (not localQuery) changes
  useEffect(() => {
    let active = true;

    const fetchVenues = async () => {
      setLoading(true);
      try {
        let endpoint = `/recommendations/smart?limit=50`;
        if (query) endpoint += `&prompt=${encodeURIComponent(query)}`;
        if (selectedCuisine) endpoint += `&cuisines=${selectedCuisine}`;
        if (coords) endpoint += `&lat=${coords.lat}&lng=${coords.lng}`;

        const res = await api.get(endpoint);
        if (!active) return;

        let results = res.data.recommendations || [];
        if (selectedRating) {
          results = results.filter(v => v.averageRating >= parseFloat(selectedRating));
        }

        setVenues(results);
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

  // Clicking a suggestion replaces the query in-place and triggers a new search immediately
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

  return (
    <div className="flex h-[calc(100vh-80px)] w-full bg-white relative overflow-hidden">

      {/* Mobile View Toggles */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex bg-gray-900 text-white rounded-full shadow-2xl overflow-hidden p-1">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 font-bold' : 'text-gray-300 font-medium'}`}
        >
          <List size={18} /> List
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-colors ${viewMode === 'map' ? 'bg-white text-gray-900 font-bold' : 'text-gray-300 font-medium'}`}
        >
          <MapIcon size={18} /> Map
        </button>
      </div>

      {/* ─── SIDEBAR (FILTERS & LIST) ─── */}
      <div className={`
        ${viewMode === 'split' ? 'w-[55%] xl:w-[45%]' : viewMode === 'list' ? 'w-full' : 'hidden'}
        h-full flex flex-col border-r border-gray-100 bg-white z-10 transition-all duration-300
      `}>

        {/* Filters Header (Sticky) */}
        <div className="bg-white/80 backdrop-blur-xl px-8 py-8 border-b border-gray-100 z-20">
          <div className="mb-8">
            <div className="relative w-full">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search places or dishes..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* Rating pills */}
            <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-label shrink-0">Rating</span>
              <div className="flex gap-2">
                {[
                  { label: 'All', value: '' },
                  { label: '4.5+', value: '4.5' },
                  { label: '4.0+', value: '4.0' },
                  { label: '3.5+', value: '3.5' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRating(opt.value)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedRating === opt.value
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine pills */}
            {cuisinesList.length > 0 && (
              <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-label shrink-0">Cuisine</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCuisine('')}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCuisine === ''
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {cuisinesList.map(c => (
                    <button
                      key={c._id}
                      onClick={() => setSelectedCuisine(c._id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCuisine === c._id
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth bg-gray-50/30">
          <div className="mb-8 flex justify-between items-center">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">
              {loading ? 'Searching...' : `${venues.length} Curated Spots`}
            </h2>
            {(query || selectedCuisine || selectedRating) && (
              <button onClick={clearFilters} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                Reset Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 p-4">
                  <div className="bg-gray-200 h-40 rounded-xl mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {query ? `No results for "${query}"` : 'No restaurants found'}
              </h3>
              {suggestions.length > 0 ? (
                <>
                  <p className="text-gray-500 mb-5">Try one of these instead:</p>
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
                <>
                  <p className="text-gray-500 mb-6">Try changing or clearing your filters to see more results.</p>
                  <button onClick={clearFilters} className="btn-secondary-modern">Clear all filters</button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20 lg:pb-0">
              <AnimatePresence>
                {venues.map((venue, i) => (
                  <motion.div
                    key={venue._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <RestaurantCard venue={venue} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ─── MAP VIEW ─── */}
      <div className={`
        ${viewMode === 'split' ? 'w-[45%] xl:w-[55%]' : viewMode === 'map' ? 'w-full' : 'hidden'}
        h-full bg-gray-200 relative z-0
      `}>
        <MapContainer
          center={[27.7172, 85.3240]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapUpdater venues={venues} userCoords={coords} />

          {coords && (
            <Marker
              position={[coords.lat, coords.lng]}
              icon={L.divIcon({
                className: 'user-location-marker',
                html: `<div class="relative">
                  <div class="w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                  <div class="absolute -inset-2 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                </div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            >
              <Popup>You are here</Popup>
            </Marker>
          )}

          {venues.map(venue => (
            <Marker
              key={venue._id}
              position={[venue.location.coordinates[1], venue.location.coordinates[0]]}
            >
              <Popup className="custom-popup" closeButton={false}>
                <a href={`/restaurant/${venue.slug}`} className="block overflow-hidden rounded-lg min-w-[200px]">
                  {venue.logo && (
                    <img src={`http://localhost:5000${venue.logo}`} alt={venue.name} className="w-full h-24 object-cover" />
                  )}
                  <div className="p-3 bg-white">
                    <h4 className="font-bold text-gray-900 mb-1">{venue.name}</h4>
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-700">
                      {venue.averageRating.toFixed(1)} <Star size={12} className="fill-current" />
                    </div>
                  </div>
                </a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

    </div>
  );
};

export default Search;
