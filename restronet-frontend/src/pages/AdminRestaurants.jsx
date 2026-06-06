import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Select, Popconfirm, Upload, Space, Tabs, Divider } from 'antd';
import { Plus, Edit, Trash2, Upload as UploadIcon, Star, Search as SearchIcon, Info, Camera, MapPin, Store } from 'lucide-react';
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

    if (record) {
      setExistingGallery(record.gallery || []);
      setExistingMenu(record.menu || []);
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
      });
    } else {
      setExistingGallery([]);
      setExistingMenu([]);
      form.resetFields();
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
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#1e2d47] border border-[#1e2d47] flex-shrink-0">
            {record.logo ? (
              <img src={getImageUrl(record.logo)} className="w-full h-full object-cover" alt="logo" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#fa6500] font-bold text-sm">
                {text?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-100 text-sm leading-tight">{text}</div>
            <div className="text-xs text-[#8b98b0] mt-0.5">{record.address?.city || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <span className="text-slate-300 text-sm">{category?.name || <span className="text-[#8b98b0] italic">N/A</span>}</span>
      ),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      hidden: admin?.role !== 'superadmin',
      render: (owner) => (
        <span className="text-slate-300 text-sm">
          {owner?.name || <span className="text-[#8b98b0] italic">Platform</span>}
        </span>
      ),
    },
    {
      title: 'Rating',
      dataIndex: 'averageRating',
      key: 'averageRating',
      render: (rating) => (
        <div className="inline-flex items-center gap-1.5 bg-emerald-900/40 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold">
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
              className={step <= (price || 2) ? 'text-[#fa6500]' : 'text-[#1e2d47]'}
            >
              $
            </span>
          ))}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        record.isActive !== false
          ? <span className="inline-flex items-center gap-1.5 bg-emerald-900/50 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Active</span>
          : <span className="inline-flex items-center gap-1.5 bg-red-900/40 text-red-400 px-2.5 py-1 rounded-lg text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Inactive</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={6}>
          <button
            onClick={() => showModal(record)}
            className="bg-[#1e2d47] rounded-lg p-2 hover:bg-[#fa6500]/10 hover:text-[#fa6500] text-[#8b98b0] transition-all duration-150"
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
              className="bg-[#1e2d47] rounded-lg p-2 hover:bg-red-900/20 hover:text-red-400 text-[#8b98b0] transition-all duration-150"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </Popconfirm>
        </Space>
      ),
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
          <p className="text-[#8b98b0] text-xs font-bold uppercase tracking-widest mb-1">
            Admin Panel
          </p>
          <h1 className="text-2xl font-bold text-slate-100">
            {admin?.role === 'superadmin' ? 'Restaurants' : 'My Restaurants'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b98b0] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search name, city, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#131e35] border border-[#1e2d47] text-slate-100 placeholder-[#4a5a78] rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-[#fa6500] focus:ring-2 focus:ring-[#fa6500]/10 transition-all w-64"
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
        <div className="bg-[#131e35] border border-[#1e2d47] rounded-xl px-4 py-2 text-sm flex items-center gap-2">
          <span className="text-[#8b98b0]">Total</span>
          <span className="font-bold text-slate-100">{restaurants.length}</span>
        </div>
        <div className="bg-[#131e35] border border-[#1e2d47] rounded-xl px-4 py-2 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span className="text-[#8b98b0]">Active</span>
          <span className="font-bold text-emerald-400">{activeCount}</span>
        </div>
        {searchQuery && (
          <div className="bg-[#131e35] border border-[#1e2d47] rounded-xl px-4 py-2 text-sm flex items-center gap-2">
            <span className="text-[#8b98b0]">Showing</span>
            <span className="font-bold text-[#fa6500]">{filteredRestaurants.length}</span>
            <span className="text-[#8b98b0]">results</span>
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
          <div className="bg-[#131e35] rounded-2xl border border-dashed border-[#1e2d47] p-16 text-center">
            <div className="w-16 h-16 bg-[#1e2d47] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store size={28} className="text-[#8b98b0]" />
            </div>
            <h3 className="text-slate-100 font-bold text-lg mb-2">
              {searchQuery ? 'No restaurants match your search' : 'No restaurants yet'}
            </h3>
            <p className="text-[#8b98b0] text-sm mb-6 max-w-xs mx-auto">
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
        width={900}
        centered
        className="modern-admin-modal"
        styles={{ body: { padding: 0 } }}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#1e2d47] relative">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#fa6500]/10 rounded-xl flex items-center justify-center border border-[#fa6500]/20">
              {editingId
                ? <Edit className="text-[#fa6500]" size={18} />
                : <Plus className="text-[#fa6500]" size={18} />}
            </div>
            <div>
              <h2 className="text-slate-100 font-bold text-lg leading-tight">
                {editingId ? 'Edit Restaurant' : 'Add New Restaurant'}
              </h2>
              <p className="text-[#8b98b0] text-xs font-medium tracking-wide uppercase mt-0.5">
                {editingId ? 'Update restaurant details' : 'Configure a new platform entry'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalVisible(false)}
            className="absolute top-5 right-6 text-[#8b98b0] hover:text-slate-100 transition-colors"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        <div className="p-6">
          {/* Smart Autofill Section */}
          <div className="mb-6 bg-[#131e35] p-5 rounded-2xl border border-[#1e2d47] relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#fa6500]/10 border border-[#fa6500]/20 rounded-xl flex items-center justify-center">
                  <SearchIcon size={16} className="text-[#fa6500]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Smart Autofill</h3>
                  <p className="text-[10px] text-[#8b98b0] font-bold uppercase tracking-wider">Sync with OpenStreetMap</p>
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
                        <span className="text-[9px] border border-[#1e2d47] rounded-md px-1.5 py-0.5 uppercase font-bold text-[#8b98b0]">Global</span>
                      </div>
                      <span className="text-[11px] text-[#8b98b0] truncate mt-0.5">{s.address || 'Point of Interest'} • {s.city}</span>
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
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Website URL</span>}
                  >
                    <Input placeholder="https://example.com" size="large" className="rounded-xl" />
                  </Form.Item>

                  <div className="md:col-span-2 border-t border-[#1e2d47] my-2 pt-4">
                    <p className="text-[#8b98b0] text-xs font-bold uppercase tracking-widest mb-4">Visual Assets</p>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <Form.Item
                      label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Logo / Brand Identity</span>}
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
                      <label className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider block">Gallery Preview</label>
                      <div className="flex flex-wrap gap-2">
                        {existingGallery.slice(0, 4).map((url, idx) => (
                          <div key={idx} className="w-14 h-14 rounded-xl overflow-hidden border border-[#1e2d47] relative group">
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
                          <div className="w-14 h-14 rounded-xl bg-[#1e2d47] flex items-center justify-center text-[10px] text-[#8b98b0] font-bold">
                            +{existingGallery.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Form.Item
                    label={<span className="text-[#8b98b0] font-semibold text-xs uppercase tracking-wider">Atmosphere Gallery</span>}
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

                  <div className="rounded-2xl overflow-hidden border border-[#1e2d47] h-[280px] relative">
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
                    <div className="absolute top-3 right-3 z-[1000] bg-[#0f1629]/90 backdrop-blur border border-[#1e2d47] p-2.5 rounded-xl flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[#8b98b0] uppercase font-bold tracking-tight leading-none">Lat</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{lat ? parseFloat(lat).toFixed(4) : '--'}</span>
                      </div>
                      <div className="w-px h-5 bg-[#1e2d47]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[#8b98b0] uppercase font-bold tracking-tight leading-none">Lng</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{lng ? parseFloat(lng).toFixed(4) : '--'}</span>
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
            </Tabs>

            {/* Modal Footer */}
            <div className="flex justify-end items-center gap-3 mt-8 pt-5 border-t border-[#1e2d47]">
              <Button
                onClick={() => setIsModalVisible(false)}
                size="large"
                className="rounded-xl font-semibold px-6 h-11 border-[#1e2d47] text-[#8b98b0] hover:text-slate-100 hover:border-slate-500"
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
    </div>
  );
};

export default AdminRestaurants;
