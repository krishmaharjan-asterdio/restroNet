import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Popconfirm, Tag, Space, Avatar } from 'antd';
import { EyeOff, Eye, Star, MessageSquare } from 'lucide-react';
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
          <div className="font-bold text-warm-900 mb-1">{record.title}</div>
          <div className="text-warm-600 text-sm line-clamp-2">{text}</div>
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
          <Avatar className="bg-warm-200 text-warm-600">{userName ? userName.charAt(0) : '?'}</Avatar>
          <span>{userName || 'Deleted User'}</span>
        </div>
      ),
    },
    {
      title: 'Rating',
      dataIndex: ['rating', 'overall'],
      key: 'rating',
      render: (rating) => (
        <div className="flex items-center gap-1 font-bold text-warm-800">
          {rating} <Star size={14} className="fill-yellow-400 text-yellow-400" />
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isHidden',
      key: 'isHidden',
      render: (isHidden) => (
        isHidden ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Hidden
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Visible
          </span>
        )
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
            <button
              className={record.isHidden ? "text-primary hover:underline text-sm font-medium" : "text-red-500 hover:underline text-sm font-medium"}
            >
              {record.isHidden ? 'Unhide' : 'Hide'}
            </button>
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
            className="text-3xl font-medium text-warm-900 flex items-center gap-2"
          >
            <MessageSquare className="text-primary" size={26} />
            Review Moderation
          </h1>
          <p className="text-sm text-warm-500 mt-1">Manage platform reviews, hide inappropriate content.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-card">
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
