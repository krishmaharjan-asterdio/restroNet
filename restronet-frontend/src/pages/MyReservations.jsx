import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Utensils,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../utils/imageUrl';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyReservations();
  }, []);

  const fetchMyReservations = async () => {
    try {
      const res = await api.get('/reservations/my');
      setReservations(res.data.reservations);
    } catch (err) {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="badge-success flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
            <CheckCircle size={11} />
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge-error flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
            <XCircle size={11} />
            Cancelled
          </span>
        );
      case 'completed':
        return (
          <span className="badge-neutral flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
            <CheckCircle size={11} />
            Completed
          </span>
        );
      default:
        return (
          <span className="badge-warning flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
            <ClockIcon size={11} />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-warm-200 border-t-primary animate-spin" />
          <p className="text-sm text-warm-500 font-medium">Loading your reservations…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-warm-50 min-h-[calc(100vh-80px)]">
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-medium text-warm-900"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            My Reservations
          </h1>
          <p className="text-warm-500 text-sm mt-1 font-medium">
            Track your upcoming and past table bookings.
          </p>
        </div>

        {/* Empty state */}
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-warm-200 shadow-card text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-warm-100 flex items-center justify-center mb-4">
              <Calendar className="text-warm-400" size={26} />
            </div>
            <p className="text-warm-900 font-bold text-lg">No reservations yet</p>
            <p className="text-warm-500 text-sm mt-1 max-w-xs leading-relaxed">
              Ready for a meal? Explore restaurants and book a table in just a few taps.
            </p>
            <button
              onClick={() => navigate('/restaurants')}
              className="mt-6 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-primary text-sm"
            >
              Explore Restaurants
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {reservations.map((res, index) => (
              <motion.div
                key={res._id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07, duration: 0.35, ease: 'easeOut' }}
                className="bg-white rounded-2xl border border-warm-200 shadow-card p-5 flex flex-col gap-4 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Top row: logo + name + status */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl border border-warm-200 overflow-hidden bg-warm-100 shrink-0">
                    {getImageUrl(res.venue?.logo) ? (
                      <img
                        src={getImageUrl(res.venue.logo)}
                        className="w-full h-full object-cover"
                        alt={res.venue?.name}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">
                        {res.venue?.name?.charAt(0) ?? '?'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-warm-900 leading-tight truncate">
                      {res.venue?.name}
                    </p>
                    {(res.venue?.address?.street || res.venue?.address?.city) && (
                      <p className="text-sm text-warm-600 flex items-center gap-1.5 mt-0.5 truncate">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">
                          {[res.venue?.address?.street, res.venue?.address?.city]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">{getStatusBadge(res.status)}</div>
                </div>

                {/* Detail rows */}
                <div className="flex flex-col gap-2 border-t border-warm-100 pt-3">
                  <div className="text-sm text-warm-600 flex items-center gap-2">
                    <Calendar size={14} className="text-primary shrink-0" />
                    <span className="font-medium">
                      {new Date(res.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-warm-600 flex items-center gap-2">
                    <Clock size={14} className="text-primary shrink-0" />
                    <span className="font-medium">{res.time}</span>
                  </div>
                  <div className="text-sm text-warm-600 flex items-center gap-2">
                    <Utensils size={14} className="text-primary shrink-0" />
                    <span className="font-medium">
                      {res.guests} {res.guests === 1 ? 'Guest' : 'Guests'}
                    </span>
                  </div>
                </div>

                {/* Special requests */}
                {res.specialRequests && (
                  <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3 text-xs text-warm-600 italic leading-relaxed">
                    "{res.specialRequests}"
                  </div>
                )}

                {/* Confirmation note */}
                {res.status === 'confirmed' && (
                  <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
                    <span className="text-xs text-emerald-700 font-semibold">You're all set!</span>
                    <span className="font-mono text-[10px] text-emerald-600 bg-emerald-100 rounded-lg px-2 py-1 tracking-wider">
                      #{res._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                )}

                {res.status === 'pending' && (
                  <p className="text-xs text-warm-400 italic leading-relaxed">
                    The restaurant is reviewing your request — we'll keep you posted.
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;
