import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Heart, Navigation, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [isSaved, setIsSaved] = useState(false);

  const imageUrl = venue.logo
    ? `http://localhost:5000${venue.logo}`
    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

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
      whileHover={{ y: -6 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.10)] transition-shadow duration-300 overflow-hidden relative group flex flex-col h-full"
    >
      {/* ── Save button ── */}
      <button
        onClick={e => { e.preventDefault(); setIsSaved(s => !s); }}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:scale-110 transition-transform"
        aria-label="Save restaurant"
      >
        <Heart size={15} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'} />
      </button>

      <Link to={`/restaurant/${venue.slug}`} className="flex flex-col h-full">
        {/* ── Image ── */}
        <div className="relative h-52 w-full overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Match score badge */}
          {matchPct !== null && (
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-xl border border-white/20 text-white font-black text-[11px] uppercase tracking-wider ${
                    matchPct >= 80 ? 'bg-green-500/90' : matchPct >= 50 ? 'bg-primary/90' : 'bg-gray-600/90'
                }`}
              >
                <Sparkles size={12} fill="currentColor" />
                {matchPct}% Match
              </motion.div>
              {mood && (
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/90 text-gray-800 text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-sm backdrop-blur-md flex items-center gap-1.5 border border-white"
                >
                  <span>{mood.emoji}</span> {mood.label}
                </motion.div>
              )}
            </div>
          )}

          {/* Floating rating */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
            <span className="font-bold text-gray-900 text-sm">{(venue.averageRating || 0).toFixed(1)}</span>
            <Star size={13} className="fill-yellow-400 text-yellow-400" />
            <span className="text-gray-500 text-xs">({venue.totalReviews || 0})</span>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors mb-1">
            {venue.name}
          </h3>

          {/* Location + distance */}
          <div className="flex items-center gap-3 text-gray-500 text-xs mb-3">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {venue.address?.city || '—'}
            </span>
            {venue.distanceKm !== null && venue.distanceKm !== undefined && (
              <span className="flex items-center gap-1 font-semibold text-gray-700">
                <Navigation size={11} />
                {venue.distanceKm} km
              </span>
            )}
          </div>

          {/* Cuisine tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {venue.cuisines?.slice(0, 3).map(c => (
              <span
                key={c._id}
                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-100"
              >
                {c.name}
              </span>
            ))}
            {(venue.cuisines?.length || 0) > 3 && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-500">
                +{venue.cuisines.length - 3}
              </span>
            )}
          </div>

          {/* Vibe tags (from venue tags) */}
          {venue.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {venue.tags.slice(0, 2).map(t => (
                <span
                  key={t._id}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 border border-gray-200"
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}

          {/* Match strength bar (shown whenever a score exists) */}
          {matchPct !== null && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Match Score</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    matchPct >= 80 ? 'text-green-600 bg-green-50' : matchPct >= 50 ? 'text-primary bg-orange-50' : 'text-gray-500 bg-gray-50'
                }`}>
                    {matchPct}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${matchPct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${scoreColor}`}
                />
              </div>
            </div>
          )}

          {/* Footer: price + category */}
          <div className="border-t border-gray-100 pt-3 mt-auto flex justify-between items-center text-xs font-semibold">
            <span className="text-gray-700">
              <span className="text-gray-900 font-bold">{PRICE_MAP[venue.priceRange] || '₹₹'}</span>
              {venue.category?.name ? ` · ${venue.category.name}` : ''}
            </span>
            <span className="text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 font-bold">
              Explore →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RestaurantCard;
