import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search as SearchIcon, Map as MapIcon, List, Star } from 'lucide-react';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for default Leaflet marker icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ venues }) => {
  const map = useMap();
  useEffect(() => {
    if (venues.length > 0) {
      const bounds = L.latLngBounds(venues.map(v => [v.location.coordinates[1], v.location.coordinates[0]]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [venues, map]);
  return null;
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'list', 'map'

  // Filters state
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [cuisinesList, setCuisinesList] = useState([]);

  useEffect(() => {
    fetchMetadata();
    
    // Auto adjust view mode on smaller screens
    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'split') {
        setViewMode('list');
      } else if (window.innerWidth >= 1024 && viewMode !== 'split') {
        setViewMode('split');
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [query, selectedCuisine, selectedRating]);

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/metadata/cuisines');
      setCuisinesList(res.data.cuisines);
    } catch (err) { console.error(err); }
  };

  const fetchVenues = async () => {
    setLoading(true);
    try {
      let endpoint = `/recommendations/smart?limit=50`;
      if (query) endpoint += `&prompt=${encodeURIComponent(query)}`;
      if (selectedCuisine) endpoint += `&cuisines=${selectedCuisine}`;
      
      const res = await api.get(endpoint);
      
      // Extract from recommendations array instead of docs
      let results = res.data.recommendations || [];
      
      if (selectedRating) {
        results = results.filter(v => v.averageRating >= parseFloat(selectedRating));
      }
      
      setVenues(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchParams({});
    setSelectedCuisine('');
    setSelectedRating('');
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
        h-full flex flex-col border-r border-gray-200 bg-gray-50 z-10 transition-all duration-300
      `}>
        
        {/* Filters Header (Sticky) */}
        <div className="bg-white px-6 py-5 border-b border-gray-200 shadow-sm z-20">
          <div className="mb-4">
            <div className="relative w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search places or dishes..."
                value={query}
                onChange={(e) => setSearchParams({ q: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-transparent rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-medium text-gray-700"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {/* Rating pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Rating</span>
              {[
                { label: 'All', value: '' },
                { label: '4.5+ ★', value: '4.5' },
                { label: '4.0+ ★', value: '4.0' },
                { label: '3.5+ ★', value: '3.5' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSelectedRating(opt.value)}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-sm font-semibold border transition-all ${
                    selectedRating === opt.value
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Cuisine pills */}
            {cuisinesList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Cuisine</span>
                <button
                  onClick={() => setSelectedCuisine('')}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-sm font-semibold border transition-all ${
                    selectedCuisine === ''
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  All
                </button>
                {cuisinesList.map(c => (
                  <button
                    key={c._id}
                    onClick={() => setSelectedCuisine(c._id)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-sm font-semibold border transition-all ${
                      selectedCuisine === c._id
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {(query || selectedCuisine || selectedRating) && (
              <button onClick={clearFilters} className="text-sm font-bold text-primary hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mb-4 text-gray-800 font-bold text-lg">
            {loading ? 'Searching...' : `${venues.length} restaurants found`}
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">No exact matches</h3>
              <p className="text-gray-500">Try changing or clearing your filters to see more results.</p>
              <button onClick={clearFilters} className="mt-6 btn-secondary-modern">Clear all filters</button>
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
          center={[27.7172, 85.3240]} // Kathmandu Default
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapUpdater venues={venues} />
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
