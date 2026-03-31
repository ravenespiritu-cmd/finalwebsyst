import { useState, useEffect } from 'react';
import { FaEye, FaMoneyBillWave } from 'react-icons/fa';
import { paymentsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async (page = 1, statusOverride, methodOverride) => {
    try {
      setLoading(true);
      const params = { page };
      const status = statusOverride !== undefined ? statusOverride : statusFilter;
      const method = methodOverride !== undefined ? methodOverride : methodFilter;
      if (status) params.status = status;
      if (method) params.payment_method = method;
      const response = await paymentsAPI.getAll(params);
      setPayments(response.data.data || []);
      setMeta(response.data.meta || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const viewPayment = async (id) => {
    try {
      const response = await paymentsAPI.getOne(id);
      setSelectedPayment(response.data.data);
      setNewStatus(response.data.data?.status || '');
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to fetch payment details');
    }
  };

  const updateStatus = async () => {
    if (!selectedPayment || !newStatus || newStatus === selectedPayment.status) return;
    try {
      setUpdating(true);
      await paymentsAPI.updateStatus(selectedPayment.id, { status: newStatus });
      toast.success('Payment status updated');
      fetchPayments(meta.current_page);
      const response = await paymentsAPI.getOne(selectedPayment.id);
      setSelectedPayment(response.data.data);
      setNewStatus(response.data.data?.status || '');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
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
      processing: 'warning',
      completed: 'success',
      failed: 'danger',
      refunded: 'info',
      cancelled: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status?.replace('_', ' ')}</Badge>;
  };

  const statuses = ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'];
  const methods = ['cod', 'gcash'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value;
              setStatusFilter(val);
              fetchPayments(1, val, methodFilter);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => {
              const val = e.target.value;
              setMethodFilter(val);
              fetchPayments(1, statusFilter, val);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
          >
            <option value="">All Methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>{m.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {payment.order?.order_number}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {payment.order?.user
                        ? `${payment.order.user.first_name} ${payment.order.user.last_name}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 capitalize">{payment.payment_method?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 font-medium">{formatPrice(payment.amount)}</td>
                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(payment.paid_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewPayment(payment.id)}
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

        <div className="p-4 border-t">
          <Pagination
            currentPage={meta.current_page}
            totalPages={meta.last_page}
            onPageChange={fetchPayments}
          />
        </div>
      </div>

      {/* Payment Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Payment #${selectedPayment?.id}`}
        size="md"
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <FaMoneyBillWave className="text-primary-600" />
                Payment Details
              </h4>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Order:</span> <span className="font-medium">{selectedPayment.order?.order_number}</span></p>
                <p><span className="text-gray-500">Customer:</span> {selectedPayment.order?.user?.first_name} {selectedPayment.order?.user?.last_name}</p>
                <p><span className="text-gray-500">Method:</span> <span className="capitalize">{selectedPayment.payment_method?.replace('_', ' ')}</span></p>
                <p><span className="text-gray-500">Amount:</span> <span className="font-semibold">{formatPrice(selectedPayment.amount)}</span></p>
                <p><span className="text-gray-500">Transaction ID:</span> {selectedPayment.transaction_id || '-'}</p>
                <p><span className="text-gray-500">Paid At:</span> {formatDate(selectedPayment.paid_at)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Update Status</label>
              <div className="flex gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
                <Button
                  onClick={updateStatus}
                  disabled={updating || newStatus === selectedPayment.status}
                  loading={updating}
                >
                  Update
                </Button>
              </div>
            </div>

            {selectedPayment.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-gray-800">{selectedPayment.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Payments;
