import React, { useState, useEffect, useContext } from 'react';
import { Table, Popconfirm, Space, Avatar } from 'antd';
import { EyeOff, Eye, Star, MessageSquare, Search } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';

const STAR_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 5, label: '5★' },
  { key: 4, label: '4★' },
  { key: 3, label: '3★' },
  { key: 2, label: '2★' },
  { key: 1, label: '1★' },
];

const StarDisplay = ({ rating, size = 13 }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-[#1e2d47] fill-slate-200 dark:fill-[#1e2d47]'}
        />
      ))}
    </div>
  );
};

const AdminReviews = () => {
  const { admin } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [starFilter, setStarFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReviews(pagination.current);
  }, []);

  const fetchReviews = async (page) => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/admin?page=${page}&limit=${pagination.pageSize}`);
      setReviews(res.data.docs);
      setPagination((prev) => ({
        ...prev,
        current: res.data.page,
        total: res.data.totalDocs,
      }));
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

  const filteredReviews = reviews.filter((r) => {
    const matchesStar = starFilter === 'all' || Math.round(r.rating?.overall) === starFilter;
    const matchesSearch =
      !searchQuery ||
      (r.venue?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStar && matchesSearch;
  });

  const columns = [
    {
      title: 'Reviewer',
      dataIndex: 'user',
      key: 'user',
      render: (user) => {
        const name = user?.name || 'Deleted User';
        const email = user?.email || '';
        const initials = name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{name}</span>
              {email && <span className="text-xs text-slate-500 dark:text-[#8b98b0] truncate">{email}</span>}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Restaurant',
      dataIndex: 'venue',
      key: 'venue',
      render: (venue) => (
        <div className="flex items-center gap-2.5">
          {venue?.images?.[0] ? (
            <img
              src={venue.images[0]}
              alt={venue.name}
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-[#1e2d47] flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1e2d47] flex items-center justify-center flex-shrink-0">
              <MessageSquare size={14} className="text-slate-400 dark:text-[#8b98b0]" />
            </div>
          )}
          <span className="font-semibold text-[#fa6500] text-sm">{venue?.name || 'Unknown'}</span>
        </div>
      ),
    },
    {
      title: 'Review',
      dataIndex: 'comment',
      key: 'comment',
      width: '30%',
      render: (text, record) => (
        <div>
          {record.title && (
            <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm mb-0.5">{record.title}</div>
          )}
          <div className="text-slate-500 dark:text-[#8b98b0] text-xs line-clamp-2 hover:line-clamp-none transition-all duration-200 cursor-default">
            {text || <span className="italic text-slate-400 dark:text-[#4a5a78]">No comment</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Rating',
      dataIndex: ['rating', 'overall'],
      key: 'rating',
      render: (rating) => (
        <div className="flex flex-col gap-1">
          <StarDisplay rating={rating} />
          <span className="text-xs text-slate-500 dark:text-[#8b98b0] font-semibold">{Number(rating).toFixed(1)}</span>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isHidden',
      key: 'isHidden',
      render: (isHidden) =>
        isHidden ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            <EyeOff size={10} />
            Hidden
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            <Eye size={10} />
            Visible
          </span>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={4}>
          <Popconfirm
            title={record.isHidden ? 'Unhide Review' : 'Hide Review'}
            description={`Are you sure you want to ${record.isHidden ? 'unhide' : 'hide'} this review?`}
            onConfirm={() => handleToggleVisibility(record._id, record.isHidden)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: !record.isHidden }}
          >
            {record.isHidden ? (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-150">
                <Eye size={13} />
                Unhide
              </button>
            ) : (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700 transition-all duration-150">
                <EyeOff size={13} />
                Hide
              </button>
            )}
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#fa6500] mb-1">
          Admin Panel
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <MessageSquare size={24} className="text-[#fa6500]" />
              Review Moderation
            </h1>
            <p className="text-sm text-slate-500 dark:text-[#8b98b0] mt-1">
              Manage platform reviews and hide inappropriate content.
            </p>
          </div>
          <div className="text-sm text-slate-500 dark:text-[#8b98b0] bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] rounded-xl px-4 py-2">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{filteredReviews.length}</span> reviews shown
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Star Rating Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {STAR_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStarFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                starFilter === f.key
                  ? 'bg-[#fa6500] text-white shadow-lg shadow-orange-950/20'
                  : 'bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] text-slate-500 dark:text-[#8b98b0] hover:border-[#fa6500]/40 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search by Restaurant */}
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8b98b0]" />
          <input
            type="text"
            placeholder="Search by restaurant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-[#8b98b0] outline-none focus:border-[#fa6500] focus:ring-2 focus:ring-[#fa6500]/10 transition-all w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#131e35] rounded-2xl border border-slate-200 dark:border-[#1e2d47] overflow-hidden">
        <div className="admin-table">
          <Table
            columns={columns}
            dataSource={filteredReviews}
            rowKey="_id"
            loading={
              loading && {
                indicator: (
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#fa6500] border-t-transparent rounded-full animate-spin" />
                  </div>
                ),
              }
            }
            pagination={pagination}
            onChange={handleTableChange}
            locale={{
              emptyText: (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <MessageSquare size={40} className="text-slate-300 dark:text-[#1e2d47]" />
                  <p className="text-slate-400 font-semibold text-base">No reviews found</p>
                  <p className="text-slate-500 dark:text-[#8b98b0] text-sm">
                    {searchQuery || starFilter !== 'all'
                      ? 'Try adjusting your filters to find reviews.'
                      : 'No reviews have been submitted on the platform yet.'}
                  </p>
                </div>
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminReviews;
