import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';

const RestaurantCard = ({ venue }) => {
  const imageUrl = venue.logo 
    ? `http://localhost:5000${venue.logo}`
    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80'; // fallback

  const priceMap = { 1: '₹', 2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' };

  return (
    <Link to={`/restaurant/${venue.slug}`} className="modern-card group block overflow-hidden">
      {/* Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        <img 
          src={imageUrl} 
          alt={venue.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {venue.recommendationScore && (
          <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow">
            {(venue.recommendationScore * 100).toFixed(0)}% Match
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{venue.name}</h3>
          <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-sm font-semibold">
            <span>{venue.averageRating.toFixed(1)}</span>
            <Star size={14} className="fill-current" />
          </div>
        </div>

        <div className="flex items-center text-gray-500 text-sm mb-3">
          <MapPin size={14} className="mr-1" />
          <span className="line-clamp-1">{venue.address.street}, {venue.address.city}</span>
          {venue.distanceKm && (
            <span className="ml-2 pl-2 border-l border-gray-300">
              {venue.distanceKm} km
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4 h-[52px] overflow-hidden">
          {venue.cuisines?.slice(0, 3).map(c => (
            <span key={c._id} className="modern-chip">{c.name}</span>
          ))}
          {venue.cuisines?.length > 3 && (
            <span className="modern-chip">+{venue.cuisines.length - 3}</span>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm font-medium text-gray-600">
          <span>{priceMap[venue.priceRange] || '₹₹'} • {venue.category?.name || 'Restaurant'}</span>
          <span className="text-primary group-hover:underline">View details</span>
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
