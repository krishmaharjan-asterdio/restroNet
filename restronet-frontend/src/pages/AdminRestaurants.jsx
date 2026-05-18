import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Upload, Space, Tabs, Divider } from 'antd';
import { Plus, Edit, Trash2, Upload as UploadIcon, Star, Search as SearchIcon, Info, Camera, MapPin } from 'lucide-react';
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
  html: '<div style="background-color: #ea580c; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
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
        gallery: existingGallery, // Keep existing images not removed
        menu: existingMenu,       // Keep existing menu images not removed
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

  const columns = [
    {
      title: 'Restaurant Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-warm-100 border border-warm-200">
            {record.logo ? (
              <img src={getImageUrl(record.logo)} className="w-full h-full object-cover" alt="logo" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-warm-400 font-bold">{text.charAt(0)}</div>
            )}
          </div>
          <div>
            <div className="font-bold text-warm-900">{text}</div>
            <div className="text-xs text-warm-500">{record.address?.city}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category) => category?.name || 'N/A',
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      hidden: admin?.role !== 'superadmin',
      render: (owner) => owner?.name || <span className="text-warm-400 italic">Platform</span>,
    },
    {
      title: 'Rating',
      dataIndex: 'averageRating',
      key: 'averageRating',
      render: (rating) => (
        <div className="flex items-center gap-1 font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-md w-max">
          {(rating || 0).toFixed(1)} <Star size={12} className="fill-current" />
        </div>
      )
    },
    {
      title: 'Price Range',
      dataIndex: 'priceRange',
      key: 'priceRange',
      render: (price) => (
        <div className="flex gap-0.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-1.5 w-4 rounded-full ${step <= (price || 2) ? 'bg-indigo-500' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <button
            onClick={() => showModal(record)}
            className="text-primary hover:underline text-sm font-medium"
          >
            Edit
          </button>
          <Popconfirm
            title="Delete this restaurant?"
            description="Are you sure you want to delete this restaurant and all its data?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <button className="text-red-500 hover:underline text-sm font-medium">
              Delete
            </button>
          </Popconfirm>
        </Space>
      ),
    },
  ].filter(c => !c.hidden);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            className="text-3xl font-medium text-warm-900"
          >
            {admin?.role === 'superadmin' ? 'Restaurants' : 'My Restaurants'}
          </h1>
          <p className="text-sm text-warm-500 mt-1">Manage platform venues, menus, and details.</p>
        </div>
        {admin?.role === 'superadmin' && (
          <button
            onClick={() => showModal()}
            className="bg-primary text-white font-semibold px-5 py-2.5 rounded-xl shadow-primary hover:bg-primary-hover transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            Add Restaurant
          </button>
        )}
      </div>

      {/* Search and Table Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-warm-200 shadow-card mb-6">
        <div className="relative flex-1 max-w-md">
          <Input
            prefix={<SearchIcon size={18} className="text-warm-400 mr-1.5" />}
            placeholder="Search by restaurant name, city, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border-warm-200 hover:border-primary focus:border-primary py-2.5 px-4 text-warm-700 shadow-sm"
            allowClear
          />
        </div>
        <div className="text-xs font-semibold text-warm-500 bg-warm-50 border border-warm-200 px-4 py-2.5 rounded-xl">
          Showing {filteredRestaurants.length} of {restaurants.length} restaurants
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-card">
        <Table
          columns={columns}
          dataSource={filteredRestaurants}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, className: 'px-4' }}
          className="admin-table"
        />
      </div>

      {/* Modal */}
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
        {/* Custom Header */}
        <div className="bg-[#1e293b] px-6 py-5 border-b border-[#334155] rounded-t-2xl relative overflow-hidden">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              {editingId ? <Edit className="text-white" size={20} /> : <Plus className="text-white" size={20} />}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {editingId ? "Refine Restaurant" : "Onboard New Restaurant"}
              </h2>
              <p className="text-slate-400 text-xs font-medium tracking-wide uppercase mt-0.5">
                {editingId ? "Update existing details" : "Configure platform entry"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsModalVisible(false)}
            className="absolute top-5 right-6 text-slate-400 hover:text-white transition-colors"
          >
            <Plus size={22} className="rotate-45" />
          </button>
        </div>

        <div className="p-8">
          {/* Smart Discovery Section */}
          <div className="mb-10 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50 relative group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                  <SearchIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-indigo-900 text-sm">Smart Autofill</h3>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Sync with OpenStreetMap</p>
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
                    <div className="p-6 text-center italic text-indigo-500 text-sm animate-pulse">Searching...</div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">No matches found.</div>
                  )
                }
                options={searchSuggestions.map(s => ({
                  value: s.external_id,
                  label: (
                    <div className="flex flex-col py-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                        <Tag color="blue" className="text-[9px] border-0 rounded-md uppercase font-bold m-0">Global</Tag>
                      </div>
                      <span className="text-[11px] text-slate-500 truncate mt-0.5">{s.address || 'Point of Interest'} • {s.city}</span>
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
            <p className="text-[10px] text-indigo-400 font-medium italic">
              Pro tip: Searching by name and city yields the most accurate results.
            </p>
          </div>

          <Form form={form} layout="vertical">
            <Tabs defaultActiveKey="1" className="restaurant-form-tabs">
              <Tabs.TabPane tab="Basic Information" key="1" icon={<Info size={16} />} forceRender>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 pt-4">
                  <Form.Item name="name" label={<span className="text-slate-600 font-semibold">Restaurant Name</span>} rules={[{ required: true }]}>
                    <Input placeholder="e.g. The Spicy Kitchen" size="large" className="rounded-xl border-slate-200" />
                  </Form.Item>
                  <Form.Item name="category" label={<span className="text-slate-600 font-semibold">Category</span>} rules={[{ required: true }]}>
                    <Select placeholder="Select a category" size="large" className="rounded-xl">
                      {categories?.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item name="description" label={<span className="text-slate-600 font-semibold">Description</span>} className="md:col-span-2">
                    <TextArea rows={4} placeholder="Describe the atmosphere, specialty dishes, etc." className="rounded-xl border-slate-200" />
                  </Form.Item>

                  <Form.Item name="cuisines" label={<span className="text-slate-600 font-semibold">Cuisines</span>}>
                    <Select mode="multiple" placeholder="Select cuisines" size="large" className="rounded-xl">
                      {cuisines?.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
                    </Select>
                  </Form.Item>
                  <Form.Item name="tags" label={<span className="text-slate-600 font-semibold">Tags</span>}>
                    <Select mode="multiple" placeholder="Search features..." size="large" className="rounded-xl">
                      {tags?.map(t => <Option key={t._id} value={t._id}>{t.name}</Option>)}
                    </Select>
                  </Form.Item>

                  <Form.Item name="priceRange" label={<span className="text-slate-600 font-semibold">Pricing Level</span>} initialValue={2}>
                    <Select size="large" className="rounded-xl">
                      <Option value={1}>Budget Friendly (NPR &lt; 500)</Option>
                      <Option value={2}>Mid Range (NPR 500 - 1500)</Option>
                      <Option value={3}>Premium (NPR 1500 - 3000)</Option>
                      <Option value={4}>Luxury (NPR &gt; 3000)</Option>
                    </Select>
                  </Form.Item>

                  {admin?.role === 'superadmin' && (
                    <Form.Item name="owner" label={<span className="text-slate-600 font-semibold">Assign Owner</span>}>
                      <Select placeholder="Select owner account" size="large" className="rounded-xl" allowClear>
                        {owners.map(o => <Option key={o._id} value={o._id}>{o.name} ({o.email})</Option>)}
                      </Select>
                    </Form.Item>
                  )}
                </div>
              </Tabs.TabPane>

              <Tabs.TabPane tab="Contact & Media" key="2" icon={<Camera size={16} />} forceRender>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 pt-4">
                  <Form.Item name="phone" label={<span className="text-slate-600 font-semibold">Contact Number</span>}>
                    <Input placeholder="+977 98XXXXXXXX" size="large" className="rounded-xl" />
                  </Form.Item>
                  <Form.Item name="website" label={<span className="text-slate-600 font-semibold">Website URL</span>}>
                    <Input placeholder="https://example.com" size="large" className="rounded-xl" />
                  </Form.Item>

                  <Divider className="md:col-span-2 text-slate-400 text-xs uppercase tracking-widest font-bold">Visual Assets</Divider>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <Form.Item label={<span className="text-slate-600 font-semibold">Brand Identity (Logo)</span>}>
                      <Upload
                        beforeUpload={(file) => { setLogoFile(file); return false; }}
                        maxCount={1}
                        fileList={logoFile ? [logoFile] : []}
                        onRemove={() => setLogoFile(null)}
                        className="w-full"
                      >
                        <Button icon={<UploadIcon size={16} />} className="w-full h-12 rounded-xl border-dashed border-2 border-slate-200 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 font-medium">
                          Click to Upload Logo
                        </Button>
                      </Upload>
                    </Form.Item>

                    <div className="space-y-4">
                      <label className="text-slate-600 font-semibold text-sm">Gallery Preview</label>
                      <div className="flex flex-wrap gap-2">
                        {existingGallery.slice(0, 4).map((url, idx) => (
                          <div key={idx} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-100 shadow-sm relative group">
                            <img src={getImageUrl(url)} className="w-full h-full object-cover" alt="gallery" />
                            <button onClick={() => setExistingGallery(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {existingGallery.length > 4 && <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">+{existingGallery.length - 4}</div>}
                      </div>
                    </div>
                  </div>

                  <Form.Item label={<span className="text-slate-600 font-semibold">Atmosphere Gallery</span>} className="md:col-span-1">
                    <Upload
                      multiple
                      beforeUpload={(file) => { setGalleryFiles(prev => [...prev, file]); return false; }}
                      fileList={galleryFiles}
                      onRemove={(file) => setGalleryFiles(prev => prev.filter(f => f.uid !== file.uid))}
                    >
                      <Button icon={<Plus size={16} />} className="rounded-lg h-10 border-slate-200">Select Files ({galleryFiles.length})</Button>
                    </Upload>
                  </Form.Item>

                  <Form.Item label={<span className="text-slate-600 font-semibold">Digital Menu</span>} className="md:col-span-1">
                    <Upload
                      multiple
                      beforeUpload={(file) => { setMenuFiles(prev => [...prev, file]); return false; }}
                      fileList={menuFiles}
                      onRemove={(file) => setMenuFiles(prev => prev.filter(f => f.uid !== file.uid))}
                    >
                      <Button icon={<Plus size={16} />} className="rounded-lg h-10 border-slate-200">Select Files ({menuFiles.length})</Button>
                    </Upload>
                  </Form.Item>
                </div>
              </Tabs.TabPane>

              <Tabs.TabPane tab="Geo-Location" key="3" icon={<MapPin size={16} />} forceRender>
                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <Form.Item name="address.street" label={<span className="text-slate-600 font-semibold">Street Address</span>}>
                      <Input placeholder="e.g. Lakeside 6" size="large" className="rounded-xl" />
                    </Form.Item>
                    <Form.Item name="address.city" label={<span className="text-slate-600 font-semibold">City</span>} rules={[{ required: true }]}>
                      <Input placeholder="e.g. Pokhara" size="large" className="rounded-xl" />
                    </Form.Item>
                  </div>

                  <div className="rounded-2xl overflow-hidden border-4 border-slate-50 shadow-inner h-[300px] relative">
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
                    <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur shadow-xl p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight leading-none">Lat</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{parseFloat(lat).toFixed(4) || '--'}</span>
                      </div>
                      <Divider type="vertical" className="h-6 bg-slate-200" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight leading-none">Lng</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{parseFloat(lng).toFixed(4) || '--'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 hidden">
                    <Form.Item name="location.lat"><Input /></Form.Item>
                    <Form.Item name="location.lng"><Input /></Form.Item>
                  </div>
                </div>
              </Tabs.TabPane>
            </Tabs>

            {/* Custom Footer */}
            <div className="flex justify-end items-center gap-3 mt-10 pt-6 border-t border-slate-100">
              <Button
                onClick={() => setIsModalVisible(false)}
                size="large"
                className="rounded-xl border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400 font-semibold px-8 h-12"
              >
                Discard
              </Button>
              <Button
                onClick={handleModalSubmit}
                type="primary"
                size="large"
                className="rounded-xl bg-slate-900 border-0 hover:bg-slate-800 text-white font-bold px-10 h-12 shadow-xl shadow-slate-200"
              >
                {editingId ? "Save Changes" : "Finalize & Publish"}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default AdminRestaurants;
