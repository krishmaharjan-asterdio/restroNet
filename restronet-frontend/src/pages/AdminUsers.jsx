import React, { useState, useEffect, useContext } from 'react';
import { Table, Popconfirm } from 'antd';
import { UserX, UserCheck, Trash2, Users, Search } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

const AdminUsers = () => {
  const { admin } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (id, currentStatus) => {
    try {
      await api.put(`/users/${id}/block`);
      toast.success(`User ${currentStatus ? 'blocked' : 'unblocked'} successfully`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 dark:bg-[#1e2d47] rounded-full text-slate-500 dark:text-[#8b98b0] font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
            {record.name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-tight">
              {record.name}
            </div>
            <div className="text-slate-500 dark:text-[#8b98b0] text-xs mt-0.5">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full px-2.5 py-0.5 text-xs font-semibold">
          {role || 'user'}
        </span>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <span className="text-slate-500 dark:text-[#8b98b0] text-sm">
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
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isActive
              ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {isActive ? 'Active' : 'Blocked'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Popconfirm
            title={record.isActive ? 'Block User' : 'Unblock User'}
            description={`Are you sure you want to ${record.isActive ? 'block' : 'unblock'} this user?`}
            onConfirm={() => handleToggleBlock(record._id, record.isActive)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: record.isActive }}
          >
            <button
              className="bg-slate-100 dark:bg-[#1e2d47] rounded-lg p-2 text-slate-500 dark:text-[#8b98b0] hover:text-[#fa6500] hover:bg-[#fa6500]/10 transition-all duration-150"
              title={record.isActive ? 'Block user' : 'Unblock user'}
            >
              {record.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
            </button>
          </Popconfirm>
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to permanently delete this user?"
            onConfirm={() => handleDelete(record._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <button
              className="bg-slate-100 dark:bg-[#1e2d47] rounded-lg p-2 text-slate-500 dark:text-[#8b98b0] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-150"
              title="Delete user"
            >
              <Trash2 size={15} />
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#8b98b0] mb-1">
            Platform Management
          </p>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage customer accounts and access controls.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8b98b0] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-[#4a5a78] text-sm rounded-xl pl-9 pr-4 py-2.5 w-64 outline-none focus:border-[#fa6500] focus:ring-2 focus:ring-[#fa6500]/10 transition-all duration-150"
          />
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total Users',
            value: users.length,
            color: 'text-slate-800 dark:text-slate-100',
          },
          {
            label: 'Active',
            value: users.filter((u) => u.isActive).length,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Blocked',
            value: users.filter((u) => !u.isActive).length,
            color: 'text-red-600 dark:text-red-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] rounded-xl px-4 py-3"
          >
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-slate-500 dark:text-[#8b98b0] text-xs font-medium mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Table / Empty / Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="border-2 border-slate-200 dark:border-[#1e2d47] border-t-[#fa6500] rounded-full w-10 h-10 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#131e35] rounded-2xl border border-dashed border-slate-200 dark:border-[#1e2d47] p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 dark:bg-[#1e2d47] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-slate-400 dark:text-[#8b98b0]" />
          </div>
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-base mb-1">
            {search ? 'No matching users' : 'No users yet'}
          </h3>
          <p className="text-slate-500 dark:text-[#8b98b0] text-sm">
            {search
              ? 'Try a different search term.'
              : 'Users will appear here once they register.'}
          </p>
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
    </div>
  );
};

export default AdminUsers;
