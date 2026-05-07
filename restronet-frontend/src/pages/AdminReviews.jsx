import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Popconfirm, Tag, Space, Avatar } from 'antd';
import { EyeOff, Eye, Star, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

const AdminReviews = () => {
  const { admin } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    fetchReviews(pagination.current);
  }, []);

  const fetchReviews = async (page) => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/admin?page=${page}&limit=${pagination.pageSize}`);
      setReviews(res.data.docs);
      setPagination({
        ...pagination,
        current: res.data.page,
        total: res.data.totalDocs,
      });
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    fetchReviews(newPagination.current);
  };

  const handleToggleVisibility = async (id, isHidden) => {
    try {
      await api.put(`/reviews/admin/${id}/toggle`);
      toast.success(`Review ${isHidden ? 'unhidden' : 'hidden'} successfully`);
      fetchReviews(pagination.current);
    } catch (err) {
      toast.error('Failed to update review visibility');
    }
  };

  const columns = [
    {
      title: 'Review Content',
      dataIndex: 'comment',
      key: 'comment',
      width: '40%',
      render: (text, record) => (
        <div>
          <div className="font-bold text-gray-900 mb-1">{record.title}</div>
          <div className="text-gray-600 text-sm line-clamp-2">{text}</div>
        </div>
      ),
    },
    {
      title: 'Restaurant',
      dataIndex: ['venue', 'name'],
      key: 'venue',
      render: (venueName) => <span className="font-semibold text-primary">{venueName || 'Unknown'}</span>,
    },
    {
      title: 'User',
      dataIndex: ['user', 'name'],
      key: 'user',
      render: (userName, record) => (
        <div className="flex items-center gap-2">
          <Avatar className="bg-gray-200 text-gray-600">{userName ? userName.charAt(0) : '?'}</Avatar>
          <span>{userName || 'Deleted User'}</span>
        </div>
      ),
    },
    {
      title: 'Rating',
      dataIndex: ['rating', 'overall'],
      key: 'rating',
      render: (rating) => (
        <div className="flex items-center gap-1 font-bold text-gray-800">
          {rating} <Star size={14} className="fill-yellow-400 text-yellow-400" />
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isHidden',
      key: 'isHidden',
      render: (isHidden) => (
        <Tag color={isHidden ? 'orange' : 'green'} className="rounded-full px-3 py-0.5 font-semibold">
          {isHidden ? 'Hidden' : 'Visible'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title={record.isHidden ? "Unhide Review" : "Hide Review"}
            description={`Are you sure you want to ${record.isHidden ? 'unhide' : 'hide'} this review?`}
            onConfirm={() => handleToggleVisibility(record._id, record.isHidden)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: !record.isHidden }}
          >
            <Button 
              type="text" 
              icon={record.isHidden ? <Eye size={16} /> : <EyeOff size={16} />} 
              className={record.isHidden ? "text-green-600 hover:bg-green-50" : "text-orange-600 hover:bg-orange-50"}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Review Moderation</h1>
          <p className="text-gray-500 text-sm mt-1">Manage platform reviews, hide inappropriate content.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={reviews} 
          rowKey="_id" 
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          className="admin-table"
        />
      </div>
    </div>
  );
};

export default AdminReviews;
