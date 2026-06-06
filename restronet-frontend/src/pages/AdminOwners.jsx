import React, { useState, useEffect } from 'react';
import { Table, Modal, Form, Input } from 'antd';
import { Plus, UserPlus, Shield, Trash2, Search, Building2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminOwners = () => {
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [search, setSearch] = useState('');
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

  const filtered = owners.filter(
    (o) =>
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Owner',
      key: 'owner',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1e2d47] rounded-full text-[#8b98b0] font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
            {record.name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-slate-100 text-sm leading-tight">
              {record.name}
            </div>
            <div className="text-[#8b98b0] text-xs mt-0.5">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <span className="bg-[#fa6500]/10 text-[#fa6500] rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {role || 'owner'}
        </span>
      ),
    },
    {
      title: 'Assigned Venues',
      dataIndex: 'venueCount',
      key: 'venueCount',
      render: (count) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-300">
          <Building2 size={13} className="text-[#8b98b0]" />
          <span className="font-semibold">{count || 0}</span>
          <span className="text-[#8b98b0]">restaurant{count !== 1 ? 's' : ''}</span>
        </div>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <span className="text-[#8b98b0] text-sm">
          {date
            ? new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <button
            className="bg-[#1e2d47] rounded-lg p-2 text-[#8b98b0] hover:text-red-400 hover:bg-red-900/30 transition-all duration-150"
            title="Delete owner"
            onClick={() => {
              Modal.confirm({
                title: 'Delete Owner Account?',
                content:
                  'This will permanently remove this owner account. It will NOT delete their restaurants, but they will become unassigned.',
                okText: 'Delete',
                okType: 'danger',
                onOk: () => handleDeleteOwner(record._id),
              });
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b98b0] mb-1">
            Platform Management
          </p>
          <h1 className="text-2xl font-bold text-slate-100 leading-tight flex items-center gap-2">
            <Shield size={22} className="text-[#fa6500]" />
            Owner Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage platform accounts for restaurant operators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b98b0] pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search owners…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#131e35] border border-[#1e2d47] text-slate-100 placeholder-[#4a5a78] text-sm rounded-xl pl-9 pr-4 py-2.5 w-56 outline-none focus:border-[#fa6500] focus:ring-2 focus:ring-[#fa6500]/10 transition-all duration-150"
            />
          </div>

          {/* Add Owner */}
          <button
            onClick={() => setIsModalVisible(true)}
            className="inline-flex items-center gap-2 bg-[#fa6500] hover:bg-[#e05800] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all duration-150 shadow-[0_4px_14px_rgba(250,101,0,0.25)] hover:shadow-[0_6px_20px_rgba(250,101,0,0.35)] hover:-translate-y-px active:translate-y-0"
          >
            <Plus size={16} />
            Add Owner
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total Owners',
            value: owners.length,
            color: 'text-slate-100',
          },
          {
            label: 'Total Restaurants',
            value: owners.reduce((acc, o) => acc + (o.venueCount || 0), 0),
            color: 'text-[#fa6500]',
          },
          {
            label: 'Unassigned',
            value: owners.filter((o) => !o.venueCount).length,
            color: 'text-amber-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#131e35] border border-[#1e2d47] rounded-xl px-4 py-3"
          >
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[#8b98b0] text-xs font-medium mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Table / Empty / Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="border-2 border-[#1e2d47] border-t-[#fa6500] rounded-full w-10 h-10 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#131e35] rounded-2xl border border-dashed border-[#1e2d47] p-16 text-center">
          <div className="w-14 h-14 bg-[#1e2d47] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-[#8b98b0]" />
          </div>
          <h3 className="text-slate-100 font-semibold text-base mb-1">
            {search ? 'No matching owners' : 'No owners yet'}
          </h3>
          <p className="text-[#8b98b0] text-sm mb-5">
            {search
              ? 'Try a different search term.'
              : 'Create a restaurant owner account to get started.'}
          </p>
          {!search && (
            <button
              onClick={() => setIsModalVisible(true)}
              className="inline-flex items-center gap-2 bg-[#fa6500] hover:bg-[#e05800] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all duration-150"
            >
              <Plus size={16} />
              Add Owner
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table">
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey="_id"
            pagination={{ pageSize: 10, className: 'px-4 py-3' }}
          />
        </div>
      )}

      {/* Create Owner Modal */}
      <Modal
        title={null}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        centered
        className="modern-admin-modal"
        styles={{ body: { padding: 0 } }}
        width={480}
      >
        {/* Modal Header */}
        <div className="bg-[#131e35] px-6 py-5 border-b border-[#1e2d47] rounded-t-2xl relative">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#fa6500]/10 rounded-xl flex items-center justify-center border border-[#fa6500]/20">
              <UserPlus className="text-[#fa6500]" size={20} />
            </div>
            <div>
              <h2 className="text-slate-100 font-bold text-lg leading-tight">
                Create Restaurant Owner
              </h2>
              <p className="text-[#8b98b0] text-xs font-medium tracking-wide uppercase mt-0.5">
                New operator account
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsModalVisible(false);
              form.resetFields();
            }}
            className="absolute top-5 right-6 text-[#8b98b0] hover:text-slate-100 transition-colors"
          >
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateOwner}
            className="mt-1"
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder="John Doe" size="large" className="rounded-lg" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter an email' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input
                placeholder="owner@restro.com"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Initial Password"
              rules={[
                { required: true, message: 'Please enter a password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                placeholder="Min. 8 characters"
                size="large"
                className="rounded-lg"
              />
            </Form.Item>

            <p className="text-xs text-[#8b98b0] italic mb-5">
              Note: You will need to provide these credentials to the restaurant owner.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2d47]">
              <button
                type="button"
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}
                className="px-5 py-2.5 rounded-xl border border-[#1e2d47] bg-[#1e2d47] text-[#8b98b0] hover:text-slate-100 hover:border-[#2a3d5e] text-sm font-semibold transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => form.submit()}
                className="inline-flex items-center gap-2 bg-[#fa6500] hover:bg-[#e05800] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all duration-150 shadow-[0_4px_14px_rgba(250,101,0,0.25)]"
              >
                <UserPlus size={15} />
                Create Account
              </button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default AdminOwners;
