import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Heart, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const RestaurantCard = ({ venue }) => {
  const [isSaved, setIsSaved] = useState(false);

  const imageUrl = venue.logo 
    ? `http://localhost:5000${venue.logo}`
    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  const priceMap = { 1: '₹', 2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' };

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-shadow duration-300 overflow-hidden relative group flex flex-col h-full"
    >
      {/* Save Button */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          setIsSaved(!isSaved);
        }}
        className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
      >
        <Heart 
          size={16} 
          className={isSaved ? "fill-red-500 text-red-500" : "text-gray-600"} 
        />
      </button>

      <Link to={`/restaurant/${venue.slug}`} className="flex flex-col h-full">
        {/* Image Section */}
        <div className="relative h-56 w-full overflow-hidden bg-gray-100">
          <img 
            src={imageUrl} 
            alt={venue.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
          
          {/* Match Score Badge */}
          {venue.recommendationScore && (
            <div className="absolute top-4 left-4 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-md backdrop-blur-md">
              {(venue.recommendationScore * 100).toFixed(0)}% Match
            </div>
          )}

          {/* Floating Rating */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
            <span className="font-bold text-gray-900 text-sm">{venue.averageRating.toFixed(1)}</span>
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span className="text-gray-500 text-xs ml-0.5">({venue.totalReviews})</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
              {venue.name}
            </h3>
          </div>

          <div className="flex items-center text-gray-500 text-sm mb-4 gap-3">
            <div className="flex items-center">
              <MapPin size={14} className="mr-1" />
              <span className="line-clamp-1">{venue.address.city}</span>
            </div>
            {venue.distanceKm && (
              <div className="flex items-center gap-1.5 before:content-['•'] before:text-gray-300">
                <span className="font-medium text-gray-700">{venue.distanceKm} km</span>
              </div>
            )}
          </div>

          {/* Cuisines / Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
            {venue.cuisines?.slice(0, 3).map(c => (
              <span key={c._id} className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200/50">
                {c.name}
              </span>
            ))}
            {venue.cuisines?.length > 3 && (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600">
                +{venue.cuisines.length - 3}
              </span>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm font-medium">
            <span className="text-gray-700">
              <span className="text-gray-900 font-bold tracking-wide">{priceMap[venue.priceRange] || '₹₹'}</span> • {venue.category?.name || 'Restaurant'}
            </span>
            <span className="text-primary flex items-center gap-1 text-sm font-semibold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
              Explore
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RestaurantCard;
