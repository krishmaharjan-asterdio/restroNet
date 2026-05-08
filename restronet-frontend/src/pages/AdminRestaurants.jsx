import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, Upload, Space } from 'antd';
import { Plus, Edit, Trash2, Upload as UploadIcon, Star } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import api from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

// Custom Marker Icon for Leaflet
const customIcon = L.divIcon({
  className: 'custom-icon',
  html: '<div style="background-color: #ea580c; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

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
  const [cuisines, setCuisines] = useState([]);
  const [tags, setTags] = useState([]);
  const [categories, setCategories] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
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
      const payload = {
        name: values.name,
        description: values.description,
        address: {
          street: values['address.street'],
          city: values['address.city'],
          country: values['address.country']
        },
        location: {
          type: 'Point',
          coordinates: [parseFloat(values['location.lng']) || 0, parseFloat(values['location.lat']) || 0]
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

  const columns = [
    {
      title: 'Restaurant Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            {record.logo ? (
              <img src={`http://localhost:5000${record.logo}`} className="w-full h-full object-cover" alt="logo" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{text.charAt(0)}</div>
            )}
          </div>
          <div>
            <div className="font-bold text-gray-900">{text}</div>
            <div className="text-xs text-gray-500">{record.address?.city}</div>
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
      render: (owner) => owner?.name || <span className="text-gray-400 italic">Platform</span>,
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
      render: (price) => '₹'.repeat(price || 2),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<Edit size={16} />} 
            onClick={() => showModal(record)} 
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          />
          <Popconfirm
            title="Delete this restaurant?"
            description="Are you sure you want to delete this restaurant and all its data?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger 
              icon={<Trash2 size={16} />} 
              className="hover:bg-red-50"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ].filter(c => !c.hidden);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {admin?.role === 'superadmin' ? 'Restaurants' : 'My Restaurants'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage platform venues, menus, and details.</p>
        </div>
        {admin?.role === 'superadmin' && (
          <Button 
            type="primary" 
            icon={<Plus size={18} />} 
            size="large"
            className="bg-primary hover:bg-primary-hover flex items-center gap-1 shadow-md shadow-primary/20 rounded-xl font-semibold"
            onClick={() => showModal()}
          >
            Add Restaurant
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={restaurants} 
          rowKey="_id" 
          loading={loading}
          pagination={{ pageSize: 10, className: 'px-4' }}
          className="admin-table"
        />
      </div>

      <Modal
        title={editingId ? "Edit Restaurant" : "Add New Restaurant"}
        open={isModalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        okText={editingId ? "Update" : "Create"}
        okButtonProps={{ className: "bg-primary hover:bg-primary-hover rounded-lg font-semibold" }}
        cancelButtonProps={{ className: "rounded-lg" }}
      >
        <Form form={form} layout="vertical" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <Form.Item name="name" label="Restaurant Name" rules={[{ required: true }]}>
              <Input placeholder="e.g. The Spicy Kitchen" size="large" className="rounded-lg" />
            </Form.Item>
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Select placeholder="Select a category" size="large" className="rounded-lg">
                {categories?.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="description" label="Description" className="md:col-span-2">
              <TextArea rows={3} placeholder="Brief description of the venue" className="rounded-lg" />
            </Form.Item>

            {admin?.role === 'superadmin' && (
              <Form.Item name="owner" label="Restaurant Owner" className="md:col-span-2">
                <Select placeholder="Assign an owner" size="large" className="rounded-lg" allowClear>
                  {owners.map(o => <Option key={o._id} value={o._id}>{o.name} ({o.email})</Option>)}
                </Select>
              </Form.Item>
            )}

            <Form.Item name="cuisines" label="Cuisines">
              <Select mode="multiple" placeholder="Select cuisines" size="large" className="rounded-lg">
                {cuisines?.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="tags" label="Tags">
              <Select mode="multiple" placeholder="Select tags (e.g. Romantic, Live Music)" size="large" className="rounded-lg">
                {tags?.map(t => <Option key={t._id} value={t._id}>{t.name}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="address.street" label="Street Address">
              <Input placeholder="123 Main St" size="large" className="rounded-lg" />
            </Form.Item>
            <Form.Item name="address.city" label="City" rules={[{ required: true }]}>
              <Input placeholder="Kathmandu" size="large" className="rounded-lg" />
            </Form.Item>
            <Form.Item name="address.country" label="Country" initialValue="Nepal">
              <Input size="large" className="rounded-lg" />
            </Form.Item>

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <Form.Item name="priceRange" label="Price Range (1-4)" initialValue={2} className="col-span-2 md:col-span-1">
                <Select size="large" className="rounded-lg">
                  <Option value={1}>1 - Inexpensive (₹)</Option>
                  <Option value={2}>2 - Moderate (₹₹)</Option>
                  <Option value={3}>3 - Expensive (₹₹₹)</Option>
                  <Option value={4}>4 - Very Expensive (₹₹₹₹)</Option>
                </Select>
              </Form.Item>

              <Form.Item label="Logo" className="col-span-2 md:col-span-1">
                <Upload 
                  beforeUpload={(file) => {
                    setLogoFile(file);
                    return false;
                  }}
                  maxCount={1}
                  fileList={logoFile ? [logoFile] : []}
                  onRemove={() => setLogoFile(null)}
                >
                  <Button icon={<UploadIcon size={16} />} className="rounded-lg w-full">Select Logo</Button>
                </Upload>
              </Form.Item>
            </div>

            {/* Gallery Images Section */}
            <div className="md:col-span-2 space-y-3 mb-6">
              <label className="block text-sm font-bold text-gray-700">Gallery Images</label>
              <div className="grid grid-cols-5 gap-3 mb-3">
                {existingGallery.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={`http://localhost:5000${url}`} className="w-full h-full object-cover" alt="gallery" />
                    <button 
                      onClick={() => setExistingGallery(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <Upload 
                multiple
                beforeUpload={(file) => {
                  setGalleryFiles(prev => [...prev, file]);
                  return false;
                }}
                fileList={galleryFiles}
                onRemove={(file) => setGalleryFiles(prev => prev.filter(f => f.uid !== file.uid))}
              >
                <Button icon={<Plus size={16} />} className="rounded-lg">Add Gallery Images ({galleryFiles.length})</Button>
              </Upload>
            </div>

            {/* Menu Images Section */}
            <div className="md:col-span-2 space-y-3 mb-6">
              <label className="block text-sm font-bold text-gray-700">Restaurant Menu</label>
              <div className="grid grid-cols-5 gap-3 mb-3">
                {existingMenu.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={`http://localhost:5000${url}`} className="w-full h-full object-cover" alt="menu" />
                    <button 
                      onClick={() => setExistingMenu(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <Upload 
                multiple
                beforeUpload={(file) => {
                  setMenuFiles(prev => [...prev, file]);
                  return false;
                }}
                fileList={menuFiles}
                onRemove={(file) => setMenuFiles(prev => prev.filter(f => f.uid !== file.uid))}
              >
                <Button icon={<Plus size={16} />} className="rounded-lg">Add Menu Images ({menuFiles.length})</Button>
              </Upload>
            </div>

            <div className="md:col-span-2 mb-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location (Click map to plot)</label>
              <div className="h-[250px] w-full rounded-xl overflow-hidden border border-gray-300 relative z-0">
                <MapContainer 
                  center={[lat || 27.7172, lng || 85.3240]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <MapClicker form={form} />
                  {lat && lng && (
                    <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={customIcon} />
                  )}
                </MapContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <Form.Item name="location.lat" label="Latitude" rules={[{ required: true }]}>
                <Input placeholder="27.7172" size="large" className="rounded-lg" />
              </Form.Item>
              <Form.Item name="location.lng" label="Longitude" rules={[{ required: true }]}>
                <Input placeholder="85.3240" size="large" className="rounded-lg" />
              </Form.Item>
            </div>

          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminRestaurants;
