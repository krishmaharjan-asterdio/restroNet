import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, MapPin, Clock, Phone, Globe } from 'lucide-react';
import api from '../services/api';

const RestaurantDetail = () => {
  const { slug } = useParams();
  const [venue, setVenue] = useState(null);
  const [menus, setMenus] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVenueData();
  }, [slug]);

  const fetchVenueData = async () => {
    try {
      // 1. Fetch Venue Details
      const venueRes = await api.get(`/venues/${slug}`);
      const venueData = venueRes.data.venue;
      setVenue(venueData);

      // 2. Fetch Menus & Reviews concurrently
      const [menuRes, reviewRes] = await Promise.all([
        api.get(`/menu/venue/${venueData._id}`),
        api.get(`/reviews/venue/${venueData._id}`)
      ]);
      setMenus(menuRes.data.menus);
      setReviews(reviewRes.data.docs);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!venue) {
    return <div className="text-center p-20 text-2xl font-bold">Restaurant not found</div>;
  }

  const coverImage = venue.gallery?.length > 0 
    ? `http://localhost:5000${venue.gallery[0]}`
    : 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1920&q=80';

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Cover Banner */}
      <div className="h-80 w-full relative">
        <img src={coverImage} alt={venue.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-8 max-w-7xl mx-auto flex items-end justify-between">
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{venue.name}</h1>
            <div className="flex items-center gap-4 text-gray-200">
              <span className="flex items-center"><MapPin size={18} className="mr-1" /> {venue.address.city}</span>
              <span className="flex items-center"><Star size={18} className="mr-1 text-yellow-400 fill-current" /> {venue.averageRating.toFixed(1)} ({venue.totalReviews} reviews)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Info & Menus */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* About */}
          <div className="modern-card p-6">
            <h2 className="text-2xl font-bold mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">{venue.description || 'No description available.'}</p>
            
            <div className="mt-6 flex flex-wrap gap-2">
              {venue.cuisines.map(c => <span key={c._id} className="modern-chip">{c.name}</span>)}
              {venue.tags.map(t => <span key={t._id} className="modern-chip bg-orange-50 text-orange-700">{t.name}</span>)}
            </div>
          </div>

          {/* Menus */}
          <div className="modern-card p-6">
            <h2 className="text-2xl font-bold mb-6">Menu</h2>
            {menus.length === 0 ? (
              <p className="text-gray-500">Menu not available yet.</p>
            ) : (
              <div className="space-y-6">
                {menus.map(menu => (
                  <div key={menu._id}>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">{menu.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {menu.items.map(item => (
                        <div key={item._id} className="flex justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            {item.description && <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>}
                          </div>
                          <div className="font-semibold text-primary">₹{item.price}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="modern-card p-6">
            <h2 className="text-2xl font-bold mb-6">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-6">
                {reviews.map(review => (
                  <div key={review._id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                        {review.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold">{review.user?.name || 'Anonymous User'}</p>
                        <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="ml-auto flex items-center bg-green-50 text-green-700 px-2 py-1 rounded">
                        <span className="font-bold mr-1">{review.rating.overall}</span>
                        <Star size={14} className="fill-current" />
                      </div>
                    </div>
                    <h4 className="font-semibold mb-1">{review.title}</h4>
                    <p className="text-gray-700 text-sm">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Sidebar info */}
        <div className="space-y-6">
          <div className="modern-card p-6">
            <h3 className="font-bold text-lg mb-4">Location & Contact</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-gray-400 mt-1" size={20} />
                <span className="text-gray-700">{venue.address.street}, {venue.address.city}, {venue.address.country}</span>
              </div>
              {venue.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="text-gray-400" size={20} />
                  <span className="text-gray-700">{venue.phone}</span>
                </div>
              )}
              {venue.website && (
                <div className="flex items-center gap-3">
                  <Globe className="text-gray-400" size={20} />
                  <a href={venue.website} target="_blank" rel="noreferrer" className="text-primary hover:underline line-clamp-1">{venue.website}</a>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Opening Hours</h4>
              <div className="space-y-1 text-sm text-gray-600">
                {Object.entries(venue.openingHours).map(([day, hrs]) => (
                  <div key={day} className="flex justify-between capitalize">
                    <span>{day}</span>
                    <span>{hrs.isClosed ? 'Closed' : `${hrs.open} - ${hrs.close}`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RestaurantDetail;
