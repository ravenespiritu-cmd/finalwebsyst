import { useState, useEffect } from 'react';
import { FaEye, FaUserPlus, FaMoneyBillWave } from 'react-icons/fa';
import { deliveriesAPI, paymentsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningDeliveryId, setAssigningDeliveryId] = useState(null);
  const [selectedRider, setSelectedRider] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchDeliveries();
    fetchRiders();
  }, []);

  const fetchDeliveries = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (statusFilter) params.status = statusFilter;
      const response = await deliveriesAPI.getAll(params);
      setDeliveries(response.data.data || []);
      setMeta(response.data.meta || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRiders = async () => {
    try {
      const response = await deliveriesAPI.getAvailableRiders();
      setRiders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch riders:', error);
    }
  };

  const viewDelivery = async (id) => {
    try {
      const response = await deliveriesAPI.getOne(id);
      setSelectedDelivery(response.data.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to fetch delivery details');
    }
  };

  const openAssignModal = (deliveryId) => {
    setAssigningDeliveryId(deliveryId);
    setSelectedRider('');
    setShowAssignModal(true);
  };

  const assignRider = async () => {
    if (!selectedRider) {
      toast.error('Please select a rider');
      return;
    }
    try {
      await deliveriesAPI.assignRider(assigningDeliveryId, selectedRider);
      toast.success('Rider assigned successfully');
      setShowAssignModal(false);
      fetchDeliveries(meta.current_page);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to assign rider';
      toast.error(message);
    }
  };

  const updateStatus = async (deliveryId, status) => {
    try {
      await deliveriesAPI.updateStatus(deliveryId, { status });
      toast.success('Status updated');
      fetchDeliveries(meta.current_page);
      if (selectedDelivery?.id === deliveryId) {
        const response = await deliveriesAPI.getOne(deliveryId);
        setSelectedDelivery(response.data.data);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update status';
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
      returned: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getPaymentStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      processing: 'warning',
      completed: 'success',
      failed: 'danger',
      refunded: 'info',
      cancelled: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const markPaymentComplete = async (paymentId) => {
    try {
      await paymentsAPI.updateStatus(paymentId, { status: 'completed' });
      toast.success('Payment marked as completed');
      if (selectedDelivery?.order?.id) {
        const response = await deliveriesAPI.getOne(selectedDelivery.id);
        setSelectedDelivery(response.data.data);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update payment';
      toast.error(message);
    }
  };

  const statuses = ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Deliveries</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchDeliveries();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {delivery.tracking_number}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {delivery.order?.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-800">{delivery.order?.user?.first_name} {delivery.order?.user?.last_name}</p>
                      <p className="text-sm text-gray-500">{delivery.order?.shipping_city}</p>
                    </td>
                    <td className="px-6 py-4">
                      {delivery.rider ? (
                        <p className="text-gray-800">{delivery.rider.first_name} {delivery.rider.last_name}</p>
                      ) : (
                        <button
                          onClick={() => openAssignModal(delivery.id)}
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <FaUserPlus />
                          Assign
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(delivery.status)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewDelivery(delivery.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t">
          <Pagination
            currentPage={meta.current_page}
            totalPages={meta.last_page}
            onPageChange={fetchDeliveries}
          />
        </div>
      </div>

      {/* Delivery Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Delivery ${selectedDelivery?.tracking_number}`}
        size="lg"
      >
        {selectedDelivery && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Delivery Status</h4>
                {getStatusBadge(selectedDelivery.status)}
                <div className="mt-4">
                  <label className="text-sm text-gray-500">Update Status:</label>
                  <select
                    value={selectedDelivery.status}
                    onChange={(e) => updateStatus(selectedDelivery.id, e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Rider</h4>
                {selectedDelivery.rider ? (
                  <>
                    <p className="text-gray-800">{selectedDelivery.rider.first_name} {selectedDelivery.rider.last_name}</p>
                    <p className="text-sm text-gray-500">{selectedDelivery.rider.phone}</p>
                  </>
                ) : (
                  <p className="text-gray-500">No rider assigned</p>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <FaMoneyBillWave className="text-primary-600" />
                Payment
              </h4>
              {selectedDelivery.order?.payment ? (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm text-gray-600">
                      Method: <span className="font-medium capitalize">{selectedDelivery.order.payment.payment_method?.replace('_', ' ')}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Amount: <span className="font-medium">₱{Number(selectedDelivery.order.payment.amount).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getPaymentStatusBadge(selectedDelivery.order.payment.status)}
                    {selectedDelivery.status === 'delivered' &&
                      !['completed', 'refunded', 'cancelled'].includes(selectedDelivery.order.payment.status) && (
                        <button
                          onClick={() => markPaymentComplete(selectedDelivery.order.payment.id)}
                          className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Mark Paid
                        </button>
                      )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No payment record</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Delivery Address</h4>
              <p className="text-gray-600">{selectedDelivery.order?.shipping_address}</p>
              <p className="text-gray-600">{selectedDelivery.order?.shipping_city}, {selectedDelivery.order?.shipping_zip_code}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Picked Up</p>
                <p className="font-medium">{formatDate(selectedDelivery.picked_up_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="font-medium">{formatDate(selectedDelivery.delivered_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Location</p>
                <p className="font-medium">{selectedDelivery.current_location || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Attempts</p>
                <p className="font-medium">{selectedDelivery.delivery_attempts}</p>
              </div>
            </div>

            {selectedDelivery.delivery_notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-gray-800">{selectedDelivery.delivery_notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Assign Rider Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Rider"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Rider</label>
            <select
              value={selectedRider}
              onChange={(e) => setSelectedRider(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
            >
              <option value="">Select a rider...</option>
              {riders.map((rider) => (
                <option key={rider.id} value={rider.id}>
                  {rider.first_name} {rider.last_name} - {rider.phone}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={assignRider}>
              Assign Rider
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Deliveries;
