import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  CalendarX,
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

  const handleCancel = async (reservationId) => {
    try {
      await api.put(`/reservations/${reservationId}/cancel`);
      toast.success('Reservation cancelled');
      setReservations(prev =>
        prev.map(r => r._id === reservationId ? { ...r, status: 'cancelled' } : r)
      );
    } catch (err) {
      toast.error('Failed to cancel reservation');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="badge badge-success">
            <CheckCircle size={10} />
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="badge badge-neutral">
            <XCircle size={10} />
            Cancelled
          </span>
        );
      case 'completed':
        return (
          <span className="badge badge-neutral">
            <CheckCircle size={10} />
            Completed
          </span>
        );
      default:
        return (
          <span className="badge badge-warning">
            <ClockIcon size={10} />
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        {/* Header */}
        <div className="section-container pt-12 pb-8">
          <p className="text-label mb-3">Your Bookings</p>
          <h1
            className="font-medium text-foreground"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              lineHeight: 1.0,
              letterSpacing: '-0.01em',
            }}
          >
            My <em>Reservations</em>
          </h1>
        </div>

        {/* Skeleton cards */}
        <div className="section-container pb-16 flex flex-col gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">

      {/* Header section */}
      <div className="section-container pt-12 pb-8">
        <p className="text-label mb-3">Your Bookings</p>
        <h1
          className="font-medium text-foreground mb-2"
          style={{
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            lineHeight: 1.0,
            letterSpacing: '-0.01em',
          }}
        >
          My <em>Reservations</em>
        </h1>
        <p className="text-sm text-muted-foreground font-medium max-w-sm">
          Track your upcoming and past table bookings.
        </p>
      </div>

      <div className="section-container pb-16">

        {/* Empty state */}
        {reservations.length === 0 ? (
          <div className="card p-16 text-center border-dashed flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ backgroundColor: 'hsl(var(--surface))' }}>
              <CalendarX size={28} className="text-muted-foreground" />
            </div>
            <p
              className="font-medium text-foreground mb-1"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.4rem, 3vw, 1.75rem)' }}
            >
              No reservations yet
            </p>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-6">
              Ready for a meal? Explore restaurants and book a table in just a few taps.
            </p>
            <button
              onClick={() => navigate('/restaurants')}
              className="btn-primary text-sm px-6 py-2.5"
            >
              Discover Restaurants
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reservations.map((res) => (
              <div
                key={res._id}
                className="card p-5"
              >
                <div className="flex items-start gap-4">

                  {/* Restaurant logo / thumbnail */}
                  <div className="w-14 h-14 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--surface))' }}>
                    {getImageUrl(res.venue?.logo) ? (
                      <img
                        src={getImageUrl(res.venue.logo)}
                        className="w-full h-full object-cover"
                        alt={res.venue?.name}
                      />
                    ) : (
                      <span className="text-xl font-bold text-primary shrink-0">
                        {res.venue?.name?.charAt(0) ?? '?'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: name + status + cancel */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="min-w-0">
                        <p className="font-bold text-foreground leading-tight truncate text-base">
                          {res.venue?.name}
                        </p>
                        {/* Confirmation ID */}
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono tracking-wider opacity-70">
                          #{res._id.slice(-8).toUpperCase()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusBadge(res.status)}

                        {(res.status === 'pending' || res.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancel(res._id)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detail chips row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                        <Calendar size={13} className="text-primary shrink-0" />
                        {new Date(res.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                        <Clock size={13} className="text-primary shrink-0" />
                        {res.time}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                        <Users size={13} className="text-primary shrink-0" />
                        {res.guests} {res.guests === 1 ? 'Guest' : 'Guests'}
                      </span>
                    </div>

                    {/* Special requests */}
                    {res.specialRequests && (
                      <div
                        className="mt-3 rounded-xl px-4 py-2.5 text-xs italic leading-relaxed"
                        style={{
                          backgroundColor: 'hsl(var(--surface))',
                          color: 'hsl(var(--muted-foreground))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      >
                        "{res.specialRequests}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReservations;
