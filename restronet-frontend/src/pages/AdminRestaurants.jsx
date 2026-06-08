import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, Upload, Space, Tabs, Divider, Switch, Checkbox } from 'antd';
import { Plus, Edit, Trash2, Upload as UploadIcon, Star, Search as SearchIcon, Info, Camera, MapPin, Store, Utensils, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import api from '../services/api';
import { getImageUrl } from '../utils/imageUrl';

const { Option } = Select;
const { TextArea } = Input;

// Custom Marker Icon for Leaflet
const customIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="background-color: #fa6500; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Component to update map view when coordinates change
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// Component to handle map clicks
const MapClicker = ({ form }) => {
  useMapEvents({
    click(e) {
      form.setFieldsValue({
        'location.lat': e.latlng.lat.toFixed(6),
        'location.lng': e.latlng.lng.toFixed(6),
      });
    }
  });
  return null;
};

const AdminRestaurants = () => {
  const { admin } = useContext(AuthContext);
  const [restaurants, setRestaurants] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [form] = Form.useForm();

  const [logoFile, setLogoFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [menuFiles, setMenuFiles] = useState([]);

  const [existingGallery, setExistingGallery] = useState([]);
  const [existingMenu, setExistingMenu] = useState([]);

  // Menu management states
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);
  const [menuActiveVenue, setMenuActiveVenue] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [editingMenuItemIdx, setEditingMenuItemIdx] = useState(null);
  const [menuItemForm] = Form.useForm();
  const handleManageMenu = async (venueRecord) => {
    setMenuActiveVenue(venueRecord);
    setIsMenuModalVisible(true);
    setLoadingMenu(true);
    try {
      const res = await api.get(`/menu/venue/${venueRecord._id}`);
      if (res.data.success && res.data.menus && res.data.menus.length > 0) {
        setMenuData(res.data.menus[0]);
      } else {
        const createRes = await api.post(`/menu/venue/${venueRecord._id}`, {
          name: 'Main Menu',
          description: 'Main dining menu',
          items: []
        });
        if (createRes.data.success) {
          setMenuData(createRes.data.menu);
        }
      }
    } catch (err) {
      toast.error('Failed to load menu');
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleSaveMenuItem = (values) => {
    if (!menuData) return;
    
    const updatedItems = [...(menuData.items || [])];
    const newItem = {
      name: values.name,
      price: Number(values.price),
      description: values.description || '',
      category: values.category || 'Mains',
      isVegetarian: !!values.isVegetarian,
      isVegan: !!values.isVegan,
      isGlutenFree: !!values.isGlutenFree,
      isAvailable: values.isAvailable !== false
    };

    if (editingMenuItemIdx !== null) {
      updatedItems[editingMenuItemIdx] = newItem;
    } else {
      updatedItems.push(newItem);
    }

    setMenuData({
      ...menuData,
      items: updatedItems
    });

    menuItemForm.resetFields();
    setEditingMenuItemIdx(null);
    toast.success(editingMenuItemIdx !== null ? 'Item updated in list' : 'Item added to list');
  };

  const handleDeleteMenuItem = (index) => {
    if (!menuData) return;
    const updatedItems = menuData.items.filter((_, idx) => idx !== index);
    setMenuData({
      ...menuData,
      items: updatedItems
    });
    toast.success('Item removed from list');
  };

  const handleSaveMenuToDB = async () => {
    if (!menuData) return;
    setLoadingMenu(true);
    try {
      const res = await api.put(`/menu/${menuData._id}`, {
        items: menuData.items
      });
      if (res.data.success) {
        toast.success('Menu changes saved to database!');
        setIsMenuModalVisible(false);
        setMenuData(null);
      }
    } catch (err) {
      toast.error('Failed to save menu changes');
    } finally {
      setLoadingMenu(false);
    }
  };

  // Watch form fields for the map
  const lat = Form.useWatch('location.lat', form);
  const lng = Form.useWatch('location.lng', form);

  useEffect(() => {
    fetchRestaurants();
    fetchMetadata();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/venues?limit=100');
      setRestaurants(res.data.docs);
    } catch (err) {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cRes, tRes, catRes] = await Promise.all([
        api.get('/metadata/cuisines'),
        api.get('/metadata/tags'),
        api.get('/metadata/categories')
      ]);
      setCuisines(cRes.data.cuisines || []);
      setTags(tRes.data.tags || []);
      setCategories(catRes.data.categories || []);

      if (admin?.role === 'superadmin') {
        const oRes = await api.get('/admin/auth/owners');
        setOwners(oRes.data.owners || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/venues/${id}`);
      toast.success('Restaurant deleted successfully');
      fetchRestaurants();
    } catch (err) {
      toast.error('Failed to delete restaurant');
    }
  };

  const showModal = (record = null) => {
    setEditingId(record ? record._id : null);
    setLogoFile(null);
    setGalleryFiles([]);
    setMenuFiles([]);

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    if (record) {
      setExistingGallery(record.gallery || []);
      setExistingMenu(record.menu || []);
      
      const hoursData = {};
      days.forEach(day => {
        hoursData[day] = {
          open: record.openingHours?.[day]?.open || '09:00',
          close: record.openingHours?.[day]?.close || '22:00',
          isClosed: record.openingHours?.[day]?.isClosed ?? false
        };
      });

      form.setFieldsValue({
        name: record.name,
        description: record.description,
        'address.street': record.address?.street,
        'address.city': record.address?.city,
        'address.country': record.address?.country,
        'location.lat': record.location?.coordinates[1],
        'location.lng': record.location?.coordinates[0],
        phone: record.phone,
        website: record.website,
        category: record.category?._id || record.category,
        cuisines: record.cuisines?.map(c => c._id || c),
        tags: record.tags?.map(t => t._id || t),
        priceRange: record.priceRange,
        owner: record.owner?._id || record.owner,
        openingHours: hoursData
      });
    } else {
      setExistingGallery([]);
      setExistingMenu([]);
      form.resetFields();

      const defaultHours = {};
      days.forEach(day => {
        defaultHours[day] = {
          open: '09:00',
          close: '22:00',
          isClosed: false
        };
      });
      form.setFieldsValue({
        openingHours: defaultHours
      });
    }
    setIsModalVisible(true);
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Support both flat keys (e.g. values['address.city']) and nested keys (e.g. values.address.city)
      const street = values['address.street'] !== undefined ? values['address.street'] : values.address?.street;
      const city = values['address.city'] !== undefined ? values['address.city'] : values.address?.city;
      const country = values['address.country'] !== undefined ? values['address.country'] : values.address?.country;

      const latVal = values['location.lat'] !== undefined ? values['location.lat'] : values.location?.lat;
      const lngVal = values['location.lng'] !== undefined ? values['location.lng'] : values.location?.lng;

      const payload = {
        name: values.name,
        description: values.description,
        address: {
          street: street,
          city: city,
          country: country
        },
        location: {
          type: 'Point',
          coordinates: [parseFloat(lngVal) || 0, parseFloat(latVal) || 0]
        },
        phone: values.phone,
        website: values.website,
        category: values.category,
        cuisines: values.cuisines,
        tags: values.tags,
        priceRange: values.priceRange,
        owner: values.owner,
        gallery: existingGallery,
        menu: existingMenu,
        openingHours: values.openingHours,
      };

      // 1. Upload Logo
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadRes = await api.post('/upload/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        payload.logo = uploadRes.data.url;
      }

      // 2. Upload Gallery Images
      if (galleryFiles.length > 0) {
        const formData = new FormData();
        galleryFiles.forEach(file => formData.append('gallery', file));
        const uploadRes = await api.post('/upload/gallery', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        payload.gallery = [...payload.gallery, ...uploadRes.data.urls];
      }

      // 3. Upload Menu Images
      if (menuFiles.length > 0) {
        const formData = new FormData();
        menuFiles.forEach(file => formData.append('menu', file));
        const uploadRes = await api.post('/upload/menu', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        payload.menu = [...payload.menu, ...uploadRes.data.urls];
      }

      if (editingId) {
        await api.put(`/venues/${editingId}`, payload);
        toast.success('Restaurant updated successfully');
      } else {
        await api.post('/venues', payload);
        toast.success('Restaurant created successfully');
      }

      setIsModalVisible(false);
      form.resetFields();
      setLogoFile(null);
      setGalleryFiles([]);
      setMenuFiles([]);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const filteredRestaurants = restaurants.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.address?.city && r.address.city.toLowerCase().includes(query)) ||
      (r.category?.name && r.category.name.toLowerCase().includes(query))
    );
  });

  const activeCount = restaurants.filter(r => r.isActive !== false).length;

  const columns = [
    {
      title: 'Restaurant',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#1e2d47] border border-slate-200 dark:border-[#1e2d47] flex-shrink-0">
            {record.logo ? (
              <img src={getImageUrl(record.logo)} className="w-full h-full object-cover" alt="logo" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#fa6500] font-bold text-sm">
                {text?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">{text}</div>
            <div className="text-xs text-slate-500 dark:text-[#8b98b0] mt-0.5">{record.address?.city || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <span className="text-slate-600 dark:text-slate-300 text-sm">{category?.name || <span className="text-slate-400 dark:text-[#8b98b0] italic">N/A</span>}</span>
      ),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      hidden: admin?.role !== 'superadmin',
      render: (owner) => (
        <span className="text-slate-600 dark:text-slate-300 text-sm">
          {owner?.name || <span className="text-slate-400 dark:text-[#8b98b0] italic">Platform</span>}
        </span>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'averageRating',
      key: 'averageRating',
      render: (rating) => (
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold">
          <Star size={11} className="fill-current" />
          {(rating || 0).toFixed(1)}
        </div>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'priceRange',
      key: 'priceRange',
      render: (price) => (
        <div className="flex gap-0.5 text-sm font-bold tracking-wide">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={step <= (price || 2) ? 'text-[#fa6500]' : 'text-slate-200 dark:text-[#1e2d47]'}
            >
              $
            </span>
          ))}
        </div>
      ),
    },
    {
      title: 'Digital Menu',
      key: 'digitalMenu',
      render: (_, record) => {
        const isOwner = admin?.role === 'superadmin' || record.owner?._id === admin?._id || record.owner === admin?._id;
        if (!isOwner) return <span className="text-slate-400 dark:text-[#8b98b0] italic text-xs">Not Allowed</span>;
        return (
          <button
            onClick={() => handleManageMenu(record)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#fa6500] border border-[#fa6500]/30 bg-[#fa6500]/5 hover:bg-[#fa6500]/10 hover:border-[#fa6500] transition-all duration-150"
          >
            <Utensils size={13} />
            Manage Menu
          </button>
        );
      }
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        record.isActive !== false
          ? <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block" />Active</span>
          : <span className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-lg text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 inline-block" />Inactive</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        return (
          <Space size={6}>
            <button
              onClick={() => showModal(record)}
              className="bg-slate-100 dark:bg-[#1e2d47] rounded-lg p-2 hover:bg-[#fa6500]/10 hover:text-[#fa6500] text-slate-500 dark:text-[#8b98b0] transition-all duration-150"
              title="Edit"
            >
              <Edit size={15} />
            </button>
            <Popconfirm
              title="Delete this restaurant?"
              description="Are you sure you want to delete this restaurant and all its data?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <button
                className="bg-slate-100 dark:bg-[#1e2d47] rounded-lg p-2 hover:bg-red-900/20 hover:text-red-400 text-slate-500 dark:text-[#8b98b0] transition-all duration-150"
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ].filter(c => !c.hidden);

  return (
    <div className="space-y-6 min-h-full">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <p className="text-slate-500 dark:text-[#8b98b0] text-xs font-bold uppercase tracking-widest mb-1">
            Admin Panel
          </p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {admin?.role === 'superadmin' ? 'Restaurants' : 'My Restaurants'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8b98b0] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search name, city, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-[#4a5a78] rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-[#fa6500] focus:ring-2 focus:ring-[#fa6500]/10 transition-all w-64"
            />
          </div>


          {/* Add Restaurant Button */}
          {admin?.role === 'superadmin' && (
            <button
              onClick={() => showModal()}
              className="inline-flex items-center gap-2 bg-[#fa6500] hover:bg-[#e05800] text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200 shadow-[0_4px_14px_rgba(250,101,0,0.3)] hover:shadow-[0_6px_20px_rgba(250,101,0,0.4)] active:scale-[0.97]"
            >
              <Plus size={16} />
              Add Restaurant
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Stats Row ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-wrap gap-3"
      >
        <div className="bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] rounded-xl px-4 py-2 text-sm flex items-center gap-2">
          <span className="text-slate-500 dark:text-[#8b98b0]">Total</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{restaurants.length}</span>
        </div>
        <div className="bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] rounded-xl px-4 py-2 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 inline-block" />
          <span className="text-slate-500 dark:text-[#8b98b0]">Active</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
        </div>
        {searchQuery && (
          <div className="bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] rounded-xl px-4 py-2 text-sm flex items-center gap-2">
            <span className="text-slate-500 dark:text-[#8b98b0]">Showing</span>
            <span className="font-bold text-[#fa6500]">{filteredRestaurants.length}</span>
            <span className="text-slate-500 dark:text-[#8b98b0]">results</span>
          </div>
        )}
      </motion.div>

      {/* ── Table / Empty State ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        {!loading && filteredRestaurants.length === 0 ? (
          <div className="bg-white dark:bg-[#131e35] rounded-2xl border border-dashed border-slate-200 dark:border-[#1e2d47] p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#1e2d47] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store size={28} className="text-slate-400 dark:text-[#8b98b0]" />
            </div>
            <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-2">
              {searchQuery ? 'No restaurants match your search' : 'No restaurants yet'}
            </h3>
            <p className="text-slate-500 dark:text-[#8b98b0] text-sm mb-6 max-w-xs mx-auto">
              {searchQuery
                ? 'Try adjusting your search query to find what you\'re looking for.'
                : 'Get started by adding your first restaurant to the platform.'}
            </p>
            {!searchQuery && admin?.role === 'superadmin' && (
              <button
                onClick={() => showModal()}
                className="inline-flex items-center gap-2 bg-[#fa6500] hover:bg-[#e05800] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all duration-200 shadow-[0_4px_14px_rgba(250,101,0,0.3)] active:scale-[0.97]"
              >
                <Plus size={16} />
                Add First Restaurant
              </button>
            )}
          </div>
        ) : (
          <div className="admin-table">
            <Table
              columns={columns}
              dataSource={filteredRestaurants}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}
      </motion.div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────────── */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        closable={false}
        width={900}
        centered
        className="modern-admin-modal"
        styles={{ body: { padding: 0 } }}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-[#1e2d47] relative">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#fa6500]/10 rounded-xl flex items-center justify-center border border-[#fa6500]/20">
              {editingId
                ? <Edit className="text-[#fa6500]" size={18} />
                : <Plus className="text-[#fa6500]" size={18} />}
            </div>
            <div>
              <h2 className="text-slate-800 dark:text-slate-100 font-bold text-lg leading-tight">
                {editingId ? 'Edit Restaurant' : 'Add New Restaurant'}
              </h2>
              <p className="text-slate-500 dark:text-[#8b98b0] text-xs font-medium tracking-wide uppercase mt-0.5">
                {editingId ? 'Update restaurant details' : 'Configure a new platform entry'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalVisible(false)}
            className="absolute top-5 right-6 text-slate-400 dark:text-[#8b98b0] hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        <div className="p-6">
          {/* Smart Autofill Section */}
          <div className="mb-6 bg-slate-50 dark:bg-[#131e35] p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d47] relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#fa6500]/10 border border-[#fa6500]/20 rounded-xl flex items-center justify-center">
                  <SearchIcon size={16} className="text-[#fa6500]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Smart Autofill</h3>
                  <p className="text-[10px] text-slate-500 dark:text-[#8b98b0] font-bold uppercase tracking-wider">Sync with OpenStreetMap</p>
                </div>
              </div>
              <Select
                showSearch
                allowClear
                placeholder="Search global directory by name..."
                className="w-full md:w-80 custom-search-select"
                size="large"
                loading={searchLoading}
                filterOption={false}
                notFoundContent={
                  searchLoading ? (
                    <div className="p-6 text-center italic text-[#8b98b0] text-sm animate-pulse">Searching...</div>
                  ) : (
                    <div className="p-6 text-center text-[#8b98b0] text-xs">No matches found.</div>
                  )
                }
                options={searchSuggestions.map(s => ({
                  value: s.external_id,
                  label: (
                    <div className="flex flex-col py-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">{s.name}</span>
                        <span className="text-[9px] border border-slate-200 dark:border-[#1e2d47] rounded-md px-1.5 py-0.5 uppercase font-bold text-slate-500 dark:text-[#8b98b0]">Global</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-[#8b98b0] truncate mt-0.5">{s.address || 'Point of Interest'} • {s.city}</span>
                    </div>
                  )
                }))}
                onSearch={(val) => {
                  if (val.length < 3) return;
                  if (window.searchTimer) clearTimeout(window.searchTimer);
                  window.searchTimer = setTimeout(async () => {
                    setSearchLoading(true);
                    try {
                      const res = await api.get(`/venues/search-external?q=${val}`);
                      setSearchSuggestions(res.data.results || []);
                    } catch (err) {
                      console.error('Search failed', err);
                    } finally {
                      setSearchLoading(false);
                    }
                  }, 300);
                }}
                onSelect={(val) => {
                  const selected = searchSuggestions.find(s => s.external_id === val);
                  if (selected) {
                    const catId = categories.find(c =>
                      selected.cuisine.toLowerCase().includes(c.name.toLowerCase()) ||
                      c.name.toLowerCase().includes(selected.cuisine.toLowerCase())
                    )?._id;

                    const autofillData = {
                      name: selected.name,
                      description: selected.description,
                      'address.street': selected.address,
                      'address.city': selected.city,
                      'address.country': selected.country,
                      'location.lat': selected.latitude?.toString(),
                      'location.lng': selected.longitude?.toString(),
                      phone: selected.phone,
                      website: selected.website,
                    };
                    if (catId) autofillData.category = catId;

                    const validData = {};
                    Object.keys(autofillData).forEach(key => {
                      if (autofillData[key]) validData[key] = autofillData[key];
                    });
                    form.setFieldsValue(validData);
                    toast.success(`Populated: ${selected.name}`);
                  }
                }}
              />
            </div>
            <p className="text-[10px] text-[#4a5a78] font-medium italic">
              Pro tip: Searching by name and city yields the most accurate results.
            </p>
          </div>

          {/* Form */}
          <Form form={form} layout="vertical">
            <Tabs defaultActiveKey="1" className="restaurant-form-tabs">
              {/* Tab 1: Basic Information */}
              <Tabs.TabPane tab="Basic Information" key="1" icon={<Info size={15} />} forceRender>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 pt-4">
                  <Form.Item
                    name="name"
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Restaurant Name</span>}
                    rules={[{ required: true, message: 'Name is required' }]}
                  >
                    <Input placeholder="e.g. The Spicy Kitchen" size="large" className="rounded-xl" />
                  </Form.Item>

                  <Form.Item
                    name="category"
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Category</span>}
                    rules={[{ required: true, message: 'Category is required' }]}
                  >
                    <Select placeholder="Select a category" size="large" className="rounded-xl">
                      {categories?.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="description"
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Description</span>}
                    className="md:col-span-2"
                  >
                    <TextArea rows={4} placeholder="Describe the atmosphere, specialty dishes, etc." className="rounded-xl" />
                  </Form.Item>

                  <Form.Item
                    name="cuisines"
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Cuisines</span>}
                  >
                    <Select mode="multiple" placeholder="Select cuisines" size="large" className="rounded-xl">
                      {cuisines?.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="tags"
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Tags</span>}
                  >
                    <Select mode="multiple" placeholder="Search features..." size="large" className="rounded-xl">
                      {tags?.map(t => <Option key={t._id} value={t._id}>{t.name}</Option>)}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="priceRange"
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Pricing Level</span>}
                    initialValue={2}
                  >
                    <Select size="large" className="rounded-xl">
                      <Option value={1}>$ — Budget Friendly (NPR &lt; 500)</Option>
                      <Option value={2}>$$ — Mid Range (NPR 500 – 1500)</Option>
                      <Option value={3}>$$$ — Premium (NPR 1500 – 3000)</Option>
                      <Option value={4}>$$$$ — Luxury (NPR &gt; 3000)</Option>
                    </Select>
                  </Form.Item>

                  {admin?.role === 'superadmin' && (
                    <Form.Item
                      name="owner"
                      label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Assign Owner</span>}
                    >
                      <Select placeholder="Select owner account" size="large" className="rounded-xl" allowClear>
                        {owners.map(o => <Option key={o._id} value={o._id}>{o.name} ({o.email})</Option>)}
                      </Select>
                    </Form.Item>
                  )}
                </div>
              </Tabs.TabPane>

              {/* Tab 2: Contact & Media */}
              <Tabs.TabPane tab="Contact & Media" key="2" icon={<Camera size={15} />} forceRender>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 pt-4">
                  <Form.Item
                    name="phone"
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Contact Number</span>}
                  >
                    <Input placeholder="+977 98XXXXXXXX" size="large" className="rounded-xl" />
                  </Form.Item>

                  <Form.Item
                    name="website"
                    label={<span className="text-slate-500 dark:text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Website URL</span>}
                  >
                    <Input placeholder="https://example.com" size="large" className="rounded-xl" />
                  </Form.Item>

                  <div className="md:col-span-2 border-t border-slate-200 dark:border-[#1e2d47] my-2 pt-4">
                    <p className="text-slate-500 dark:text-[#8b98b0] text-xs font-bold uppercase tracking-widest mb-4">Visual Assets</p>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <Form.Item
                      label={<span className="text-slate-500 dark:text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Logo / Brand Identity</span>}
                    >
                      <Upload
                        beforeUpload={(file) => { setLogoFile(file); return false; }}
                        maxCount={1}
                        fileList={logoFile ? [logoFile] : []}
                        onRemove={() => setLogoFile(null)}
                        className="w-full"
                      >
                        <Button
                          icon={<UploadIcon size={15} />}
                          className="w-full h-11 rounded-xl border-dashed flex items-center justify-center gap-2 font-medium"
                        >
                          Click to Upload Logo
                        </Button>
                      </Upload>
                    </Form.Item>

                    <div className="space-y-3">
                      <label className="text-slate-500 dark:text-[#8b98b0] font-semibold text-xs uppercase tracking-wider block">Gallery Preview</label>
                      <div className="flex flex-wrap gap-2">
                        {existingGallery.slice(0, 4).map((url, idx) => (
                          <div key={idx} className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-[#1e2d47] relative group">
                            <img src={getImageUrl(url)} className="w-full h-full object-cover" alt="gallery" />
                            <button
                              onClick={() => setExistingGallery(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute inset-0 bg-red-900/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-300 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {existingGallery.length > 4 && (
                          <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-[#1e2d47] flex items-center justify-center text-[10px] text-slate-500 dark:text-[#8b98b0] font-bold">
                            +{existingGallery.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Form.Item
                    label={<span className="text-slate-500 dark:text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Atmosphere Gallery</span>}
                    className="md:col-span-1"
                  >
                    <Upload
                      multiple
                      beforeUpload={(file) => { setGalleryFiles(prev => [...prev, file]); return false; }}
                      fileList={galleryFiles}
                      onRemove={(file) => setGalleryFiles(prev => prev.filter(f => f.uid !== file.uid))}
                    >
                      <Button icon={<Plus size={15} />} className="rounded-lg h-10">
                        Select Files ({galleryFiles.length})
                      </Button>
                    </Upload>
                  </Form.Item>

                  <Form.Item
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Digital Menu</span>}
                    className="md:col-span-1"
                  >
                    <Upload
                      multiple
                      beforeUpload={(file) => { setMenuFiles(prev => [...prev, file]); return false; }}
                      fileList={menuFiles}
                      onRemove={(file) => setMenuFiles(prev => prev.filter(f => f.uid !== file.uid))}
                    >
                      <Button icon={<Plus size={15} />} className="rounded-lg h-10">
                        Select Files ({menuFiles.length})
                      </Button>
                    </Upload>
                  </Form.Item>
                </div>
              </Tabs.TabPane>

              {/* Tab 3: Geo-Location */}
              <Tabs.TabPane tab="Geo-Location" key="3" icon={<MapPin size={15} />} forceRender>
                <div className="space-y-5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <Form.Item
                      name="address.street"
                      label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Street Address</span>}
                    >
                      <Input placeholder="e.g. Lakeside 6" size="large" className="rounded-xl" />
                    </Form.Item>

                    <Form.Item
                      name="address.city"
                      label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">City</span>}
                      rules={[{ required: true, message: 'City is required' }]}
                    >
                      <Input placeholder="e.g. Pokhara" size="large" className="rounded-xl" />
                    </Form.Item>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-[#1e2d47] h-[280px] relative">
                    <MapContainer
                      center={[parseFloat(lat) || 27.7172, parseFloat(lng) || 85.3240]}
                      zoom={15}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <ChangeView center={[parseFloat(lat), parseFloat(lng)]} />
                      <MapClicker form={form} />
                      {lat && lng && <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={customIcon} />}
                    </MapContainer>
                    <div className="absolute top-3 right-3 z-[1000] bg-white/90 dark:bg-[#0f1629]/90 backdrop-blur border border-slate-200 dark:border-[#1e2d47] p-2.5 rounded-xl flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 dark:text-[#8b98b0] uppercase font-bold tracking-tight leading-none">Lat</span>
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{lat ? parseFloat(lat).toFixed(4) : '--'}</span>
                      </div>
                      <div className="w-px h-5 bg-slate-200 dark:bg-[#1e2d47]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 dark:text-[#8b98b0] uppercase font-bold tracking-tight leading-none">Lng</span>
                        <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{lng ? parseFloat(lng).toFixed(4) : '--'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hidden coordinate fields */}
                  <div className="grid grid-cols-2 gap-4 hidden">
                    <Form.Item name="location.lat"><Input /></Form.Item>
                    <Form.Item name="location.lng"><Input /></Form.Item>
                  </div>
                </div>
              </Tabs.TabPane>

              {/* Tab 4: Opening Hours */}
              <Tabs.TabPane tab="Opening Hours" key="4" icon={<Clock size={15} />} forceRender>
                <div className="pt-4 space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  <p className="text-slate-500 dark:text-[#8b98b0] text-xs">
                    Configure the weekly operating hours for your restaurant. Days toggled as "Closed" will not accept reservations.
                  </p>
                  
                  <div className="space-y-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div 
                        key={day} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#131e35] border border-slate-100 dark:border-[#1e2d47] transition-all hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize text-sm">
                            {day}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 flex-grow justify-start sm:justify-end">
                          {/* Closed Switch */}
                          <Form.Item
                            name={['openingHours', day, 'isClosed']}
                            valuePropName="checked"
                            noStyle
                          >
                            <Switch 
                              checkedChildren="Closed" 
                              unCheckedChildren="Open"
                              className="bg-slate-300 dark:bg-slate-700"
                            />
                          </Form.Item>

                          <Form.Item noStyle shouldUpdate>
                            {() => {
                              const isClosed = form.getFieldValue(['openingHours', day, 'isClosed']);
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400 dark:text-[#8b98b0]">Open</span>
                                  <Form.Item
                                    name={['openingHours', day, 'open']}
                                    noStyle
                                  >
                                    <Input 
                                      type="time" 
                                      disabled={isClosed} 
                                      size="small"
                                      className="rounded-lg w-28 text-center text-xs h-8 border-slate-200 dark:border-[#1e2d47] dark:bg-[#0f1629]" 
                                    />
                                  </Form.Item>

                                  <span className="text-xs text-slate-400 dark:text-[#8b98b0]">to</span>

                                  <Form.Item
                                    name={['openingHours', day, 'close']}
                                    noStyle
                                  >
                                    <Input 
                                      type="time" 
                                      disabled={isClosed} 
                                      size="small"
                                      className="rounded-lg w-28 text-center text-xs h-8 border-slate-200 dark:border-[#1e2d47] dark:bg-[#0f1629]" 
                                    />
                                  </Form.Item>
                                </div>
                              );
                            }}
                          </Form.Item>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Tabs.TabPane>
            </Tabs>

            {/* Modal Footer */}
            <div className="flex justify-end items-center gap-3 mt-8 pt-5 border-t border-slate-200 dark:border-[#1e2d47]">
              <Button
                onClick={() => setIsModalVisible(false)}
                size="large"
                className="rounded-xl font-semibold px-6 h-11 border-slate-200 dark:border-[#1e2d47] text-slate-500 dark:text-[#8b98b0] hover:text-slate-800 dark:hover:text-slate-100 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-[#131e35]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleModalSubmit}
                type="primary"
                size="large"
                className="rounded-xl font-bold px-8 h-11"
              >
                {editingId ? 'Save Changes' : 'Publish Restaurant'}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      {/* ── Menu Management Modal ────────────────────────────────────────────── */}
      <Modal
        title={null}
        open={isMenuModalVisible}
        onCancel={() => {
          setIsMenuModalVisible(false);
          setMenuData(null);
        }}
        footer={null}
        closable={false}
        width={1000}
        centered
        className="modern-admin-modal"
        styles={{ body: { padding: 0 } }}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-[#1e2d47] relative">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#fa6500]/10 rounded-xl flex items-center justify-center border border-[#fa6500]/20">
              <Utensils className="text-[#fa6500]" size={18} />
            </div>
            <div>
              <h2 className="text-slate-800 dark:text-slate-100 font-bold text-lg leading-tight">
                Manage Digital Menu
              </h2>
              <p className="text-slate-500 dark:text-[#8b98b0] text-xs font-medium tracking-wide uppercase mt-0.5">
                Configure categories, items, and pricing for {menuActiveVenue?.name || 'Restaurant'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsMenuModalVisible(false);
              setMenuData(null);
            }}
            className="absolute top-5 right-6 text-slate-400 dark:text-[#8b98b0] hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        {/* AI Autofill Banner */}
        <div className="mx-6 mt-6 bg-[#fa6500]/5 dark:bg-[#fa6500]/5 border border-[#fa6500]/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <Sparkles className="text-[#fa6500] shrink-0 mt-0.5" size={16} />
            <div>
              <h4 className="text-slate-800 dark:text-slate-100 font-semibold text-sm leading-none">AI Menu Auto-Extractor</h4>
              <p className="text-slate-500 dark:text-[#8b98b0] text-xs mt-1">Upload a photo of your paper menu (JPEG/PNG) to instantly extract dishes, prices, and descriptions.</p>
            </div>
          </div>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={async (file) => {
              const formData = new FormData();
              formData.append('menu', file);
              setLoadingMenu(true);
              const toastId = toast.loading('AI is scanning and extracting menu items...');
              try {
                const res = await api.post(`/menu/venue/${menuActiveVenue._id}/extract-ocr`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
                toast.dismiss(toastId);
                if (res.data.success && res.data.items && res.data.items.length > 0) {
                  // Append extracted items to menuData
                  const currentItems = [...(menuData?.items || [])];
                  const newItems = res.data.items.map(item => ({
                    ...item,
                    isAvailable: true
                  }));
                  setMenuData({
                    ...menuData,
                    items: [...currentItems, ...newItems]
                  });
                  toast.success(`Successfully extracted ${newItems.length} menu items!`);
                } else {
                  toast.error('AI could not extract items. Please make sure the photo is clear.');
                }
              } catch (err) {
                toast.dismiss(toastId);
                toast.error('Failed to parse menu image');
              } finally {
                setLoadingMenu(false);
              }
              return false; // prevent automatic upload
            }}
          >
            <button className="bg-[#fa6500] hover:bg-[#e05800] text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all">
              <Camera size={14} /> Upload Menu Photo
            </button>
          </Upload>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
          {/* Left: Items list */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-sm uppercase tracking-wider">Current Menu Items</h3>
            {loadingMenu ? (
              <div className="text-center py-12 text-slate-500 dark:text-[#8b98b0]">Loading menu details...</div>
            ) : (!menuData || !menuData.items || menuData.items.length === 0) ? (
              <div className="text-center py-12 text-slate-500 dark:text-[#8b98b0] border border-dashed border-slate-200 dark:border-[#1e2d47] rounded-xl bg-slate-50 dark:bg-[#0f192b]">
                No items in this menu yet. Use the form to add items.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto border border-slate-200 dark:border-[#1e2d47] bg-white dark:bg-[#0f192b]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#1e2d47] bg-slate-50 dark:bg-[#131e35] text-xs text-slate-500 dark:text-[#8b98b0] font-bold uppercase">
                      <th className="p-3">Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuData.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200 dark:border-[#1e2d47] text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#131e35]/40 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</div>
                          {item.description && <div className="text-xs text-slate-500 dark:text-[#8b98b0] truncate max-w-[180px]">{item.description}</div>}
                        </td>
                        <td className="p-3 text-xs capitalize">{item.category || 'Mains'}</td>
                        <td className="p-3 text-xs">Rs. {item.price}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingMenuItemIdx(idx);
                              menuItemForm.setFieldsValue({
                                name: item.name,
                                price: item.price,
                                description: item.description,
                                category: item.category || 'Mains',
                                isVegetarian: !!item.isVegetarian,
                                isVegan: !!item.isVegan,
                                isGlutenFree: !!item.isGlutenFree,
                                isAvailable: item.isAvailable !== false
                              });
                            }}
                            className="text-[#fa6500] hover:text-[#fa6500]/85 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(idx)}
                            className="text-red-400 hover:text-red-300 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-[#1e2d47]">
              <button
                onClick={() => {
                  setIsMenuModalVisible(false);
                  setMenuData(null);
                }}
                className="btn-secondary py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMenuToDB}
                disabled={loadingMenu}
                className="btn-primary py-2 px-4 shadow-none"
              >
                {loadingMenu ? 'Saving...' : 'Save Menu to Database'}
              </button>
            </div>
          </div>

          {/* Right: Item Form */}
          <div className="lg:col-span-5 bg-slate-50 dark:bg-[#131e35] p-5 rounded-2xl border border-slate-200 dark:border-[#1e2d47] space-y-4">
            <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-sm uppercase tracking-wider">
              {editingMenuItemIdx !== null ? 'Edit Menu Item' : 'Add Menu Item'}
            </h3>
            
            <Form
              form={menuItemForm}
              layout="vertical"
              onFinish={handleSaveMenuItem}
              className="space-y-4"
            >
              <Form.Item
                label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Item Name</span>}
                name="name"
                rules={[{ required: true, message: 'Please input item name' }]}
              >
                <Input className="input-field" placeholder="e.g. Chicken Momo" />
              </Form.Item>

              <Form.Item
                label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Price (NPR)</span>}
                name="price"
                rules={[{ required: true, message: 'Please input price' }]}
              >
                <Input type="number" className="input-field" placeholder="e.g. 350" />
              </Form.Item>

              <Form.Item
                label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Category</span>}
                name="category"
                rules={[{ required: true, message: 'Please select or input category' }]}
              >
                <Select className="input-field" placeholder="Select category">
                  <Select.Option value="Starters">Starters</Select.Option>
                  <Select.Option value="Mains">Mains</Select.Option>
                  <Select.Option value="Desserts">Desserts</Select.Option>
                  <Select.Option value="Beverages">Beverages</Select.Option>
                  <Select.Option value="Sides">Sides</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label={<span className="text-slate-500 dark:text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Description</span>}
                name="description"
              >
                <Input.TextArea className="bg-white dark:bg-[#0f192b] border border-slate-200 dark:border-[#1e2d47] rounded-xl text-slate-800 dark:text-slate-100 p-2 focus:outline-none focus:border-[#fa6500]/50" rows={2} placeholder="Ingredients, taste profiles..." />
              </Form.Item>

              <div className="grid grid-cols-2 gap-2">
                <Form.Item name="isVegetarian" valuePropName="checked" className="mb-0">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-200 dark:border-[#1e2d47] bg-white dark:bg-[#0f192b] text-[#fa6500]" /> Vegetarian
                  </label>
                </Form.Item>
                <Form.Item name="isVegan" valuePropName="checked" className="mb-0">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-200 dark:border-[#1e2d47] bg-white dark:bg-[#0f192b] text-[#fa6500]" /> Vegan
                  </label>
                </Form.Item>
                <Form.Item name="isGlutenFree" valuePropName="checked" className="mb-0">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-200 dark:border-[#1e2d47] bg-white dark:bg-[#0f192b] text-[#fa6500]" /> Gluten Free
                  </label>
                </Form.Item>
                <Form.Item name="isAvailable" valuePropName="checked" initialValue={true} className="mb-0">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-200 dark:border-[#1e2d47] bg-white dark:bg-[#0f192b] text-[#fa6500]" /> Available
                  </label>
                </Form.Item>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#fa6500] hover:bg-[#e05800] text-white py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#fa6500]/10"
                >
                  {editingMenuItemIdx !== null ? 'Update Item' : 'Add Item'}
                </button>
                {editingMenuItemIdx !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMenuItemIdx(null);
                      menuItemForm.resetFields();
                    }}
                    className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mt-2 text-xs font-semibold"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </Form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminRestaurants;
