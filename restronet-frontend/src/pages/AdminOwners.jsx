import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Tag } from 'antd';
import { Plus, UserPlus, Shield } from 'lucide-react';
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
            <div className="font-bold text-warm-900">{text}</div>
            <div className="text-xs text-warm-500">{record.email}</div>
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
          <button
            className="text-red-500 hover:underline text-sm font-medium"
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
          </button>
        </Space>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            className="text-3xl font-medium text-warm-900 flex items-center gap-2"
          >
            <Shield className="text-primary" size={26} />
            Restaurant Owners
          </h1>
          <p className="text-sm text-warm-500 mt-1">Manage platform accounts for restaurant operators.</p>
        </div>
        <button
          onClick={() => setIsModalVisible(true)}
          className="bg-primary text-white font-semibold px-5 py-2.5 rounded-xl shadow-primary hover:bg-primary-hover transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          Create Owner Account
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-card">
        <Table
          columns={columns}
          dataSource={owners}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, className: 'px-4 py-4' }}
          className="admin-table"
        />
      </div>

      {/* Create Owner Modal */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        centered
        className="modern-admin-modal"
        styles={{ body: { padding: 0 } }}
      >
        {/* Modal Header */}
        <div className="bg-[#1e293b] px-6 py-5 border-b border-[#334155] rounded-t-2xl relative">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <UserPlus className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Create Restaurant Owner</h2>
              <p className="text-slate-400 text-xs font-medium tracking-wide uppercase mt-0.5">New operator account</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalVisible(false)}
            className="absolute top-5 right-6 text-slate-400 hover:text-white transition-colors"
          >
            <Plus size={22} className="rotate-45" />
          </button>
        </div>

        <div className="p-6">
          <Form form={form} layout="vertical" onFinish={handleCreateOwner} className="mt-2">
            <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
              <Input placeholder="John Doe" size="large" className="rounded-lg" />
            </Form.Item>
            <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="owner@restro.com" size="large" className="rounded-lg" />
            </Form.Item>
            <Form.Item name="password" label="Initial Password" rules={[{ required: true, min: 8 }]}>
              <Input.Password placeholder="Min. 8 characters" size="large" className="rounded-lg" />
            </Form.Item>
            <p className="text-xs text-warm-400 italic mb-6">
              Note: You will need to provide these credentials to the restaurant owner.
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                onClick={() => setIsModalVisible(false)}
                size="large"
                className="rounded-xl border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-400 font-semibold px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={() => form.submit()}
                type="primary"
                size="large"
                className="rounded-xl bg-primary border-0 hover:bg-primary-hover text-white font-semibold px-6"
              >
                Create Account
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default AdminOwners;
