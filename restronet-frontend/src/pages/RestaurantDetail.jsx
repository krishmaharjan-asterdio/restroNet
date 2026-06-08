import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Phone, Globe, Clock, Heart, Share2, ArrowLeft,
  CheckCircle2, MessageSquarePlus, List, Calendar, Utensils,
  Navigation, Users, ChevronLeft, ChevronRight, ExternalLink,
  Camera, X, Trash2, ChevronDown, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, Modal, Form, Input, Rate, Button, Select } from 'antd';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import { MenuSuggestions } from '../components/MenuSuggestions';
import { CapacityPicker } from '../components/CapacityPicker';
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

// Custom orange marker
const OrangeMarkerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 36px; height: 36px; border-radius: 50% 50% 50% 0;
    background: #fa6500; border: 3px solid white;
    box-shadow: 0 4px 16px rgba(250,101,0,0.5);
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
  "><div style="transform: rotate(45deg); color: white; font-size: 14px;">📍</div></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

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

// Price range label
const PRICE_LABELS = ['Economy', 'Moderate', 'Premium', 'Elite'];

// ────────────────────────────────────────────────────────────────────────────

const ReservationTimeField = ({ venue, form }) => {
  const selectedDate = Form.useWatch('date', form);
  const selectedTime = Form.useWatch('time', form);
  return (
    <>
      <Form.Item label="Time" name="time" rules={[{ required: true, message: 'Select a time' }]}>
        <Select size="large" className="rounded-xl" placeholder="Select a time slot">
          {(() => {
            const slots = [];
            const dateVal = selectedDate ? new Date(selectedDate) : new Date();
            const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
            const dayName = dayNames[dateVal.getDay()];
            const hours = venue.openingHours?.[dayName];
            let openTime = '10:00';
            let closeTime = '22:00';
            if (hours && !hours.isClosed) {
              if (hours.open) openTime = hours.open;
              if (hours.close) closeTime = hours.close;
            } else if (hours?.isClosed) {
              return [<Select.Option key="closed" disabled>Restaurant is closed on this day</Select.Option>];
            }
            let current = new Date(`2024-01-01T${openTime}:00`);
            const end = new Date(`2024-01-01T${closeTime}:00`);
            if (end <= current) end.setDate(end.getDate() + 1);
            while (current <= end) {
              const timeStr = current.toTimeString().substring(0, 5);
              slots.push(<Select.Option key={timeStr} value={timeStr}>{timeStr}</Select.Option>);
              current.setMinutes(current.getMinutes() + 30);
            }
            return slots;
          })()}
        </Select>
      </Form.Item>
      <CapacityPicker
        venueId={venue._id}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onTimeSelect={(time) => form.setFieldValue('time', time)}
      />
    </>
  );
};

const RestaurantDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [venue, setVenue] = useState(null);
  const [menus, setMenus] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState({});

  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReservationModalVisible, setIsReservationModalVisible] = useState(false);
  const [isGalleryModalVisible, setIsGalleryModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [reviewForm] = Form.useForm();
  const [reservationForm] = Form.useForm();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn('Location access denied', err)
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
    if (!user) { toast.error('Please login to submit a review'); return; }
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
    if (!user) { toast.error('Please login to make a reservation'); return; }
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: venue?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const toggleReviewExpanded = (id) => {
    setExpandedReviews(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── LOADING STATE ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero skeleton */}
        <div className="h-[65vh] min-h-[400px] skeleton w-full" />
        <div className="section-container">
          <div className="bg-card rounded-t-3xl -mt-8 relative z-10 shadow-float p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="skeleton h-10 w-2/3 rounded-xl" />
                <div className="skeleton h-5 w-1/3 rounded-xl" />
                <div className="flex gap-2 mt-4">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-7 w-20 rounded-full" />)}
                </div>
              </div>
              <div className="space-y-4">
                <div className="skeleton h-12 w-full rounded-xl" />
                <div className="skeleton h-8 w-3/4 rounded-xl" />
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="skeleton h-[350px] w-full rounded-2xl" />
            </div>
            <div className="skeleton h-[400px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <p
          className="text-3xl font-medium text-foreground"
          style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
        >
          Restaurant not found
        </p>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft size={16} /> Go back
        </button>
      </div>
    );
  }

  const galleryImages = venue.gallery?.length > 0
    ? venue.gallery.map(img => getImageUrl(img))
    : ['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1920&q=80'];

  const coverImage = galleryImages[0];

  // ── TAB ITEMS ──────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'menu',
      label: <span className="text-sm font-semibold px-3">Menu Items</span>,
      children: (
        <div className="pt-8">
          {menus.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-3xl border border-border border-dashed">
              <Utensils className="mx-auto text-muted-foreground mb-4 opacity-40" size={44} />
              <p className="text-muted-foreground font-medium">Digital menu items are currently not listed.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {menus.map(menu => (
                <div key={menu._id}>
                  <h3
                    className="text-2xl font-medium mb-5 text-foreground border-b border-border pb-3"
                    style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                  >
                    {menu.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menu.items.map((item, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        key={item._id}
                        className="flex justify-between items-start p-5 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all group"
                      >
                        <div className="pr-4 flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors leading-snug">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div className="font-semibold text-primary text-base whitespace-nowrap pl-2 flex-shrink-0">
                          Npr {item.price}
                        </div>
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
      label: <span className="text-sm font-semibold px-3">Menu Photos</span>,
      children: (
        <div className="pt-8">
          {!venue.menu || venue.menu.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-3xl border border-border border-dashed">
              <List className="mx-auto text-muted-foreground mb-4 opacity-40" size={44} />
              <p className="text-muted-foreground font-medium">No menu photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venue.menu.map((img, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.06 }}
                  className="rounded-2xl overflow-hidden border border-border aspect-[4/3]"
                >
                  <img
                    src={getImageUrl(img)}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    alt={`Menu ${idx + 1}`}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'reviews',
      label: <span className="text-sm font-semibold px-3">Reviews ({reviews.length})</span>,
      children: (
        <div className="pt-8 space-y-6">
          {/* Reviews header */}
          <div className="flex justify-between items-center">
            <h3
              className="text-2xl font-medium text-foreground"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
            >
              Guest Reviews
            </h3>
            {user ? (
              <button
                onClick={() => setIsReviewModalVisible(true)}
                className="btn-primary py-2.5 px-5 text-sm"
              >
                <MessageSquarePlus size={15} /> Write a Review
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                <a href="/login" className="text-primary hover:underline font-semibold">Log in</a> to write a review
              </p>
            )}
          </div>

          {/* AI Review Summary Card */}
          {venue && venue.aiSummary && venue.aiSummary.summaryText && (
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary animate-pulse" size={18} />
                <h4
                  className="text-lg font-medium text-foreground"
                  style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                >
                  AI Review Summary & Insights
                </h4>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {venue.aiSummary.summaryText === 'No detailed feedback has been left by diners yet.'
                  ? 'Be the first to share your experience at this restaurant.'
                  : venue.aiSummary.summaryText}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                {/* Positives */}
                {venue.aiSummary.positives?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Diner Favorites</span>
                    <div className="flex flex-col gap-1.5">
                      {venue.aiSummary.positives.map((pos, idx) => (
                        <span key={idx} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-1.5 px-3 rounded-lg text-xs font-medium border border-emerald-500/20">
                          <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                          {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constructives */}
                {venue.aiSummary.constructives?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Good to Know</span>
                    <div className="flex flex-col gap-1.5">
                      {venue.aiSummary.constructives.map((con, idx) => (
                        <span key={idx} className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 py-1.5 px-3 rounded-lg text-xs font-medium border border-amber-500/20">
                          <span className="flex-shrink-0">→</span>
                          {con}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-2xl border border-border">
              <MessageSquarePlus className="mx-auto text-muted-foreground mb-3 opacity-30" size={40} />
              <p className="text-muted-foreground font-medium">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, idx) => {
                const isExpanded = expandedReviews[review._id];
                const isLong = review.comment?.length > 180;
                return (
                  <motion.div
                    key={review._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-card border border-border p-5 rounded-2xl shadow-card"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #fa6500, #f97316)' }}>
                        {review.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{review.user?.name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                              <Star size={12} className="fill-current" />
                              <span className="text-xs font-bold">{review.rating?.overall}</span>
                            </div>
                            {user && review.user && user._id === review.user._id && (
                              <button
                                onClick={() => handleDeleteReview(review._id)}
                                className="text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition-colors"
                                title="Delete review"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {review.title && (
                      <p className="font-semibold text-foreground text-sm mb-1.5">{review.title}</p>
                    )}
                    <p className={`text-muted-foreground text-sm leading-relaxed ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>
                      {review.comment}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => toggleReviewExpanded(review._id)}
                        className="text-primary text-xs font-semibold mt-2 hover:underline flex items-center gap-1"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                        <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'info',
      label: <span className="text-sm font-semibold px-3">Info & Map</span>,
      children: (
        <div className="pt-8 space-y-6">
          {/* Hours */}
          {venue.openingHours && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Opening Hours
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                  const h = venue.openingHours?.[day];
                  return (
                    <div key={day} className="flex justify-between items-center py-2 border-b border-border last:border-0 sm:last-of-type:border-0">
                      <span className="text-sm font-medium text-foreground capitalize">{day}</span>
                      {h?.isClosed ? (
                        <span className="badge badge-error text-xs">Closed</span>
                      ) : h?.open ? (
                        <span className="text-sm text-muted-foreground">{h.open} — {h.close}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Map */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              Location
            </h4>
            <div className="rounded-2xl overflow-hidden h-[280px] border border-border relative z-0">
              <MapContainer
                center={[venue.location.coordinates[1], venue.location.coordinates[0]]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapUpdater venueCoords={venue.location.coordinates} userCoords={coords} />
                <Marker
                  position={[venue.location.coordinates[1], venue.location.coordinates[0]]}
                  icon={OrangeMarkerIcon}
                >
                  <Popup>
                    <div className="p-2 font-semibold text-foreground">{venue.name}</div>
                  </Popup>
                </Marker>
                {coords && (
                  <Marker
                    position={[coords.lat, coords.lng]}
                    icon={L.divIcon({
                      className: 'user-location-marker',
                      html: `<div style="position:relative;">
                        <div style="width:18px;height:18px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.6);"></div>
                        <div style="position:absolute;inset:-5px;background:rgba(59,130,246,0.2);border-radius:50%;animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite;"></div>
                      </div>`,
                      iconSize: [18, 18],
                      iconAnchor: [9, 9]
                    })}
                  >
                    <Popup>You are here</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
            <div className="mt-3 p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-primary flex-shrink-0">
                <MapPin size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{venue.address.street}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{venue.address.city}, {venue.address.country}</p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${venue.location.coordinates[1]},${venue.location.coordinates[0]}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary py-2 px-4 text-sm whitespace-nowrap"
              >
                <Navigation size={13} /> Directions
              </a>
            </div>
          </div>

          {/* Contact */}
          {(venue.phone || venue.website) && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
              <h4 className="font-semibold text-foreground mb-4">Contact</h4>
              <div className="space-y-3">
                {venue.phone && (
                  <a href={`tel:${venue.phone}`} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <Phone size={16} />
                    </div>
                    <span className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">{venue.phone}</span>
                  </a>
                )}
                {venue.website && (
                  <a href={venue.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <Globe size={16} />
                    </div>
                    <span className="text-sm text-primary hover:underline line-clamp-1">
                      {venue.website.replace(/(^\w+:|^)\/\//, '')}
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-background min-h-screen pb-24">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative h-[65vh] min-h-[400px] overflow-hidden">
        {/* Hero image */}
        <motion.img
          key={galleryImages[galleryIndex]}
          src={galleryImages[galleryIndex]}
          alt={venue.name}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* Top controls bar */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-5 md:p-7 z-10">
          {/* Back button */}
          <motion.button
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all text-sm shadow-lg"
          >
            <ArrowLeft size={16} /> Back
          </motion.button>

          {/* Share + Favorite */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2"
          >
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-white/15 backdrop-blur-md border border-white/25 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all text-sm shadow-lg"
            >
              <Share2 size={15} /> Share
            </button>
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`flex items-center gap-1.5 backdrop-blur-md border border-white/25 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-lg ${
                isSaved
                  ? 'bg-primary text-white border-primary/50'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Heart size={15} className={isSaved ? 'fill-current' : ''} />
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </motion.div>
        </div>

        {/* Bottom hero content: name preview + gallery controls */}
        <div className="absolute bottom-0 left-0 right-0 px-5 md:px-10 pb-14 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {venue.distanceKm && (
              <div className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-primary mb-3">
                <Navigation size={11} /> {venue.distanceKm} km away
              </div>
            )}
          </motion.div>

          {/* Gallery dots + view all */}
          {galleryImages.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {galleryImages.slice(0, 6).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`transition-all rounded-full ${
                      i === galleryIndex
                        ? 'w-6 h-2 bg-white'
                        : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setIsGalleryModalVisible(true)}
                className="flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-white/25 transition-all"
              >
                <Camera size={13} /> View All ({galleryImages.length})
              </button>
            </motion.div>
          )}
        </div>

        {/* Gallery nav arrows */}
        {galleryImages.length > 1 && (
          <>
            <button
              onClick={() => setGalleryIndex(i => (i - 1 + galleryImages.length) % galleryImages.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setGalleryIndex(i => (i + 1) % galleryImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/50 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* ── INFO PANEL — overlaps hero ─────────────────────────────────────── */}
      <div className="relative z-10">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="bg-card rounded-t-3xl -mt-8 shadow-float border border-border border-b-0"
          >
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">

                {/* Left: name + meta */}
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-4xl md:text-5xl font-medium text-foreground leading-tight mb-3"
                    style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                  >
                    {venue.name}
                  </h1>

                  {/* Address */}
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-4">
                    <MapPin size={14} className="text-primary flex-shrink-0" />
                    <span>{venue.address.street}, {venue.address.city}, {venue.address.country}</span>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {venue.category?.name && (
                      <span className="badge badge-primary">{venue.category.name}</span>
                    )}
                    {venue.cuisines?.slice(0, 3).map(c => (
                      <span key={c._id || c.name} className="badge badge-neutral">{c.name}</span>
                    ))}
                    {venue.tags?.slice(0, 3).map(t => (
                      <span key={t._id} className="badge badge-neutral">{t.name}</span>
                    ))}
                  </div>

                  {/* Description */}
                  {venue.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
                      {venue.description}
                    </p>
                  )}
                </div>

                {/* Right: rating + price + CTA */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-5 md:gap-4 flex-shrink-0">
                  {/* Rating */}
                  <div className="text-center md:text-right">
                    <div className="flex items-center gap-2 justify-center md:justify-end">
                      <span
                        className="text-4xl font-medium text-foreground"
                        style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                      >
                        {venue.averageRating?.toFixed(1)}
                      </span>
                      <div className="flex flex-col items-start">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star
                              key={s}
                              size={14}
                              className={s <= Math.round(venue.averageRating) ? 'text-amber-400 fill-current' : 'text-muted-foreground/30'}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {/* Price range */}
                    <div className="flex items-center gap-1.5 justify-center md:justify-end mt-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4].map(s => (
                          <span key={s} className={`text-sm font-black ${s <= (venue.priceRange || 2) ? 'text-amber-500' : 'text-muted-foreground/25'}`}>
                            $
                          </span>
                        ))}
                      </div>
                      <span className="text-label">{PRICE_LABELS[(venue.priceRange || 2) - 1]}</span>
                    </div>
                  </div>

                  {/* Reserve CTA */}
                  <button
                    onClick={() => setIsReservationModalVisible(true)}
                    className="btn-primary whitespace-nowrap"
                  >
                    <Calendar size={16} /> Reserve a Table
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── TWO COLUMN LAYOUT ───────────────────────────────────────────── */}
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-0">

            {/* ── LEFT: Tabs content ──────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border border-t-0 rounded-b-3xl shadow-float px-6 md:px-8 pb-8">
                <div className="restaurant-tabs">
                  <Tabs
                    defaultActiveKey="menu"
                    items={tabItems}
                    size="large"
                    tabBarGutter={40}
                  />
                </div>
              </div>
            </div>

            {/* ── RIGHT: Sidebar ──────────────────────────────────────────── */}
            <div className="relative">
              <div className="sticky top-24 space-y-4">

                {/* Reserve Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className="text-xl font-medium text-foreground"
                      style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                    >
                      Reserve a Table
                    </h3>
                    <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-xl border border-border">
                      <Star className="fill-primary text-primary" size={12} />
                      <span className="text-xs font-bold text-foreground">{venue.averageRating?.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Price estimate */}
                  <div className="bg-surface rounded-xl p-3 mb-4 border border-border">
                    <p className="text-label mb-1">Estimated cost</p>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-2xl font-medium text-foreground"
                        style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
                      >
                        Npr {venue.priceRange * 500}
                      </span>
                      <span className="text-xs text-muted-foreground">/ guest</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsReservationModalVisible(true)}
                    className="btn-primary w-full justify-center"
                  >
                    <Calendar size={16} /> Book Now
                  </button>
                </motion.div>

                {/* Menu Suggestions */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <MenuSuggestions venueId={venue._id} />
                </motion.div>

                {/* Contact Card */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-card"
                >
                  <h4 className="text-label mb-4">Location &amp; Contact</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                        <MapPin size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{venue.address.street}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{venue.address.city}, {venue.address.country}</p>
                      </div>
                    </div>
                    {venue.phone && (
                      <a href={`tel:${venue.phone}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
                          <Phone size={16} />
                        </div>
                        <span className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">{venue.phone}</span>
                      </a>
                    )}
                    {venue.website && (
                      <a href={venue.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
                          <Globe size={16} />
                        </div>
                        <span className="text-xs text-primary hover:underline line-clamp-1">
                          {venue.website.replace(/(^\w+:|^)\/\//, '')}
                        </span>
                      </a>
                    )}
                  </div>
                </motion.div>

                {/* Hours Card */}
                {venue.openingHours && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-border rounded-2xl p-5 shadow-card"
                  >
                    <h4 className="text-label mb-4">Opening Hours</h4>
                    <div className="space-y-2">
                      {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => {
                        const h = venue.openingHours?.[day];
                        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                        const isToday = day === today;
                        return (
                          <div
                            key={day}
                            className={`flex justify-between items-center text-sm py-1.5 px-2 rounded-lg ${isToday ? 'bg-primary/8 border border-primary/20' : ''}`}
                          >
                            <span className={`font-medium capitalize ${isToday ? 'text-primary' : 'text-foreground'}`}>
                              {day.slice(0,3)}
                              {isToday && <span className="text-xs ml-1 opacity-60">(today)</span>}
                            </span>
                            {h?.isClosed ? (
                              <span className="text-xs text-muted-foreground">Closed</span>
                            ) : h?.open ? (
                              <span className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{h.open}–{h.close}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── REVIEW MODAL ──────────────────────────────────────────────────── */}
      <Modal
        title="Write a Review"
        open={isReviewModalVisible}
        onCancel={() => setIsReviewModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={reviewForm} layout="vertical" onFinish={handleReviewSubmit} className="mt-4">
          <Form.Item label="Overall Rating" name="rating" rules={[{ required: true, message: 'Please provide a rating' }]}>
            <Rate className="text-amber-400" />
          </Form.Item>
          <Form.Item label="Review Title" name="title" rules={[{ required: true, message: 'Please provide a title' }]}>
            <Input placeholder="Sum up your experience" size="large" className="rounded-xl" />
          </Form.Item>
          <Form.Item label="Detailed Review" name="comment" rules={[{ required: true, message: 'Please share your experience' }]}>
            <Input.TextArea rows={4} placeholder="What did you like or dislike?" className="rounded-xl" />
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

      {/* ── RESERVATION MODAL ─────────────────────────────────────────────── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Calendar className="text-primary" size={20} />
            <span>Reserve a Table at {venue.name}</span>
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
            <Form.Item label="Date" name="date" rules={[{ required: true, message: 'Select a date' }]}>
              <Input type="date" size="large" className="rounded-xl" />
            </Form.Item>
            <ReservationTimeField venue={venue} form={reservationForm} />
          </div>
          <Form.Item label="Number of Guests" name="guests" rules={[{ required: true, message: 'How many people?' }]} initialValue={2}>
            <Select size="large" className="rounded-xl">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <Select.Option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Contact Phone" name="phone" rules={[{ required: true, message: 'Enter your phone number' }]}>
            <Input placeholder="e.g. +977 9801234567" size="large" className="rounded-xl" />
          </Form.Item>
          <Form.Item label="Special Requests (Optional)" name="requests">
            <Input.TextArea rows={3} placeholder="Birthday surprise, window seat, allergies..." className="rounded-xl" />
          </Form.Item>
          <div className="bg-surface px-4 py-3 rounded-xl mb-5 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed text-center italic">
              Your reservation will be pending until confirmed by the restaurant. You will receive a notification once confirmed.
            </p>
          </div>
          <Button
            type="primary"
            htmlType="submit"
            loading={submittingReservation}
            size="large"
            className="w-full bg-primary hover:bg-primary-hover h-12 text-base font-semibold rounded-xl border-none shadow-primary"
          >
            Request Reservation
          </Button>
        </Form>
      </Modal>

      {/* ── GALLERY MODAL ─────────────────────────────────────────────────── */}
      <Modal
        title={
          <span
            className="text-2xl font-medium text-foreground"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            {venue.name} — Gallery
          </span>
        }
        open={isGalleryModalVisible}
        onCancel={() => setIsGalleryModalVisible(false)}
        footer={null}
        width={1000}
        centered
        className="gallery-modal"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {galleryImages.map((img, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ scale: 1.02 }}
              className="aspect-square rounded-2xl overflow-hidden border border-border cursor-pointer"
              onClick={() => { setGalleryIndex(idx); setIsGalleryModalVisible(false); }}
            >
              <img
                src={img}
                alt={`${venue.name} gallery ${idx + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </motion.div>
          ))}
        </div>
      </Modal>

    </div>
  );
};

export default RestaurantDetail;
