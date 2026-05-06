import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';

// Fix for default Leaflet marker icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: iconUrl,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Map component to adjust view when markers change
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

  // Filters state
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [cuisinesList, setCuisinesList] = useState([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [query, selectedCuisine]);

  const fetchMetadata = async () => {
    try {
      const res = await api.get('/metadata/cuisines');
      setCuisinesList(res.data.cuisines);
    } catch (err) { console.error(err); }
  };

  const fetchVenues = async () => {
    setLoading(true);
    try {
      let endpoint = `/venues?limit=50`;
      if (query) endpoint += `&search=${encodeURIComponent(query)}`;
      if (selectedCuisine) endpoint += `&cuisine=${selectedCuisine}`;
      
      const res = await api.get(endpoint);
      setVenues(res.data.docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-76px)] w-full">
      {/* Sidebar List */}
      <div className="w-1/2 overflow-y-auto bg-gray-50 flex flex-col border-r border-gray-200">
        
        {/* Filters Header */}
        <div className="bg-white p-4 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Search..." 
              value={query}
              onChange={(e) => setSearchParams({ q: e.target.value })}
              className="flex-1 p-2 border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-primary/50"
            />
            <select 
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="p-2 border border-gray-300 rounded-md outline-none bg-white"
            >
              <option value="">All Cuisines</option>
              {cuisinesList.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-3 font-medium">
            Found {venues.length} restaurants {query ? `matching "${query}"` : ''}
          </p>
        </div>

        {/* List Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : venues.length === 0 ? (
            <div className="text-center p-10 text-gray-500">No restaurants found. Try adjusting filters.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {venues.map(venue => (
                <RestaurantCard key={venue._id} venue={venue} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map View */}
      <div className="w-1/2 h-full bg-gray-200 relative z-0">
        <MapContainer 
          center={[27.7172, 85.3240]} // Default to Kathmandu
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
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
              <Popup>
                <div className="font-semibold">{venue.name}</div>
                <div className="text-xs text-gray-500">{venue.address.street}</div>
                <a href={`/restaurant/${venue.slug}`} className="text-xs text-primary mt-1 block">View Details</a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Search;
