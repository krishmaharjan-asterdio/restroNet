import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Heart, Navigation, Sparkles, Banknote } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

const PRICE_MAP = { 1: 'Npr', 2: 'Npr x2', 3: 'Npr x3', 4: 'Npr x4' };
const MOOD_LABEL = {
  romantic: { label: 'Romantic', emoji: '💑' },
  'family-friendly': { label: 'Family', emoji: '👨‍👩‍👧' },
  cafe: { label: 'Cafe', emoji: '☕' },
  luxury: { label: 'Luxury', emoji: '✨' },
  nightlife: { label: 'Nightlife', emoji: '🍺' },
  casual: { label: 'Casual', emoji: '😎' },
  'work-friendly': { label: 'Work Friendly', emoji: '💻' },
  aesthetic: { label: 'Aesthetic', emoji: '📸' },
};

const RestaurantCard = ({ venue, showScoreBreakdown = false }) => {
  const { user } = useContext(AuthContext);
  const [isSaved, setIsSaved] = useState(false);

  const imageUrl = venue.gallery?.length > 0
    ? `http://localhost:5000${venue.gallery[0]}`
    : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  const logoUrl = venue.logo ? `http://localhost:5000${venue.logo}` : null;
  const isNew = venue.createdAt && (new Date() - new Date(venue.createdAt)) < (1000 * 60 * 60 * 24 * 7);
  const matchPct = venue.recommendationScore ? Math.round(venue.recommendationScore * 100) : null;
  const mood = venue.matchedMood ? MOOD_LABEL[venue.matchedMood] : null;

  return (
    <motion.div
      whileHover={{ y: -12 }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative group h-[500px] w-full rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] transition-all duration-700"
    >


      <Link to={`/restaurant/${venue.slug}`} className="block h-full w-full">
        {/* Background Image */}
        <img
          src={imageUrl}
          alt={venue.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
        />

        {/* Dynamic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-primary/5 mix-blend-overlay group-hover:opacity-0 transition-opacity duration-700" />

        {/* Top Badges */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
          <div className="flex flex-col gap-2">
            {isNew && (
              <span className="bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                New Arrival
              </span>
            )}
            {user && matchPct && (
              <span className="bg-black/40 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                {matchPct}% Match
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={e => { e.preventDefault(); setIsSaved(s => !s); }}
              className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-xl rounded-full border border-white/30 text-white hover:bg-white hover:text-red-500 transition-all active:scale-90 shadow-lg"
            >
              <Heart size={18} className={isSaved ? 'fill-current text-red-500' : ''} />
            </button>
            <div className="bg-gray-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xl border border-white/10">
              {(venue.averageRating || 0).toFixed(1)} <Star size={12} className="fill-primary text-primary" />
            </div>
          </div>
        </div>

        {/* Bottom Content Card - Float on top with deep blur */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-white/90 backdrop-blur-2xl rounded-[2rem] p-6 shadow-xl border border-white/50 group-hover:-translate-y-2 transition-transform duration-500 relative">

            {/* Logo Overlay - Smaller and subtler */}
            {logoUrl && (
              <div className="absolute -top-8 left-6 w-14 h-14 bg-white rounded-2xl p-1.5 shadow-xl border border-gray-100 overflow-hidden group-hover:scale-110 transition-transform duration-500">
                <img src={logoUrl} className="w-full h-full object-cover rounded-xl" alt="logo" />
              </div>
            )}

            <div className="mb-4">
              <div className={logoUrl ? 'mt-4' : ''}>
                <h3 className="text-xl font-black text-gray-900 leading-tight mb-2 line-clamp-1">
                  {venue.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-gray-500 text-[10px] font-bold">
                  <span className="flex items-center gap-1">
                    <MapPin size={10} className="text-primary" /> {venue.address?.city || 'Kathmandu'}
                  </span>
                  {venue.distanceKm && (
                    <span className="text-primary bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      {venue.distanceKm} km
                    </span>
                  )}
                  {mood && (
                    <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter">
                      {mood.emoji} {mood.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4].map(s => (
                    <div
                      key={s}
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black transition-all ${s <= (venue.priceRange || 2) ? 'bg-amber-400 text-white shadow-sm' : 'bg-gray-100 text-gray-300'
                        }`}
                    >
                      ₨
                    </div>
                  ))}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate max-w-[80px]">{venue.category?.name || 'Restro'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-primary group-hover:gap-2.5 transition-all duration-500">
                <span className="text-[10px] font-black uppercase tracking-widest">Open</span>
                <Navigation size={12} className="rotate-90 fill-current" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RestaurantCard;
