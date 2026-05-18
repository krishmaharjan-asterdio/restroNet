import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { User, Heart } from 'lucide-react';
import { Select, Form, Input, Button, Tabs } from 'antd';
import toast from 'react-hot-toast';

const { Option } = Select;

const Profile = () => {
  const { user, setUser, loading: authLoading } = useContext(AuthContext);
  const [submitting, setSubmitting] = useState(false);
  const [metadata, setMetadata] = useState({ cuisines: [], tags: [] });
  const [activeTab, setActiveTab] = useState('1');

  const [form] = Form.useForm();
  const [prefsForm] = Form.useForm();

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        phone: user.phone || '',
      });
      prefsForm.setFieldsValue({
        cuisines: user.preferences?.cuisines?.map(c => c._id || c) || [],
        tags: user.preferences?.tags?.map(t => t._id || t) || [],
      });
      fetchMetadata();
    }
  }, [user]);

  const fetchMetadata = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        api.get('/metadata/cuisines'),
        api.get('/metadata/tags')
      ]);
      setMetadata({ cuisines: cRes.data.cuisines, tags: tRes.data.tags });
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-warm-200 border-t-primary animate-spin" />
          <p className="text-sm text-warm-500 font-medium">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const handleUpdateProfile = async (values) => {
    setSubmitting(true);
    try {
      const res = await api.put('/auth/profile', values);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePreferences = async (values) => {
    setSubmitting(true);
    try {
      const payload = { preferences: { cuisines: values.cuisines, tags: values.tags } };
      const res = await api.put('/auth/profile', payload);
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Preferences updated! Your recommendations will improve.');
    } catch (err) {
      toast.error('Failed to update preferences');
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = [
    {
      key: '1',
      label: (
        <span className="flex items-center gap-2 text-sm font-semibold">
          <User size={15} />
          General Info
        </span>
      ),
      children: (
        <div className="bg-white rounded-2xl border border-warm-200 p-6 shadow-card">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-warm-900 tracking-wide">Personal Details</h3>
            <p className="text-xs text-warm-500 mt-0.5">Update your name and contact information.</p>
          </div>

          <Form form={form} layout="vertical" onFinish={handleUpdateProfile} className="space-y-1">
            <Form.Item
              label="Full Name"
              name="name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input
                size="large"
                placeholder="Your full name"
                className="!rounded-xl !border-warm-200 !bg-warm-50 !text-warm-900 !font-medium focus:!bg-white focus:!border-primary/40"
              />
            </Form.Item>

            <Form.Item label="Email Address">
              <Input
                value={user.email}
                disabled
                size="large"
                className="!rounded-xl !bg-warm-100 !border-warm-200 !text-warm-500 !cursor-not-allowed"
              />
              <p className="text-[11px] text-warm-400 mt-1.5 ml-0.5">Email cannot be changed.</p>
            </Form.Item>

            <Form.Item label="Phone Number" name="phone">
              <Input
                size="large"
                placeholder="+977 98xxxxxxxx"
                className="!rounded-xl !border-warm-200 !bg-warm-50 !text-warm-900 !font-medium focus:!bg-white focus:!border-primary/40"
              />
            </Form.Item>

            <div className="pt-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size="large"
                className="!bg-primary hover:!bg-primary-hover !text-white !font-semibold !px-6 !rounded-xl !border-none !shadow-primary transition-all"
              >
                Save Changes
              </Button>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Heart size={15} />
          Dietary Preferences
        </span>
      ),
      children: (
        <div className="bg-white rounded-2xl border border-warm-200 p-6 shadow-card">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-warm-900 tracking-wide">Taste Profile</h3>
            <p className="text-xs text-warm-500 mt-0.5 leading-relaxed">
              RestroNet uses content-based filtering to surface restaurants that perfectly match your palate. The more you add, the smarter your recommendations get.
            </p>
          </div>

          <Form form={prefsForm} layout="vertical" onFinish={handleUpdatePreferences} className="space-y-1">
            <Form.Item label="Favourite Cuisines" name="cuisines">
              <Select
                mode="multiple"
                placeholder="e.g. Nepali, Italian, Japanese…"
                size="large"
                className="w-full"
                allowClear
              >
                {metadata.cuisines.map(c => (
                  <Option key={c._id} value={c._id}>{c.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Atmosphere & Features" name="tags">
              <Select
                mode="multiple"
                placeholder="e.g. Romantic, Live Music, Rooftop…"
                size="large"
                className="w-full"
                allowClear
              >
                {metadata.tags.map(t => (
                  <Option key={t._id} value={t._id}>{t.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <div className="pt-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size="large"
                className="!bg-primary hover:!bg-primary-hover !text-white !font-semibold !px-6 !rounded-xl !border-none !shadow-primary transition-all"
              >
                Update Recommendation Engine
              </Button>
            </div>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-warm-50 min-h-[calc(100vh-80px)]">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-medium text-warm-900"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            My Profile
          </h1>
          <p className="text-warm-500 text-sm mt-1 font-medium">
            Manage your account details and dining preferences.
          </p>
        </div>

        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-warm-200 shadow-card p-6 mb-6 flex items-center gap-5">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-3xl font-bold shrink-0 select-none">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-warm-900 leading-tight truncate">{user.name}</p>
            <p className="text-sm text-warm-500 font-medium mt-0.5 truncate">{user.email}</p>
            {user.phone && (
              <p className="text-xs text-warm-400 mt-1">{user.phone}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className="profile-tabs"
        />
      </div>
    </div>
  );
};

export default Profile;
