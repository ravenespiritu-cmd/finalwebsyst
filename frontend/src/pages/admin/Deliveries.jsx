import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaMoneyBillWave } from 'react-icons/fa';
import { deliveriesAPI, logisticsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import LogisticsHandoffPanel from '../../components/logistics/LogisticsHandoffPanel';

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [logisticsCatalog, setLogisticsCatalog] = useState(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    if (!showModal) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await logisticsAPI.getCatalog();
        if (!cancelled) setLogisticsCatalog(res.data.data || null);
      } catch {
        if (!cancelled) {
          setLogisticsCatalog(null);
          toast.error('Failed to load logistics catalog');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showModal]);

  const fetchDeliveries = async (page = 1, statusOverride) => {
    try {
      setLoading(true);
      const params = { page };
      const status = statusOverride !== undefined ? statusOverride : statusFilter;
      if (status) params.status = status;
      const response = await deliveriesAPI.getAll(params);
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
      const response = await deliveriesAPI.getOne(id);
      setSelectedDelivery(response.data.data);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to fetch delivery details');
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

  const statuses = ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Deliveries</h1>
        <Link
          to="/admin/logistics"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Open logistics dashboard →
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              setStatusFilter(val);
              fetchDeliveries(1, val);
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
                        <span className="text-gray-400">Auto-assigned by system</span>
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
                <p className="mt-4 text-sm text-gray-500">Monitoring only - rider and supplier workflows update this automatically.</p>
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

            <LogisticsHandoffPanel
              catalog={logisticsCatalog}
              delivery={selectedDelivery}
              readOnly
              onSuccess={(updated) => {
                setSelectedDelivery(updated);
                fetchDeliveries(meta.current_page);
              }}
            />

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
    </div>
  );
};

export default Deliveries;
