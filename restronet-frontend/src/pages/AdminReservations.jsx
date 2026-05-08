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

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'green';
      case 'cancelled': return 'red';
      case 'completed': return 'blue';
      default: return 'orange';
    }
  };

  const columns = [
    {
      title: 'Restaurant',
      dataIndex: 'venue',
      key: 'venue',
      render: (venue) => <span className="font-bold text-gray-900">{venue?.name || 'Deleted Venue'}</span>,
      hidden: admin?.role !== 'superadmin'
    },
    {
      title: 'Customer',
      dataIndex: 'user',
      key: 'user',
      render: (user, record) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{user?.name || 'Guest'}</span>
          <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {record.contactPhone}</span>
        </div>
      ),
    },
    {
      title: 'Date & Time',
      key: 'dateTime',
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium flex items-center gap-1">
            <Calendar size={14} className="text-gray-400" /> 
            {new Date(record.date).toLocaleDateString()}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={14} className="text-gray-400" /> 
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
      render: (status) => (
        <Tag color={getStatusColor(status)} className="uppercase font-bold">
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Button 
                type="text" 
                className="text-green-600 hover:bg-green-50 flex items-center gap-1"
                onClick={() => updateStatus(record._id, 'confirmed')}
              >
                <CheckCircle size={16} /> Confirm
              </Button>
              <Button 
                type="text" 
                danger 
                className="hover:bg-red-50 flex items-center gap-1"
                onClick={() => updateStatus(record._id, 'cancelled')}
              >
                <XCircle size={16} /> Cancel
              </Button>
            </>
          )}
          {record.status === 'confirmed' && (
            <Button 
              type="text" 
              className="text-blue-600 hover:bg-blue-50"
              onClick={() => updateStatus(record._id, 'completed')}
            >
              Mark Completed
            </Button>
          )}
        </Space>
      ),
    },
  ].filter(c => !c.hidden);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Calendar className="text-primary" size={24} />
            Reservations
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage table bookings and guest schedules.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
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
