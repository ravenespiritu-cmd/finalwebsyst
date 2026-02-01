import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaPhone, FaCheckCircle, FaTruck } from 'react-icons/fa';
import { deliveriesAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [completeData, setCompleteData] = useState({
    recipient_name: '',
    notes: '',
  });

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  const fetchDeliveries = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      const response = await deliveriesAPI.riderGetAll(params);
      setDeliveries(response.data.data || []);
      setMeta(response.data.meta || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDelivery = async (id) => {
    try {
      const response = await deliveriesAPI.riderGetOne(id);
      setSelectedDelivery(response.data.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to fetch delivery details');
    }
  };

  const updateStatus = async (deliveryId, status, location = '') => {
    try {
      await deliveriesAPI.riderUpdateStatus(deliveryId, { status, location });
      toast.success('Status updated');
      fetchDeliveries(meta.current_page);
      if (selectedDelivery?.id === deliveryId) {
        const response = await deliveriesAPI.riderGetOne(deliveryId);
        setSelectedDelivery(response.data.data);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
    }
  };

  const openCompleteModal = (delivery) => {
    setSelectedDelivery(delivery);
    setCompleteData({
      recipient_name: '',
      notes: '',
    });
    setShowCompleteModal(true);
  };

  const completeDelivery = async () => {
    if (!completeData.recipient_name) {
      toast.error('Please enter recipient name');
      return;
    }
    try {
      await deliveriesAPI.riderComplete(selectedDelivery.id, completeData);
      toast.success('Delivery completed!');
      setShowCompleteModal(false);
      fetchDeliveries(meta.current_page);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to complete delivery';
      toast.error(message);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      assigned: 'info',
      picked_up: 'primary',
      in_transit: 'primary',
      out_for_delivery: 'primary',
      delivered: 'success',
      failed: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const quickStatuses = ['picked_up', 'in_transit', 'out_for_delivery'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Deliveries</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !statusFilter ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {['assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                statusFilter === status ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        {loading ? (
          <Loading />
        ) : deliveries.length > 0 ? (
          deliveries.map((delivery) => (
            <div key={delivery.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <FaTruck className="text-blue-500" />
                    <span className="font-medium text-gray-800">{delivery.tracking_number}</span>
                    {getStatusBadge(delivery.status)}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Order: {delivery.order?.order_number}</p>
                    <p className="flex items-center gap-2">
                      <FaMapMarkerAlt className="text-red-500" />
                      {delivery.order?.shipping_address}, {delivery.order?.shipping_city}
                    </p>
                    <p className="flex items-center gap-2">
                      <FaPhone className="text-green-500" />
                      {delivery.order?.shipping_phone}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" onClick={() => viewDelivery(delivery.id)}>
                    View Details
                  </Button>
                  
                  {delivery.status !== 'delivered' && delivery.status !== 'failed' && (
                    <>
                      {quickStatuses.includes(delivery.status) || delivery.status === 'assigned' ? (
                        <div className="flex gap-2">
                          {delivery.status === 'assigned' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => updateStatus(delivery.id, 'picked_up')}
                            >
                              Pick Up
                            </Button>
                          )}
                          {delivery.status === 'picked_up' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => updateStatus(delivery.id, 'in_transit')}
                            >
                              Start Delivery
                            </Button>
                          )}
                          {delivery.status === 'in_transit' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => updateStatus(delivery.id, 'out_for_delivery')}
                            >
                              Out for Delivery
                            </Button>
                          )}
                          {delivery.status === 'out_for_delivery' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => openCompleteModal(delivery)}
                            >
                              <FaCheckCircle />
                              Complete
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            No deliveries found
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-6">
        <Pagination
          currentPage={meta.current_page}
          totalPages={meta.last_page}
          onPageChange={fetchDeliveries}
        />
      </div>

      {/* Delivery Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Delivery ${selectedDelivery?.tracking_number}`}
        size="lg"
      >
        {selectedDelivery && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Customer Details</h4>
              <p className="text-gray-600">{selectedDelivery.order?.shipping_first_name} {selectedDelivery.order?.shipping_last_name}</p>
              <p className="text-gray-600">{selectedDelivery.order?.shipping_phone}</p>
              <p className="text-gray-600">{selectedDelivery.order?.shipping_email}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Delivery Address</h4>
              <p className="text-gray-600">{selectedDelivery.order?.shipping_address}</p>
              <p className="text-gray-600">{selectedDelivery.order?.shipping_city}, {selectedDelivery.order?.shipping_zip_code}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Order Items</h4>
              <div className="space-y-2">
                {selectedDelivery.order?.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product_name} x {item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-2">{getStatusBadge(selectedDelivery.status)}</span>
              </div>
              <div>
                <span className="text-gray-500">Attempts:</span>
                <span className="ml-2 font-medium">{selectedDelivery.delivery_attempts}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Complete Delivery Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Delivery"
      >
        <div className="space-y-4">
          <Input
            label="Recipient Name"
            placeholder="Name of person who received the package"
            value={completeData.recipient_name}
            onChange={(e) => setCompleteData({ ...completeData, recipient_name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
            <textarea
              value={completeData.notes}
              onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={completeDelivery}>
              <FaCheckCircle />
              Complete Delivery
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Deliveries;
