import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Popconfirm, Tag, Space } from 'antd';
import { UserX, UserCheck, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

const AdminUsers = () => {
  const { admin } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className="font-bold text-warm-900">{text}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span className="text-warm-600">{text}</span>,
    },
    {
      title: 'Joined Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => <span className="text-warm-600">{new Date(date).toLocaleDateString()}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'} className="rounded-full px-3 py-0.5 font-semibold">
          {isActive ? 'Active' : 'Blocked'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title={record.isActive ? "Block User" : "Unblock User"}
            description={`Are you sure you want to ${record.isActive ? 'block' : 'unblock'} this user?`}
            onConfirm={() => handleToggleBlock(record._id, record.isActive)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: record.isActive }}
          >
            <Button
              type="text"
              icon={record.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
              className={record.isActive ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"}
            />
          </Popconfirm>
          <Popconfirm
            title="Delete User"
            description="Are you sure you want to permanently delete this user?"
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
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            className="text-3xl font-medium text-warm-900"
          >
            Users
          </h1>
          <p className="text-sm text-warm-500 mt-1">Manage user accounts and access.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-card">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, className: 'px-4' }}
          className="admin-table"
        />
      </div>
    </div>
  );
};

export default AdminUsers;
