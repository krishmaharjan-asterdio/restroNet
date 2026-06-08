import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { User, Heart, Camera, Shield } from 'lucide-react';
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
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-border border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Loading your profile…</p>
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
          Profile
        </span>
      ),
      children: (
        <div className="card p-6">
          <div className="mb-6">
            <p className="text-label mb-1">Personal Details</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Update your name and contact information.
            </p>
          </div>

          <Form form={form} layout="vertical" onFinish={handleUpdateProfile} className="space-y-0">
            <Form.Item
              label="Full Name"
              name="name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input
                size="large"
                placeholder="Your full name"
              />
            </Form.Item>

            <Form.Item label="Email Address">
              <Input
                value={user.email}
                disabled
                size="large"
              />
              <p className="text-xs text-muted-foreground mt-1.5 ml-0.5 opacity-75">
                Email cannot be changed.
              </p>
            </Form.Item>

            <Form.Item label="Phone Number" name="phone">
              <Input
                size="large"
                placeholder="+977 98xxxxxxxx"
              />
            </Form.Item>

            <div className="pt-2">
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size="large"
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
          Preferences
        </span>
      ),
      children: (
        <div className="card p-6">
          <div className="mb-6">
            <p className="text-label mb-1">Taste Profile</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              RestroNet uses content-based filtering to surface restaurants that perfectly match your palate.
              The more you add, the smarter your recommendations get.
            </p>
          </div>

          <Form form={prefsForm} layout="vertical" onFinish={handleUpdatePreferences} className="space-y-0">
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
    <div className="bg-background min-h-screen">

      {/* Hero banner — warm editorial strip */}
      <div className="h-44 relative overflow-hidden bg-warm-900 dark:bg-[#0d0b08]">
        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />
        {/* Saffron radial glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-40%', left: '30%',
            width: '500px', height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(250,101,0,0.12) 0%, transparent 65%)',
          }}
        />
        {/* Editorial page label */}
        <div className="absolute bottom-6 left-0 right-0 section-container">
          <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-white/20">
            Your Account
          </p>
        </div>
      </div>

      {/* Avatar + identity row */}
      <div className="section-container">
        <div className="-mt-12 relative z-10 flex items-end gap-5 pb-4">
          {/* Avatar circle overlapping banner */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 text-white rounded-2xl flex items-center justify-center text-3xl font-bold select-none bg-primary shadow-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {/* Upload photo overlay on hover */}
            <button
              className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 cursor-pointer"
              title="Change photo"
            >
              <Camera size={20} className="text-white" />
            </button>
          </div>

          {/* Name + email + role */}
          <div className="pb-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-[clamp(1.5rem,3vw,2rem)] font-medium text-foreground leading-tight truncate"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', letterSpacing: '-0.01em' }}
              >
                {user.name}
              </h1>
              {user.role && (
                <span className="badge badge-primary flex items-center gap-1">
                  <Shield size={10} />
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1 opacity-70 font-medium">Edit your profile and dining preferences below</p>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="section-container pt-6 pb-16">
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
