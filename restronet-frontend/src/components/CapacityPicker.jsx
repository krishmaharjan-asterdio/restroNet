import { useState, useEffect } from 'react';
import api from '../services/api';

export const CapacityPicker = ({ venueId, selectedDate, selectedTime, onTimeSelect }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!venueId || !selectedDate) {
      setHasData(false);
      setSlots([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.get(`/venues/${venueId}/slots?date=${selectedDate}`)
      .then(res => {
        if (cancelled) return;
        const fetched = res.data?.slots ?? [];
        setSlots(fetched);
        setHasData(fetched.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasData(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [venueId, selectedDate]);

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-7 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!hasData) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {slots.map(slot => (
        <button
          key={slot}
          type="button"
          onClick={() => onTimeSelect(slot)}
          className={
            slot === selectedTime
              ? 'px-3 py-1 text-sm rounded-full bg-indigo-600 text-white border-transparent cursor-pointer'
              : 'px-3 py-1 text-sm rounded-full border border-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer'
          }
        >
          {slot}
        </button>
      ))}
    </div>
  );
};
