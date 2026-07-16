import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ONBOARDED_KEY = 'rn_pref_onboarded';

const PRICE_OPTIONS = [
  { value: 1, label: 'Value',    symbol: '$',    desc: 'Budget friendly' },
  { value: 2, label: 'Standard', symbol: '$$',   desc: 'Moderate' },
  { value: 3, label: 'Premium',  symbol: '$$$',  desc: 'Upscale' },
  { value: 4, label: 'Elite',    symbol: '$$$$', desc: 'Luxury' },
];

const MOODS = [
  { id: 'romantic',        label: 'Romantic',       emoji: '💑' },
  { id: 'family-friendly', label: 'Family',         emoji: '👨‍👩‍👧' },
  { id: 'cafe',            label: 'Cafe & Coffee',  emoji: '☕' },
  { id: 'luxury',          label: 'Luxury Dining',  emoji: '✨' },
  { id: 'nightlife',       label: 'Nightlife',      emoji: '🍺' },
  { id: 'casual',          label: 'Casual Hangout', emoji: '😎' },
  { id: 'work-friendly',   label: 'Work Friendly',  emoji: '💻' },
  { id: 'aesthetic',       label: 'Aesthetic',      emoji: '📸' },
];

export const hasCompletedOnboarding = () => !!localStorage.getItem(ONBOARDED_KEY);
export const markOnboardingComplete = () => localStorage.setItem(ONBOARDED_KEY, '1');

/**
 * One-time cold-start preference capture. Three quick taps — cuisines, price
 * tier, mood — so a brand-new user gets personalized results immediately
 * instead of waiting for review/reservation history to accumulate.
 *
 * Cuisines and price persist to User.preferences (feeds the recommendation
 * engine's explicit-preference path). Mood isn't a stored preference — it's
 * handed back to Discover to apply as the first session's filter.
 */
const PreferenceOnboarding = ({ cuisines, onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [selectedCuisines, setSelectedCuisines] = useState([]);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggleCuisine = (id) => {
    setSelectedCuisines(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onSkip?.();
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const preferences = {};
      if (selectedCuisines.length) preferences.cuisines = selectedCuisines;
      if (selectedPrice) preferences.priceRange = selectedPrice;
      if (Object.keys(preferences).length) {
        await api.put('/auth/profile', { preferences });
      }
      markOnboardingComplete();
      onComplete?.({ mood: selectedMood });
    } catch (err) {
      toast.error('Could not save your preferences — you can set them later in your profile.');
      markOnboardingComplete();
      onComplete?.({ mood: selectedMood });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      title: 'What do you love to eat?',
      subtitle: 'Pick up to 5 cuisines — we\'ll tune your recommendations around them.',
      canContinue: selectedCuisines.length > 0,
      content: (
        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto pr-1">
          {cuisines.map(c => {
            const active = selectedCuisines.includes(c._id);
            return (
              <button
                key={c._id}
                onClick={() => toggleCuisine(c._id)}
                className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-all ${
                  active
                    ? 'bg-[#fa6500] text-white border-[#fa6500]'
                    : 'bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[#fa6500]/50'
                }`}
              >
                {active && <Check size={12} className="inline mr-1 -mt-0.5" />}
                {c.name}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: 'What\'s your usual budget?',
      subtitle: 'One tap — helps us stop showing places outside your range.',
      canContinue: selectedPrice !== null,
      content: (
        <div className="grid grid-cols-2 gap-3">
          {PRICE_OPTIONS.map(opt => {
            const active = selectedPrice === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedPrice(active ? null : opt.value)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? 'border-[#fa6500] bg-[#fa6500]/10'
                    : 'border-[hsl(var(--border))] hover:border-[#fa6500]/50'
                }`}
              >
                <div className="text-lg font-black" style={{ color: '#fa6500' }}>{opt.symbol}</div>
                <div className="text-sm font-bold text-[hsl(var(--foreground))]">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: 'What\'s the vibe today?',
      subtitle: 'Optional — we\'ll start your feed with this mood.',
      canContinue: true,
      content: (
        <div className="flex flex-wrap gap-2">
          {MOODS.map(m => {
            const active = selectedMood === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMood(active ? null : m.id)}
                className={`px-3.5 py-2 rounded-full text-sm font-semibold border transition-all ${
                  active
                    ? 'bg-[#fa6500] text-white border-[#fa6500]'
                    : 'bg-transparent text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[#fa6500]/50'
                }`}
              >
                {m.emoji} {m.label}
              </button>
            );
          })}
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg rounded-3xl p-7 shadow-2xl"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2 text-[#fa6500] text-xs font-bold uppercase tracking-widest">
              <Sparkles size={13} /> Personalize · {step + 1}/{steps.length}
            </div>
            <button
              onClick={handleSkip}
              className="text-muted-foreground hover:text-[hsl(var(--foreground))] transition-colors"
              aria-label="Skip personalization"
            >
              <X size={18} />
            </button>
          </div>

          <h2
            className="text-2xl font-semibold mb-1.5"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', color: 'hsl(var(--foreground))' }}
          >
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">{current.subtitle}</p>

          <div className="mb-7">{current.content}</div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-xs font-semibold text-muted-foreground hover:text-[hsl(var(--foreground))] transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={() => (isLast ? handleFinish() : setStep(step + 1))}
              disabled={!current.canContinue || saving}
              className="btn-primary text-sm px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : isLast ? 'Start exploring' : 'Next'}
              {!saving && <ChevronRight size={14} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PreferenceOnboarding;
