import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Star, MapPin, Phone, Globe, Clock, Heart, Share, CheckCircle2, MessageSquarePlus, List, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, Modal, Form, Input, Rate, Button, Select } from 'antd';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

const RestaurantDetail = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const [venue, setVenue] = useState(null);
  const [menus, setMenus] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isReservationModalVisible, setIsReservationModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [reviewForm] = Form.useForm();
  const [reservationForm] = Form.useForm();

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
      fetchVenueData(); // Refresh reviews and ratings
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
        date: values.date, // already a string from type="date"
        time: values.time, // already a string from type="time"
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
      label: <span className="text-lg font-bold">Items</span>,
      children: menus.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-gray-500 font-medium">Digital menu items are currently not listed.</p>
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
      key: 'menu_images',
      label: <span className="text-lg font-bold">Menu Photos</span>,
      children: venue.menu?.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
          <p className="text-gray-500 font-medium">No menu photos uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venue.menu.map((img, idx) => (
            <img 
              key={idx} 
              src={`http://localhost:5000${img}`} 
              className="w-full rounded-2xl border border-gray-100 shadow-sm" 
              alt={`Menu ${idx + 1}`} 
            />
          ))}
        </div>
      )
    },
    {
      key: 'reviews',
      label: <span className="text-lg font-bold">Reviews ({venue.totalReviews})</span>,
      children: (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">User Reviews</h3>
            {user ? (
              <button
                onClick={() => setIsReviewModalVisible(true)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md active:scale-95"
              >
                <MessageSquarePlus size={18} /> Write a Review
              </button>
            ) : (
              <p className="text-sm font-medium text-gray-500">Log in to write a review</p>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-gray-500 font-medium">No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review._id} className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-400 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                    {review.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{review.user?.name || 'Anonymous User'}</p>
                    <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200">
                      <span className="font-bold mr-1">{review.rating.overall}</span>
                      <Star size={16} className="fill-current" />
                    </div>
                    {user && review.user && user._id === review.user._id && (
                      <button
                        onClick={() => handleDeleteReview(review._id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Delete your review"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-lg mb-2 text-gray-900">{review.title}</h4>
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
              </div>
            )))}
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
          {/* Main Large Image */}
          <div className="col-span-4 md:col-span-2 row-span-2 relative group cursor-pointer">
            <img 
              src={venue.gallery?.length > 0 ? `http://localhost:5000${venue.gallery[0]}` : coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
          </div>
          
          {/* Other 4 Images from Gallery or Placeholders */}
          {[1, 2, 3, 4].map((idx) => {
            const hasImage = venue.gallery && venue.gallery[idx];
            const imgSrc = hasImage 
              ? `http://localhost:5000${venue.gallery[idx]}` 
              : `https://images.unsplash.com/photo-${[
                  '1414235077428-33898bd12252',
                  '1544148103-0773bf10d330',
                  '1504674900247-0877df9cc836',
                  '1493770348161-369560ae357d'
                ][idx-1]}?auto=format&fit=crop&w=600&q=80`;

            return (
              <div 
                key={idx} 
                className={`${idx === 2 || idx === 4 ? 'hidden md:block' : ''} col-span-2 md:col-span-1 row-span-1 relative group overflow-hidden cursor-pointer`}
              >
                <img 
                  src={imgSrc} 
                  alt={`Gallery ${idx}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                {idx === 4 && (
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 hover:bg-white transition-colors">
                    <List size={16} /> Show all photos
                  </div>
                )}
              </div>
            );
          })}
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

            <button
              onClick={() => setIsReservationModalVisible(true)}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl text-lg transition-all shadow-md active:scale-[0.98] mb-6"
            >
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
            className="w-full bg-primary hover:bg-primary-hover font-bold rounded-lg border-none mt-2"
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
            <span className="text-xl font-bold">Reserve a Table at {venue.name}</span>
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
              <Input type="time" size="large" className="rounded-lg" />
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

          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <p className="text-sm text-gray-500 leading-relaxed text-center italic">
              "Your reservation will be pending until confirmed by the restaurant owner. You will receive a notification."
            </p>
          </div>

          <Button
            type="primary"
            htmlType="submit"
            loading={submittingReservation}
            size="large"
            className="w-full bg-primary hover:bg-primary-hover h-14 text-lg font-bold rounded-xl border-none shadow-lg shadow-primary/20"
          >
            Request Reservation
          </Button>
        </Form>
      </Modal>

    </div>
  );
};

export default RestaurantDetail;
