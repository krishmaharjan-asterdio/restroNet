import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Tag } from 'antd';
import { Plus, UserPlus, Mail, Shield, User } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminOwners = () => {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/auth/owners');
      setOwners(res.data.owners);
    } catch (err) {
      toast.error('Failed to fetch owners');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOwner = async (values) => {
    try {
      await api.post('/admin/auth/owners', values);
      toast.success('Restaurant Owner created successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchOwners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create owner');
    }
  };

  const handleDeleteOwner = async (id) => {
    try {
      await api.delete(`/admin/auth/owners/${id}`);
      toast.success('Owner account deleted');
      fetchOwners();
    } catch (err) {
      toast.error('Failed to delete owner');
    }
  };

  const columns = [
    {
      title: 'Owner',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            {text.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-gray-900">{text}</div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Assigned Venues',
      dataIndex: 'venueCount',
      key: 'venueCount',
      render: (count) => (
        <Tag color="blue" className="font-bold border-none px-3 py-1 rounded-full">
          {count || 0} Restaurants
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color="orange" className="font-semibold uppercase px-2 py-0.5 rounded-md border-none">
          {role}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            danger 
            className="hover:bg-red-50 flex items-center gap-1"
            onClick={() => {
              Modal.confirm({
                title: 'Delete Owner Account?',
                content: 'This will permanently remove this owner account. It will NOT delete their restaurants, but they will become unassigned.',
                okText: 'Delete',
                okType: 'danger',
                onOk: () => handleDeleteOwner(record._id)
              });
            }}
          >
            Delete
          </Button>
        </Space>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            Restaurant Owners
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage platform accounts for restaurant operators.</p>
        </div>
        <Button 
          type="primary" 
          icon={<Plus size={18} />} 
          size="large"
          className="bg-primary hover:bg-primary-hover flex items-center gap-1 shadow-md shadow-primary/20 rounded-xl font-semibold"
          onClick={() => setIsModalVisible(true)}
        >
          Create Owner Account
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={owners} 
          rowKey="_id" 
          loading={loading}
          pagination={{ pageSize: 10, className: 'px-4 py-4' }}
          className="admin-table"
        />
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2 mb-2">
            <UserPlus size={20} className="text-primary" />
            <span>Create Restaurant Owner Account</span>
          </div>
        }
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setIsModalVisible(false)}
        okText="Create Account"
        okButtonProps={{ className: "bg-primary hover:bg-primary-hover rounded-lg font-semibold" }}
        cancelButtonProps={{ className: "rounded-lg" }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOwner} className="mt-4">
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="John Doe" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="owner@restro.com" size="large" className="rounded-lg" />
          </Form.Item>
          <Form.Item name="password" label="Initial Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password placeholder="Min. 8 characters" size="large" className="rounded-lg" />
          </Form.Item>
          <p className="text-xs text-gray-400 italic">
            Note: You will need to provide these credentials to the restaurant owner.
          </p>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminOwners;
