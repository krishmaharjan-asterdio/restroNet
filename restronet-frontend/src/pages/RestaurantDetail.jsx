import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Star, MapPin, Phone, Globe, Clock, Heart, Share, CheckCircle2, MessageSquarePlus, List, Calendar, Utensils, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, Modal, Form, Input, Rate, Button, Select } from 'antd';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import { getImageUrl } from '../utils/imageUrl';

// Fix for default Leaflet marker icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ venueCoords, userCoords }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (venueCoords) {
      const points = [[venueCoords[1], venueCoords[0]]];
      if (userCoords) points.push([userCoords.lat, userCoords.lng]);

      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [venueCoords, userCoords, map]);
  return null;
};

const RestaurantDetail = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const [venue, setVenue] = useState(null);
  const [menus, setMenus] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);

  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReservationModalVisible, setIsReservationModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [reviewForm] = Form.useForm();
  const [reservationForm] = Form.useForm();
  const [isGalleryModalVisible, setIsGalleryModalVisible] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn("Location access denied", err)
      );
    }
  }, []);

  useEffect(() => {
    fetchVenueData();
    window.scrollTo(0, 0);
  }, [slug, coords]);

  const fetchVenueData = async () => {
    try {
      const latLng = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : '';
      const venueRes = await api.get(`/venues/${slug}${latLng}`);
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

  const handleReviewSubmit = async (values) => {
    if (!user) {
      toast.error('Please login to submit a review');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/reviews/venue/${venue._id}`, {
        rating: { overall: values.rating },
        title: values.title,
        comment: values.comment
      });
      toast.success('Review submitted successfully!');
      setIsReviewModalVisible(false);
      reviewForm.resetFields();
      fetchVenueData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReservationSubmit = async (values) => {
    if (!user) {
      toast.error('Please login to make a reservation');
      return;
    }
    setSubmittingReservation(true);
    try {
      await api.post('/reservations', {
        venueId: venue._id,
        date: values.date,
        time: values.time,
        guests: values.guests,
        contactPhone: values.phone,
        specialRequests: values.requests
      });
      toast.success('Reservation request sent successfully!');
      setIsReservationModalVisible(false);
      reservationForm.resetFields();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to make reservation');
    } finally {
      setSubmittingReservation(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      toast.success('Review deleted successfully');
      fetchVenueData();
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center p-20 text-2xl font-medium text-warm-900" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
        Restaurant not found
      </div>
    );
  }

  const coverImage = venue.gallery?.length > 0
    ? getImageUrl(venue.gallery[0])
    : 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1920&q=80';

  // Ant Design Tabs for Menu/Reviews
  const tabItems = [
    {
      key: 'menu',
      label: <span className="text-sm font-semibold px-4">Items</span>,
      children: (
        <div className="pt-10">
          {menus.length === 0 ? (
            <div className="text-center py-16 bg-warm-50 rounded-3xl border border-dashed border-warm-200">
              <Utensils className="mx-auto text-warm-200 mb-4" size={48} />
              <p className="text-warm-500 font-medium">Digital menu items are currently not listed.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {menus.map(menu => (
                <div key={menu._id}>
                  <h3
                    className="text-2xl font-medium mb-6 text-warm-900 border-b border-warm-200 pb-3"
                    style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                  >
                    {menu.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {menu.items.map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item._id}
                        className="flex justify-between p-5 rounded-2xl hover:bg-warm-50 transition-colors border border-warm-200 hover:border-primary/20 hover:shadow-md group"
                      >
                        <div className="pr-4">
                          <h4 className="font-semibold text-warm-900 text-lg group-hover:text-primary transition-colors">{item.name}</h4>
                          {item.description && <p className="text-sm text-warm-500 mt-1 leading-relaxed">{item.description}</p>}
                        </div>
                        <div className="font-semibold text-warm-900 text-lg whitespace-nowrap">Npr {item.price}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'menu_images',
      label: <span className="text-sm font-semibold px-4">Menu Photos</span>,
      children: (
        <div className="pt-10">
          {venue.menu?.length === 0 ? (
            <div className="text-center py-16 bg-warm-50 rounded-3xl border border-dashed border-warm-200">
              <List className="mx-auto text-warm-200 mb-4" size={48} />
              <p className="text-warm-500 font-medium">No menu photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venue.menu.map((img, idx) => (
                <img
                  key={idx}
                  src={getImageUrl(img)}
                  className="w-full rounded-2xl border border-warm-200 shadow-sm"
                  alt={`Menu ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'reviews',
      label: <span className="text-sm font-semibold px-4">Reviews ({reviews.length})</span>,
      children: (
        <div className="pt-10 space-y-8">
          <div className="flex justify-between items-center mb-6">
            <h3
              className="text-2xl font-medium text-warm-900"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              User Reviews
            </h3>
            {user ? (
              <button
                onClick={() => setIsReviewModalVisible(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-5 rounded-xl shadow-primary transition-all"
              >
                <MessageSquarePlus size={16} /> Write a Review
              </button>
            ) : (
              <p className="text-sm font-medium text-warm-500">Log in to write a review</p>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-10 bg-warm-50 rounded-2xl border border-warm-200">
              <p className="text-warm-500 font-medium">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review._id} className="bg-white border border-warm-200 p-6 rounded-2xl shadow-card">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-400 text-white rounded-full flex items-center justify-center font-semibold text-xl shadow-sm">
                    {review.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-warm-900">{review.user?.name || 'Anonymous User'}</p>
                    <p className="text-sm text-warm-400">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200">
                      <span className="font-semibold mr-1">{review.rating.overall}</span>
                      <Star size={14} className="fill-current" />
                    </div>
                    {user && review.user && user._id === review.user._id && (
                      <button
                        onClick={() => handleDeleteReview(review._id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Delete your review"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="font-semibold text-lg mb-2 text-warm-900">{review.title}</h4>
                <p className="text-warm-600 leading-relaxed">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      )
    }
  ];

  return (
    <div className="bg-warm-50 min-h-screen pb-20">

      {/* ─── HEADER / HERO GALLERY ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4 mb-3">
              <h1
                className="text-4xl md:text-5xl font-medium text-warm-900 leading-tight"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                {venue.name}
              </h1>
              {venue.distanceKm && (
                <div className="bg-primary text-white px-3 py-1.5 rounded-full font-semibold text-xs flex items-center gap-1.5 shadow-primary mt-1">
                  <Navigation size={12} /> {venue.distanceKm} km away
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-5 text-warm-600 text-sm font-medium">
              <span className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
                <MapPin size={15} className="text-primary" /> {venue.address.city}, {venue.address.country}
              </span>
              <span className="flex items-center gap-1.5">
                <Star size={15} className="text-amber-400 fill-current" />
                <span className="font-bold text-warm-900">{venue.averageRating.toFixed(1)}</span>
                <span className="text-warm-400">({reviews.length} reviews)</span>
              </span>
            </div>
          </div>
          <div className="hidden sm:flex gap-3">
            <button className="bg-white border border-warm-200 rounded-xl px-4 py-2 text-sm font-medium text-warm-700 hover:bg-warm-50 flex items-center gap-2 transition-all">
              <Share size={16} /> Share
            </button>
            <button className="bg-white border border-warm-200 rounded-xl px-4 py-2 text-sm font-medium text-warm-700 hover:bg-warm-50 flex items-center gap-2 transition-all">
              <Heart size={16} /> Save
            </button>
          </div>
        </div>

        {/* Editorial Image Gallery — Asymmetric */}
        <div className="overflow-hidden rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 mt-10 h-auto md:h-[640px]">
          {/* Main Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="md:col-span-7 h-[360px] md:h-full relative group overflow-hidden rounded-2xl"
          >
            <img
              src={venue.gallery?.length > 0 ? getImageUrl(venue.gallery[0]) : coverImage}
              alt="Cover"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-black/8 group-hover:bg-transparent transition-colors"></div>
          </motion.div>

          {/* Right Column Staggered */}
          <div className="md:col-span-5 grid grid-cols-2 grid-rows-2 gap-3 h-full">
            {(venue.gallery || []).slice(1, 5).map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`${idx === 0 ? 'col-span-2 row-span-1 h-[220px]' : 'col-span-1 row-span-1 h-full'} relative group overflow-hidden rounded-2xl`}
              >
                <img
                  src={getImageUrl(img)}
                  alt={`Gallery ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/5" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Left Column: Details */}
        <div className="lg:col-span-2">

          {/* Description & Features */}
          <div className="mb-12 pb-12 border-b border-warm-200">
            <h2
              className="text-2xl font-medium text-warm-900 mb-4"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              About this restaurant
            </h2>
            <p className="text-warm-700 leading-relaxed text-base mb-8">{venue.description || 'Welcome to our restaurant. Experience the best dining with us.'}</p>

            {/* Category & Cuisine feature tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {venue.category?.name && (
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-warm-100 text-warm-700 border border-warm-200">
                  {venue.category.name}
                </span>
              )}
              {venue.cuisines?.map(c => (
                <span key={c._id || c.name} className="px-3 py-1.5 rounded-full text-sm font-medium bg-warm-100 text-warm-700 border border-warm-200">
                  {c.name}
                </span>
              ))}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {venue.tags?.map(t => (
                <span key={t._id} className="px-3 py-1.5 rounded-full text-sm font-medium bg-warm-100 text-warm-700 border border-warm-200">
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          {/* Location & Map Section */}
          <div className="mb-12 pb-12 border-b border-warm-200">
            <div className="flex justify-between items-center mb-6">
              <h2
                className="text-2xl font-medium text-warm-900"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                Location &amp; Directions
              </h2>
              {venue.distanceKm && (
                <span className="text-primary font-semibold text-sm flex items-center gap-1.5">
                  <Navigation size={13} /> {venue.distanceKm} km from you
                </span>
              )}
            </div>

            <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-warm-200 z-0 relative">
              <MapContainer
                center={[venue.location.coordinates[1], venue.location.coordinates[0]]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdater venueCoords={venue.location.coordinates} userCoords={coords} />

                {/* Restaurant Marker */}
                <Marker position={[venue.location.coordinates[1], venue.location.coordinates[0]]}>
                  <Popup>
                    <div className="p-2 font-semibold text-warm-900">{venue.name}</div>
                  </Popup>
                </Marker>

                {/* User Location Marker */}
                {coords && (
                  <Marker
                    position={[coords.lat, coords.lng]}
                    icon={L.divIcon({
                      className: 'user-location-marker',
                      html: `<div class="relative">
                        <div class="w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                        <div class="absolute -inset-2 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                      </div>`,
                      iconSize: [20, 20],
                      iconAnchor: [10, 10]
                    })}
                  >
                    <Popup>You are here</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            <div className="mt-4 p-5 bg-white rounded-2xl flex items-center gap-4 border border-warm-200">
              <div className="w-10 h-10 rounded-xl bg-warm-50 flex items-center justify-center text-primary flex-shrink-0">
                <MapPin size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-warm-900 truncate">{venue.address.street}</p>
                <p className="text-warm-500 text-xs mt-0.5 font-medium uppercase tracking-wider">{venue.address.city}, {venue.address.country}</p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${venue.location.coordinates[1]},${venue.location.coordinates[0]}`}
                target="_blank"
                rel="noreferrer"
                className="bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 rounded-xl shadow-primary transition-all text-sm whitespace-nowrap"
              >
                Get Directions
              </a>
            </div>
          </div>

          {/* Menu & Reviews Tabs */}
          <div className="restaurant-tabs mt-10">
            <Tabs
              defaultActiveKey="menu"
              items={tabItems}
              size="large"
              tabBarGutter={60}
              className="custom-tabs"
            />
          </div>
        </div>

        {/* Right Column: Sticky Booking / Info Card */}
        <div className="relative">
          <div className="bg-white rounded-2xl border border-warm-200 shadow-float p-6 sticky top-24">

            {/* Price & Rating */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <div
                  className="text-2xl font-medium text-warm-900"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                >
                  Npr {venue.priceRange * 500}
                  <span className="text-sm font-normal text-warm-400 ml-1">/ guest</span>
                </div>
                <div className="flex gap-1 mt-2 items-center text-sm font-extrabold">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4].map((s) => (
                      <span
                        key={s}
                        className={s <= (venue.priceRange || 2) ? 'text-amber-500' : 'text-warm-300'}
                      >
                        $
                      </span>
                    ))}
                  </div>
                  <span className="ml-2 text-[10px] font-semibold text-warm-400 uppercase tracking-wider">
                    {['Economy', 'Moderate', 'Premium', 'Elite'][venue.priceRange - 1] || 'Moderate'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-warm-50 px-3 py-1.5 rounded-xl border border-warm-200">
                <Star className="fill-primary text-primary" size={13} />
                <span className="font-bold text-warm-900 text-sm">{venue.averageRating.toFixed(1)}</span>
              </div>
            </div>

            {/* Reserve Button */}
            <button
              onClick={() => setIsReservationModalVisible(true)}
              className="bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 rounded-xl shadow-primary transition-all w-full text-base mb-6"
            >
              Reserve a Table
            </button>

            {/* Contact Info */}
            <div className="space-y-4 pt-6 border-t border-warm-200">
              <p className="text-xs font-semibold text-warm-400 uppercase tracking-widest">Location &amp; Contact</p>

              <div className="flex items-start gap-3 group">
                <div className="mt-0.5 w-9 h-9 rounded-xl bg-warm-50 flex items-center justify-center text-warm-400 group-hover:text-primary transition-colors flex-shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-warm-900 text-sm leading-tight">{venue.address.street}</p>
                  <p className="text-warm-500 text-xs mt-0.5">{venue.address.city}, {venue.address.country}</p>
                </div>
              </div>

              {venue.phone && (
                <div className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-warm-50 flex items-center justify-center text-warm-400 group-hover:text-primary transition-colors flex-shrink-0">
                    <Phone size={16} />
                  </div>
                  <span className="text-sm text-warm-600 font-medium">{venue.phone}</span>
                </div>
              )}

              {venue.website && (
                <div className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-xl bg-warm-50 flex items-center justify-center text-warm-400 group-hover:text-primary transition-colors flex-shrink-0">
                    <Globe size={16} />
                  </div>
                  <a href={venue.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline line-clamp-1">
                    {venue.website.replace(/(^\w+:|^)\/\//, '')}
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Review Modal */}
      <Modal
        title="Write a Review"
        open={isReviewModalVisible}
        onCancel={() => setIsReviewModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReviewSubmit} className="mt-4">
          <Form.Item label="Overall Rating" name="rating" rules={[{ required: true, message: 'Please provide a rating' }]}>
            <Rate className="text-yellow-400" />
          </Form.Item>
          <Form.Item label="Review Title" name="title" rules={[{ required: true, message: 'Please provide a title' }]}>
            <Input placeholder="Sum up your experience" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item label="Detailed Review" name="comment" rules={[{ required: true, message: 'Please share your details' }]}>
            <Input.TextArea rows={4} placeholder="What did you like or dislike?" className="rounded-lg" />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={submittingReview}
            size="large"
            className="w-full bg-primary hover:bg-primary-hover font-semibold rounded-xl border-none mt-2"
          >
            Submit Review
          </Button>
        </Form>
      </Modal>

      {/* Reservation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Calendar className="text-primary" size={20} />
            <span className="text-xl font-semibold">Reserve a Table at {venue.name}</span>
          </div>
        }
        open={isReservationModalVisible}
        onCancel={() => setIsReservationModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <Form form={reservationForm} layout="vertical" onFinish={handleReservationSubmit} className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: 'Select a date' }]}
            >
              <Input type="date" size="large" className="rounded-lg" />
            </Form.Item>
            <Form.Item
              label="Time"
              name="time"
              rules={[{ required: true, message: 'Select a time' }]}
            >
              <Select size="large" className="rounded-lg" placeholder="Select a time slot">
                {(() => {
                  const slots = [];
                  const selectedDate = reservationForm.getFieldValue('date') ? new Date(reservationForm.getFieldValue('date')) : new Date();
                  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                  const dayName = dayNames[selectedDate.getDay()];

                  const hours = venue.openingHours?.[dayName];

                  let openTime = "10:00";
                  let closeTime = "22:00";

                  if (hours && !hours.isClosed) {
                    if (hours.open) openTime = hours.open;
                    if (hours.close) closeTime = hours.close;
                  } else if (hours?.isClosed) {
                    return [<Select.Option key="closed" disabled>Restaurant is closed on this day</Select.Option>];
                  }

                  let current = new Date(`2024-01-01T${openTime}:00`);
                  const end = new Date(`2024-01-01T${closeTime}:00`);

                  if (end <= current) {
                    end.setDate(end.getDate() + 1);
                  }

                  while (current <= end) {
                    const timeStr = current.toTimeString().substring(0, 5);
                    slots.push(<Select.Option key={timeStr} value={timeStr}>{timeStr}</Select.Option>);
                    current.setMinutes(current.getMinutes() + 30);
                  }
                  return slots;
                })()}
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="Number of Guests"
            name="guests"
            rules={[{ required: true, message: 'How many people?' }]}
            initialValue={2}
          >
            <Select size="large" className="rounded-lg">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <Select.Option key={n} value={n}>{n} Guests</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Contact Phone"
            name="phone"
            rules={[{ required: true, message: 'Enter your phone number' }]}
          >
            <Input placeholder="e.g. +977 9801234567" size="large" className="rounded-lg" />
          </Form.Item>

          <Form.Item label="Special Requests (Optional)" name="requests">
            <Input.TextArea rows={3} placeholder="Birthday surprise, window seat, allergies..." className="rounded-lg" />
          </Form.Item>

          <div className="bg-warm-50 p-4 rounded-xl mb-6 border border-warm-200">
            <p className="text-sm text-warm-500 leading-relaxed text-center italic">
              "Your reservation will be pending until confirmed by the restaurant owner. You will receive a notification."
            </p>
          </div>
          <Button
            type="primary"
            htmlType="submit"
            loading={submittingReservation}
            size="large"
            className="w-full bg-primary hover:bg-primary-hover h-14 text-base font-semibold rounded-xl border-none shadow-primary"
          >
            Request Reservation
          </Button>
        </Form>
      </Modal>

      {/* Gallery Modal */}
      <Modal
        title={
          <span
            className="text-2xl font-medium text-warm-900"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            Restaurant Gallery
          </span>
        }
        open={isGalleryModalVisible}
        onCancel={() => setIsGalleryModalVisible(false)}
        footer={null}
        width={1000}
        centered
        className="gallery-modal"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
          {venue.gallery?.map((img, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              className="aspect-square rounded-2xl overflow-hidden border border-warm-200"
            >
              <img
                src={getImageUrl(img)}
                alt={`Gallery ${idx}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => window.open(getImageUrl(img), '_blank')}
              />
            </motion.div>
          ))}
        </div>
      </Modal>

    </div>
  );
};

export default RestaurantDetail;
