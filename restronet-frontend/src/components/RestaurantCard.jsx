import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Heart, Navigation, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUrl';

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

  const imageUrl =
    venue.gallery?.length > 0
      ? getImageUrl(venue.gallery[0])
      : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  const logoUrl = getImageUrl(venue.logo);
  const isNew =
    venue.createdAt &&
    new Date() - new Date(venue.createdAt) < 1000 * 60 * 60 * 24 * 7;
  const matchPct = venue.recommendationScore
    ? Math.round(venue.recommendationScore * 100)
    : null;
  const mood = venue.matchedMood ? MOOD_LABEL[venue.matchedMood] : null;

  return (
    <motion.div
      whileHover={{ y: -8 }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative group h-[500px] w-full rounded-3xl overflow-hidden shadow-card transition-all duration-300"
    >
      <Link to={`/restaurant/${venue.slug}`} className="block h-full w-full">
        {/* Background Image */}
        <img
          src={imageUrl}
          alt={venue.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient overlay — clean single layer */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
          {/* Left: distance + match */}
          <div className="flex flex-col gap-2">
            {venue.distanceKm !== undefined && venue.distanceKm !== null && (
              <span className="bg-white/90 backdrop-blur-sm text-warm-900 text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Navigation size={10} />
                {venue.distanceKm} km away
              </span>
            )}
            {user && matchPct && (
              <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-semibold px-3 py-1 rounded-full">
                {matchPct}% Match
              </span>
            )}
          </div>

          {/* Right: heart + rating */}
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={e => {
                e.preventDefault();
                setIsSaved(s => !s);
              }}
              className="w-9 h-9 bg-white/15 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:bg-white/25 transition-all active:scale-90"
            >
              <Heart
                size={16}
                className={isSaved ? 'fill-current text-red-400' : 'text-white'}
              />
            </button>

            <div className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              {(venue.averageRating || 0).toFixed(1)}
              <Star size={11} className="fill-primary text-primary" />
            </div>
          </div>
        </div>

        {/* Bottom Content Card */}
        <div className="absolute bottom-5 left-5 right-5">
          <div
            className="backdrop-blur-xl rounded-2xl p-5 border border-white/40 shadow-xl group-hover:-translate-y-1.5 transition-transform duration-300 relative"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
          >
            {/* Logo */}
            {logoUrl && (
              <div className="absolute -top-6 left-5 w-12 h-12 bg-white rounded-xl p-1 shadow-lg border border-warm-200 overflow-hidden">
                <img
                  src={logoUrl}
                  className="w-full h-full object-cover rounded-lg"
                  alt="logo"
                />
              </div>
            )}

            {/* Name + location */}
            <div className={`mb-3 ${logoUrl ? 'mt-5' : ''}`}>
              <h3 className="text-lg font-bold text-warm-900 leading-snug line-clamp-1 mb-1">
                {venue.name}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-warm-500 font-medium flex items-center gap-1">
                  <MapPin size={10} className="text-primary" />
                  {venue.address?.city || 'Kathmandu'}
                </span>
                {mood && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                    {mood.emoji} {mood.label}
                  </span>
                )}
              </div>
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between border-t border-warm-200 pt-3">
              {/* Price dots + category */}
              <div className="flex items-center gap-2.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(s => (
                    <div
                      key={s}
                      className={`w-3 h-3 rounded-full ${
                        s <= (venue.priceRange || 2)
                          ? 'bg-primary'
                          : 'bg-warm-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-warm-500 uppercase tracking-wide truncate max-w-[70px]">
                  {venue.category?.name || 'Restro'}
                </span>
              </div>

              {/* View indicator */}
              <span className="text-primary text-xs font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all duration-300">
                View
                <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default RestaurantCard;
