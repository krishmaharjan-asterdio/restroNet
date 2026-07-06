import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import api from '../services/api';

export function MenuSuggestions({ venueId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    api.get(`/venues/${venueId}/menu-suggestions`)
      .then(res => setSuggestions(res.data.suggestions ?? []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [venueId]);

  if (!loading && !suggestions.length) return null;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-5 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="text-primary animate-pulse" size={18} />
          <span
            className="text-lg font-medium text-foreground"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            What to Order
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton h-4 w-2/5 rounded-lg" />
                <div className="skeleton h-3 w-4/5 rounded-lg" />
              </div>
            ))
          ) : (
            suggestions.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-snug">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.reason}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
