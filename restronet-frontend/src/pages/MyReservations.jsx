import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Clock as ClockIcon, Phone, Utensils } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <CheckCircle size={14} /> Confirmed
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <XCircle size={14} /> Cancelled
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <CheckCircle size={14} /> Completed
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <ClockIcon size={14} /> Pending
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Reservations</h1>
        <p className="text-gray-500 mt-2 font-medium">Track your upcoming and past table bookings.</p>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Calendar className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-bold text-lg">No reservations found.</p>
          <p className="text-gray-400 mt-1">Ready for a meal? Explore restaurants and book a table!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reservations.map((res, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={res._id}
              className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 items-start"
            >
              {/* Restaurant Logo */}
              <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                {res.venue?.logo ? (
                  <img 
                    src={`http://localhost:5000${res.venue.logo}`} 
                    className="w-full h-full object-cover" 
                    alt={res.venue.name} 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary font-bold text-2xl">
                    {res.venue?.name?.charAt(0)}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{res.venue?.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={14} /> {res.venue?.address?.street}, {res.venue?.address?.city}
                    </p>
                  </div>
                  {getStatusDisplay(res.status)}
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Calendar className="text-primary" size={18} />
                    <span>{new Date(res.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Clock className="text-primary" size={18} />
                    <span>{res.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Utensils className="text-primary" size={18} />
                    <span>{res.guests} Guests</span>
                  </div>
                </div>

                {res.specialRequests && (
                  <div className="bg-gray-50 p-3 rounded-xl mt-3 text-sm text-gray-600 italic">
                    " {res.specialRequests} "
                  </div>
                )}
              </div>

              {/* Status Note */}
              <div className="w-full md:w-48 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-6 flex flex-col justify-center">
                {res.status === 'pending' ? (
                  <p className="text-xs text-gray-400 leading-relaxed italic">
                    The restaurant is reviewing your request. We'll update you soon!
                  </p>
                ) : res.status === 'confirmed' ? (
                  <div className="text-center">
                     <p className="text-xs text-green-600 font-bold mb-2">Great! You're all set.</p>
                     <div className="p-2 bg-green-50 rounded-lg text-green-700 font-mono text-[10px] text-center">
                        CONFIRMATION: #{res._id.slice(-6).toUpperCase()}
                     </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    This reservation is {res.status}.
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReservations;
