import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Heart, Navigation, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

const PRICE_MAP  = { 1: '₹', 2: '₹₹', 3: '₹₹₹', 4: '₹₹₹₹' };
const MOOD_LABEL = {
  romantic:         { label: 'Romantic',       emoji: '💑' },
  'family-friendly':{ label: 'Family',         emoji: '👨‍👩‍👧' },
  cafe:             { label: 'Cafe',            emoji: '☕' },
  luxury:           { label: 'Luxury',          emoji: '✨' },
  nightlife:        { label: 'Nightlife',       emoji: '🍺' },
  casual:           { label: 'Casual',          emoji: '😎' },
  'work-friendly':  { label: 'Work Friendly',   emoji: '💻' },
  aesthetic:        { label: 'Aesthetic',       emoji: '📸' },
};

const RestaurantCard = ({ venue, showScoreBreakdown = false }) => {
  const { user } = useContext(AuthContext);
  const [isSaved, setIsSaved] = useState(false);

  const imageUrl = venue.gallery?.length > 0
    ? `http://localhost:5000${venue.gallery[0]}`
    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  const logoUrl = venue.logo ? `http://localhost:5000${venue.logo}` : null;

  const isNew = venue.createdAt && (new Date() - new Date(venue.createdAt)) < (1000 * 60 * 60 * 24 * 7); // 7 days

  const matchPct = venue.recommendationScore
    ? Math.round(venue.recommendationScore * 100)
    : null;

  const mood = venue.matchedMood ? MOOD_LABEL[venue.matchedMood] : null;

  // Score bar color
  const scoreColor =
    matchPct >= 75 ? 'bg-green-500' :
    matchPct >= 50 ? 'bg-amber-400' :
    'bg-gray-300';

  return (
    <motion.div
      whileHover={{ y: -8 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_4px_25px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_45px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden relative group flex flex-col h-full"
    >
      {/* ── Save button ── */}
      <button
        onClick={e => { e.preventDefault(); setIsSaved(s => !s); }}
        className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-transform active:scale-90"
        aria-label="Save restaurant"
      >
        <Heart size={16} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'} />
      </button>

      {/* ── New Badge ── */}
      {isNew && (
        <div className="absolute top-4 left-4 z-10 bg-black text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-xl">
          New
        </div>
      )}

      <Link to={`/restaurant/${venue.slug}`} className="flex flex-col h-full">
        {/* ── Image ── */}
        <div className="relative h-56 w-full overflow-hidden bg-gray-50">
          <img
            src={imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

          {/* Restaurant Logo Overlay */}
          {logoUrl && (
            <div className="absolute -bottom-6 left-6 z-10 w-14 h-14 bg-white rounded-2xl p-1 shadow-xl border-2 border-white overflow-hidden group-hover:scale-105 transition-transform">
                <img src={logoUrl} className="w-full h-full object-cover rounded-xl" alt="logo" />
            </div>
          )}

          {/* Match score badge */}
          {user && matchPct !== null && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 items-center">
              <motion.div 
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md border border-white/30 text-white font-black text-[10px] uppercase tracking-wider ${
                    matchPct >= 80 ? 'bg-green-500/90' : matchPct >= 50 ? 'bg-primary/90' : 'bg-gray-800/90'
                }`}
              >
                <Sparkles size={11} fill="currentColor" />
                {matchPct}% Match
              </motion.div>
            </div>
          )}

          {/* Floating rating */}
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-white/10">
            <span className="font-bold text-white text-xs">{(venue.averageRating || 0).toFixed(1)}</span>
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="text-white/60 text-[10px]">({venue.totalReviews || 0})</span>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-6 pt-10 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-black text-gray-900 line-clamp-1 group-hover:text-primary transition-colors tracking-tight">
              {venue.name}
            </h3>
            {user && mood && (
                <span className="bg-gray-50 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-gray-100 flex items-center gap-1 whitespace-nowrap">
                  {mood.emoji} {mood.label}
                </span>
            )}
          </div>

          {/* Location + distance */}
          <div className="flex items-center gap-3 text-gray-500 text-xs font-medium mb-4">
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-primary/70" />
              {venue.address?.city || '—'}
            </span>
            {venue.distanceKm !== null && venue.distanceKm !== undefined && (
              <span className="flex items-center gap-1 text-gray-800 font-bold bg-gray-100 px-2 py-0.5 rounded-md">
                <Navigation size={11} className="text-primary" />
                {venue.distanceKm} km
              </span>
            )}
          </div>

          {/* Cuisine tags */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {venue.cuisines?.slice(0, 2).map(c => (
              <span
                key={c._id}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100"
              >
                {c.name}
              </span>
            ))}
            {(venue.cuisines?.length || 0) > 2 && (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-400">
                +{venue.cuisines.length - 2}
              </span>
            )}
          </div>

          {/* Match strength bar */}
          {user && matchPct !== null && (
            <div className="mb-6 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Compatibility</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    matchPct >= 80 ? 'text-green-600' : matchPct >= 50 ? 'text-primary' : 'text-gray-500'
                }`}>
                    {matchPct}%
                </span>
              </div>
              <div className="h-1 bg-gray-200/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${matchPct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: 'circOut' }}
                  className={`h-full rounded-full ${scoreColor}`}
                />
              </div>
            </div>
          )}

          {/* Footer: price + category */}
          <div className="border-t border-gray-100 pt-4 mt-auto flex justify-between items-center text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-black text-sm">{PRICE_MAP[venue.priceRange] || '₹₹'}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              <span className="text-gray-500 uppercase tracking-wider text-[10px]">{venue.category?.name || 'Restaurant'}</span>
            </div>
            <span className="text-primary flex items-center gap-1 group-hover:gap-2 transition-all duration-300 font-black uppercase tracking-widest text-[10px]">
              Explore <Navigation size={12} className="rotate-90 fill-current" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RestaurantCard;
