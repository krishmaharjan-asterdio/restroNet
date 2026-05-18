import React, { useState, useEffect, useContext } from 'react';
import { Table, Tag, Button, Select, Space, Card, Modal } from 'antd';
import { Calendar, Clock, User, Phone, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

const { Option } = Select;

const AdminReservations = () => {
  const { admin } = useContext(AuthContext);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const getStatusTag = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
            Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-red-50 text-red-600 border border-red-200">
            Cancelled
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-blue-50 text-blue-700 border border-blue-200">
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-200">
            Pending
          </span>
        );
    }
  };

  const columns = [
    {
      title: 'Restaurant',
      dataIndex: 'venue',
      key: 'venue',
      render: (venue) => <span className="font-bold text-warm-900">{venue?.name || 'Deleted Venue'}</span>,
      hidden: admin?.role !== 'superadmin'
    },
    {
      title: 'Customer',
      dataIndex: 'user',
      key: 'user',
      render: (user, record) => (
        <div className="flex flex-col">
          <span className="font-semibold text-warm-900">{user?.name || 'Guest'}</span>
          <span className="text-xs text-warm-500 flex items-center gap-1"><Phone size={10} /> {record.contactPhone}</span>
        </div>
      ),
    },
    {
      title: 'Date & Time',
      key: 'dateTime',
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium flex items-center gap-1">
            <Calendar size={14} className="text-warm-400" />
            {new Date(record.date).toLocaleDateString()}
          </span>
          <span className="text-xs text-warm-500 flex items-center gap-1">
            <Clock size={14} className="text-warm-400" />
            {record.time}
          </span>
        </div>
      ),
    },
    {
      title: 'Guests',
      dataIndex: 'guests',
      key: 'guests',
      render: (guests) => <Tag color="blue">{guests} Guests</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <button
                className="text-primary hover:underline text-sm font-medium"
                onClick={() => updateStatus(record._id, 'confirmed')}
              >
                Confirm
              </button>
              <button
                className="text-red-500 hover:underline text-sm font-medium"
                onClick={() => updateStatus(record._id, 'cancelled')}
              >
                Cancel
              </button>
            </>
          )}
          {record.status === 'confirmed' && (
            <button
              className="text-primary hover:underline text-sm font-medium"
              onClick={() => updateStatus(record._id, 'completed')}
            >
              Mark Completed
            </button>
          )}
        </Space>
      ),
    },
  ].filter(c => !c.hidden);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            className="text-3xl font-medium text-warm-900 flex items-center gap-2"
          >
            <Calendar className="text-primary" size={26} />
            Reservations
          </h1>
          <p className="text-sm text-warm-500 mt-1">Manage table bookings and guest schedules.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden shadow-card">
        <Table
          columns={columns}
          dataSource={reservations}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </div>
  );
};

export default AdminReservations;
