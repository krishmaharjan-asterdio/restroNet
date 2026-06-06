import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Heart, Navigation, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUrl';

const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
const MOOD_LABEL = {
  romantic:          { label: 'Romantic',       emoji: '💑' },
  'family-friendly': { label: 'Family',          emoji: '👨‍👩‍👧' },
  cafe:              { label: 'Cafe',             emoji: '☕' },
  luxury:            { label: 'Luxury',           emoji: '✨' },
  nightlife:         { label: 'Nightlife',        emoji: '🍺' },
  casual:            { label: 'Casual',           emoji: '😎' },
  'work-friendly':   { label: 'Work Friendly',    emoji: '💻' },
  aesthetic:         { label: 'Aesthetic',        emoji: '📸' },
};

/* Thin SVG ring that fills proportionally to a 0–100 score */
const ScoreRing = ({ pct, size = 36, stroke = 3 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      {/* Fill */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#fa6500" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round" />
    </svg>
  );
};

const RestaurantCard = ({ venue, showScoreBreakdown = false }) => {
  const { user } = useContext(AuthContext);
  const [isSaved, setIsSaved] = useState(false);

  const imageUrl =
    venue.gallery?.length > 0
      ? getImageUrl(venue.gallery[0])
      : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

  const logoUrl    = getImageUrl(venue.logo);
  const isNew      = venue.createdAt && new Date() - new Date(venue.createdAt) < 1000 * 60 * 60 * 24 * 7;
  const matchPct   = venue.recommendationScore ? Math.round(venue.recommendationScore * 100) : null;
  const mood       = venue.matchedMood ? MOOD_LABEL[venue.matchedMood] : null;
  const priceRange = venue.priceRange || 2;
  const rating     = (venue.averageRating || 0).toFixed(1);

  return (
    <motion.div
      whileHover={{ y: -6 }}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative group h-[480px] w-full rounded-3xl overflow-hidden cursor-pointer"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <Link to={`/restaurant/${venue.slug}`} className="block h-full w-full">

        {/* ── Full-bleed background photo ── */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <img
            src={imageUrl}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        </div>

        {/* ── Gradient overlay ── */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

        {/* ── Top vignette ── */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

        {/* ── Top badge row ── */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">

          {/* Left cluster: distance + new */}
          <div className="flex flex-col gap-1.5">
            {venue.distanceKm !== undefined && venue.distanceKm !== null && (
              <span className="inline-flex items-center gap-1 bg-white/95 text-neutral-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm tracking-wide">
                <Navigation size={9} strokeWidth={2.5} />
                {venue.distanceKm} km
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                ✦ New
              </span>
            )}
          </div>

          {/* Right cluster: match ring (if logged in) + heart + rating */}
          <div className="flex flex-col items-end gap-1.5">

            {/* Match score ring — replaces the plain pill */}
            {user && matchPct && (
              <div className="relative w-9 h-9 flex items-center justify-center">
                <ScoreRing pct={matchPct} size={36} stroke={2.5} />
                <span
                  className="absolute text-[9px] font-black text-white leading-none"
                  style={{ transform: 'rotate(0deg)' }}
                >
                  {matchPct}
                </span>
              </div>
            )}

            {/* Heart toggle */}
            <motion.button
              onClick={e => { e.preventDefault(); setIsSaved(s => !s); }}
              whileTap={{ scale: 0.84 }}
              className="w-9 h-9 bg-white/[0.12] backdrop-blur-md border border-white/25 rounded-full flex items-center justify-center hover:bg-white/25 transition-all duration-200 shadow-sm"
              aria-label={isSaved ? 'Unsave restaurant' : 'Save restaurant'}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={isSaved ? 'saved' : 'unsaved'}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <Heart
                    size={15}
                    strokeWidth={2}
                    className={isSaved ? 'fill-red-400 text-red-400' : 'text-white'}
                  />
                </motion.span>
              </AnimatePresence>
            </motion.button>

            {/* Rating pill */}
            <div className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-sm">
              <Star size={10} className="fill-amber-400 text-amber-400" strokeWidth={0} />
              {rating}
            </div>
          </div>
        </div>

        {/* ── Bottom info panel — glassmorphic ── */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div
            className="rcard-panel relative mx-0 rounded-b-3xl px-5 pt-4 pb-5 border-t border-white/20 group-hover:-translate-y-2 transition-transform duration-400"
            style={{
              background: 'rgba(255,255,255,0.93)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            {/* Logo */}
            {logoUrl && (
              <div
                className="absolute -top-5 right-5 w-11 h-11 rounded-xl overflow-hidden shadow-lg border border-white/60 dark:border-white/10"
                style={{ background: 'hsl(var(--card))' }}
              >
                <img src={logoUrl} alt={`${venue.name} logo`} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Restaurant name */}
            <h3
              className="font-bold text-neutral-900 dark:text-white leading-snug line-clamp-1 mb-1.5 pr-12"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.01em' }}
            >
              {venue.name}
            </h3>

            {/* Location + mood + match */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-white/55 font-medium">
                <MapPin size={10} className="text-[#fa6500]" strokeWidth={2.5} />
                {venue.address?.city || 'Kathmandu'}
              </span>
              {mood && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                  {mood.emoji} {mood.label}
                </span>
              )}
              {user && matchPct && matchPct >= 70 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50">
                  ✦ {matchPct >= 90 ? 'Great match' : matchPct >= 80 ? 'Good match' : 'Match'}
                </span>
              )}
            </div>

            {/* Footer: price + category | view CTA */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-200/70 dark:border-white/10">

              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-[2px]">
                  {[1, 2, 3, 4].map(s => (
                    <span
                      key={s}
                      className="text-[13px] font-black leading-none"
                      style={{ color: s <= priceRange ? '#fa6500' : '#d1c9be' }}
                    >
                      $
                    </span>
                  ))}
                </div>
                {venue.category?.name && (
                  <>
                    <span className="w-px h-3 bg-neutral-200 dark:bg-white/15" />
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-white/35 uppercase tracking-widest truncate max-w-[90px]">
                      {venue.category.name}
                    </span>
                  </>
                )}
              </div>

              {/* Animated view CTA */}
              <motion.span
                className="flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase"
                style={{ color: '#fa6500', letterSpacing: '0.1em' }}
                whileHover={{ gap: '6px' }}
              >
                View
                <ArrowRight size={12} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform duration-300" />
              </motion.span>
            </div>
          </div>
        </div>

      </Link>
    </motion.div>
  );
};

export default RestaurantCard;
