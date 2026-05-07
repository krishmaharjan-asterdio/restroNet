import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { User, Settings, Heart, Upload as UploadIcon, List } from 'lucide-react';
import { Select, Form, Input, Button, Tabs, Spin } from 'antd';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: '1',
      label: <span className="flex items-center gap-2 font-bold"><User size={18} /> General Info</span>,
      children: (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <Form form={form} layout="vertical" onFinish={handleUpdateProfile}>
            <Form.Item label="Full Name" name="name" rules={[{ required: true }]}>
              <Input size="large" className="rounded-lg" />
            </Form.Item>
            <Form.Item label="Email">
              <Input value={user.email} disabled size="large" className="rounded-lg bg-gray-50" />
            </Form.Item>
            <Form.Item label="Phone Number" name="phone">
              <Input size="large" className="rounded-lg" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} size="large" className="bg-primary hover:bg-primary-hover font-bold rounded-lg border-none w-full md:w-auto">
              Save Changes
            </Button>
          </Form>
        </div>
      )
    },
    {
      key: '2',
      label: <span className="flex items-center gap-2 font-bold"><Heart size={18} /> Dietary Preferences</span>,
      children: (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-600 mb-6 leading-relaxed">
            Personalize your dining experience! RestroNet uses Content-Based Filtering to suggest restaurants that perfectly match these preferences.
          </p>
          <Form form={prefsForm} layout="vertical" onFinish={handleUpdatePreferences}>
            <Form.Item label="Favorite Cuisines" name="cuisines">
              <Select mode="multiple" placeholder="Select cuisines" size="large" className="rounded-lg">
                {metadata.cuisines.map(c => <Option key={c._id} value={c._id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="Atmosphere & Features (Tags)" name="tags">
              <Select mode="multiple" placeholder="Select tags (e.g. Romantic, Live Music)" size="large" className="rounded-lg">
                {metadata.tags.map(t => <Option key={t._id} value={t._id}>{t.name}</Option>)}
              </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} size="large" className="bg-primary hover:bg-primary-hover font-bold rounded-lg border-none w-full md:w-auto">
              Update Recommendations Engine
            </Button>
          </Form>
        </div>
      )
    }
  ];

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-80px)] py-10 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-6 mb-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-24 h-24 bg-gradient-to-tr from-primary to-orange-400 text-white rounded-full flex items-center justify-center text-4xl font-extrabold shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">{user.name}</h1>
            <p className="text-gray-500 font-medium text-lg mt-1">{user.email}</p>
          </div>
        </div>

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
