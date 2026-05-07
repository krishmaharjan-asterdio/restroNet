import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, MapPin, Phone, Globe, Clock, Heart, Share, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs } from 'antd';
import api from '../services/api';

const RestaurantDetail = () => {
  const { slug } = useParams();
  const [venue, setVenue] = useState(null);
  const [menus, setMenus] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVenueData();
    window.scrollTo(0, 0);
  }, [slug]);

  const fetchVenueData = async () => {
    try {
      const venueRes = await api.get(`/venues/${slug}`);
      const venueData = venueRes.data.venue;
      setVenue(venueData);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!venue) {
    return <div className="text-center p-20 text-2xl font-bold text-gray-800">Restaurant not found</div>;
  }

  const coverImage = venue.gallery?.length > 0 
    ? `http://localhost:5000${venue.gallery[0]}`
    : 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1920&q=80';

  // Ant Design Tabs for Menu/Reviews
  const tabItems = [
    {
      key: 'menu',
      label: <span className="text-lg font-bold">Menu</span>,
      children: menus.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-gray-500 font-medium">Menu is currently not available online.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {menus.map(menu => (
            <div key={menu._id}>
              <h3 className="text-2xl font-bold mb-6 text-gray-900 border-b-2 border-gray-100 pb-3">{menu.name}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {menu.items.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item._id} 
                    className="flex justify-between p-5 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100 hover:border-primary/20 hover:shadow-md group"
                  >
                    <div className="pr-4">
                      <h4 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">{item.name}</h4>
                      {item.description && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.description}</p>}
                    </div>
                    <div className="font-extrabold text-gray-900 text-lg">₹{item.price}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      key: 'reviews',
      label: <span className="text-lg font-bold">Reviews ({venue.totalReviews})</span>,
      children: reviews.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-gray-500 font-medium">No reviews yet. Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review._id} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-400 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                  {review.user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{review.user?.name || 'Anonymous User'}</p>
                  <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="ml-auto flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200">
                  <span className="font-bold mr-1">{review.rating.overall}</span>
                  <Star size={16} className="fill-current" />
                </div>
              </div>
              <h4 className="font-bold text-lg mb-2 text-gray-900">{review.title}</h4>
              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      )
    }
  ];

  return (
    <div className="bg-white min-h-screen pb-20">
      
      {/* ─── HEADER / HERO GALLERY ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight">{venue.name}</h1>
            <div className="flex items-center gap-4 text-gray-600 font-medium">
              <span className="flex items-center hover:text-primary cursor-pointer transition-colors"><MapPin size={18} className="mr-1" /> {venue.address.city}, {venue.address.country}</span>
              <span className="flex items-center"><Star size={18} className="mr-1 text-yellow-400 fill-current" /> <span className="font-bold text-gray-900 mr-1">{venue.averageRating.toFixed(1)}</span> ({venue.totalReviews} reviews)</span>
            </div>
          </div>
          <div className="hidden sm:flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-medium transition-colors">
              <Share size={18} /> Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-medium transition-colors">
              <Heart size={18} /> Save
            </button>
          </div>
        </div>

        {/* Masonry Image Gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[500px] rounded-3xl overflow-hidden mt-6">
          <div className="col-span-4 md:col-span-2 row-span-2 relative group cursor-pointer">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
          </div>
          {/* Fallback dummy images for a rich gallery look */}
          <div className="col-span-2 md:col-span-1 row-span-1 relative group overflow-hidden cursor-pointer">
             <img src="https://images.unsplash.com/photo-1414235077428-33898bd12252?auto=format&fit=crop&w=600&q=80" alt="Gallery 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="hidden md:block col-span-1 row-span-1 relative group overflow-hidden cursor-pointer">
             <img src="https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=600&q=80" alt="Gallery 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="col-span-2 md:col-span-1 row-span-1 relative group overflow-hidden cursor-pointer">
             <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80" alt="Gallery 3" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="hidden md:block col-span-1 row-span-1 relative group overflow-hidden cursor-pointer">
             <img src="https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=600&q=80" alt="Gallery 4" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
             <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 hover:bg-white transition-colors">
               <List size={16} /> Show all photos
             </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2">
          {/* Description & Features */}
          <div className="mb-12 pb-12 border-b border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">About this restaurant</h2>
            <p className="text-gray-700 leading-relaxed text-lg mb-8">{venue.description || 'Welcome to our restaurant. Experience the best dining with us.'}</p>
            
            <div className="flex flex-wrap gap-4">
              <div className="w-full sm:w-[48%] flex items-center gap-3">
                <CheckCircle2 className="text-primary" size={24} />
                <span className="font-medium text-gray-700">{venue.category?.name || 'Restaurant'} Category</span>
              </div>
              <div className="w-full sm:w-[48%] flex items-center gap-3">
                <CheckCircle2 className="text-primary" size={24} />
                <span className="font-medium text-gray-700">{venue.cuisines?.map(c => c.name).join(', ') || 'Various'} Cuisine</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {venue.tags?.map(t => (
                <span key={t._id} className="px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 bg-gray-50">{t.name}</span>
              ))}
            </div>
          </div>

          {/* Menu & Reviews Tabs */}
          <div className="restaurant-tabs">
            <Tabs defaultActiveKey="menu" items={tabItems} size="large" tabBarGutter={40} />
          </div>
        </div>

        {/* Right Column: Sticky Booking / Info Card */}
        <div className="relative">
          <div className="sticky top-28 bg-white border border-gray-200 rounded-3xl p-6 shadow-[0_10px_40px_rgb(0,0,0,0.08)]">
            <div className="flex justify-between items-end mb-6">
              <div>
                <span className="text-2xl font-extrabold text-gray-900">₹{venue.priceRange * 500}</span>
                <span className="text-gray-500 font-medium"> / person approx.</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="fill-current text-yellow-400" size={14} />
                <span className="font-bold text-gray-900 text-sm">{venue.averageRating.toFixed(1)}</span>
              </div>
            </div>

            <button className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl text-lg transition-all shadow-md active:scale-[0.98] mb-6">
              Reserve a Table
            </button>

            <div className="space-y-5 border-t border-gray-100 pt-6">
              <h3 className="font-bold text-lg text-gray-900">Location & Info</h3>
              
              <div className="flex items-start gap-4">
                <div className="mt-1"><MapPin className="text-gray-400" size={22} /></div>
                <div>
                  <p className="font-medium text-gray-900">{venue.address.street}</p>
                  <p className="text-gray-500 text-sm">{venue.address.city}, {venue.address.country}</p>
                </div>
              </div>

              {venue.phone && (
                <div className="flex items-center gap-4">
                  <div><Phone className="text-gray-400" size={22} /></div>
                  <span className="font-medium text-gray-900">{venue.phone}</span>
                </div>
              )}

              {venue.website && (
                <div className="flex items-center gap-4">
                  <div><Globe className="text-gray-400" size={22} /></div>
                  <a href={venue.website} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline line-clamp-1">{venue.website}</a>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6 mt-6">
              <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2"><Clock size={20} className="text-gray-400" /> Opening Hours</h3>
              <div className="space-y-3">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const hrs = venue.openingHours?.[day] || { isClosed: true };
                  const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day;
                  return (
                    <div key={day} className={`flex justify-between text-sm ${isToday ? 'font-bold text-primary bg-orange-50 p-2 rounded-lg -mx-2' : 'text-gray-600 font-medium'}`}>
                      <span className="capitalize">{day}</span>
                      <span>{hrs.isClosed ? 'Closed' : `${hrs.open} - ${hrs.close}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default RestaurantDetail;
