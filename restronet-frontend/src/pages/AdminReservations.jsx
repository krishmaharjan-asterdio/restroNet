import React, { useState, useEffect, useContext } from 'react';
import { Table, Space } from 'antd';
import { Calendar, Clock, User, Phone, CheckCircle, XCircle, CalendarCheck } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'completed', label: 'Completed' },
];

const AdminReservations = () => {
  const { admin } = useContext(AuthContext);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reservations/admin');
      setReservations(res.data.reservations);
    } catch (err) {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/reservations/admin/${id}`, { status });
      toast.success(`Reservation marked as ${status}`);
      fetchReservations();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
            Cancelled
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            Pending
          </span>
        );
    }
  };

  const filteredReservations =
    activeFilter === 'all'
      ? reservations
      : reservations.filter((r) => r.status === activeFilter);

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'user',
      key: 'user',
      render: (user, record) => {
        const name = user?.name || 'Guest';
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
              style={{ background: 'linear-gradient(135deg, #fa6500 0%, #e05500 100%)' }}
            >
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{name}</span>
              {record.contactPhone && (
                <span className="text-xs text-slate-500 dark:text-[#8b98b0] flex items-center gap-1">
                  <Phone size={10} />
                  {record.contactPhone}
                </span>
              )}
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
        <span className="font-semibold text-slate-700 dark:text-slate-200">{venue?.name || 'Deleted Venue'}</span>
      ),
      hidden: admin?.role !== 'superadmin',
    },
    {
      title: 'Date & Time',
      key: 'dateTime',
      render: (_, record) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar size={13} className="text-[#fa6500]" />
            {new Date(record.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span className="text-xs text-slate-500 dark:text-[#8b98b0] flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400 dark:text-[#8b98b0]" />
            {record.time}
          </span>
        </div>
      ),
    },
    {
      title: 'Party Size',
      dataIndex: 'guests',
      key: 'guests',
      render: (guests) => (
        <div className="flex items-center gap-1.5">
          <User size={13} className="text-slate-400 dark:text-[#8b98b0]" />
          <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">{guests}</span>
          <span className="text-slate-500 dark:text-[#8b98b0] text-xs">guests</span>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusBadge(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'pending' && (
            <>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-150"
                onClick={() => updateStatus(record._id, 'confirmed')}
              >
                <CheckCircle size={13} />
                Confirm
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-700 transition-all duration-150"
                onClick={() => updateStatus(record._id, 'cancelled')}
              >
                <XCircle size={13} />
                Cancel
              </button>
            </>
          )}
          {record.status === 'confirmed' && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-150"
              onClick={() => updateStatus(record._id, 'completed')}
            >
              <CheckCircle size={13} />
              Mark Completed
            </button>
          )}
          {(record.status === 'cancelled' || record.status === 'completed') && (
            <span className="text-xs text-[#8b98b0] italic">No actions</span>
          )}
        </Space>
      ),
    },
  ].filter((c) => !c.hidden);

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
              <CalendarCheck size={24} className="text-[#fa6500]" />
              Reservation Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-[#8b98b0] mt-1">
              Manage table bookings and guest schedules across your platform.
            </p>
          </div>
          <div className="text-sm text-slate-500 dark:text-[#8b98b0] bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] rounded-xl px-4 py-2">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{filteredReservations.length}</span>{' '}
            {activeFilter === 'all' ? 'total' : activeFilter} reservations
          </div>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
              activeFilter === f.key
                ? 'bg-[#fa6500] text-white shadow-lg shadow-orange-950/20'
                : 'bg-white dark:bg-[#131e35] border border-slate-200 dark:border-[#1e2d47] text-slate-500 dark:text-[#8b98b0] hover:border-[#fa6500]/40 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className={`ml-1.5 text-xs ${activeFilter === f.key ? 'text-orange-200' : 'text-slate-400 dark:text-[#8b98b0]'}`}>
                ({reservations.filter((r) => r.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#131e35] rounded-2xl border border-slate-200 dark:border-[#1e2d47] overflow-hidden">
        <div className="admin-table">
          <Table
            columns={columns}
            dataSource={filteredReservations}
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
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CalendarCheck size={40} className="text-slate-300 dark:text-[#1e2d47]" />
                  <p className="text-slate-400 font-semibold text-base">No reservations found</p>
                  <p className="text-slate-500 dark:text-[#8b98b0] text-sm">
                    {activeFilter === 'all'
                      ? 'There are no reservations on the platform yet.'
                      : `No ${activeFilter} reservations at this time.`}
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

export default AdminReservations;
