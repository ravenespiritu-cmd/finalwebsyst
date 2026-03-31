import { useState, useEffect } from 'react';
import { ordersAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';

const SupplierOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const res = await ordersAPI.getAll({ page, per_page: 10 });
      setOrders(res.data.data || []);
      setMeta(res.data.meta || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateSupplierStatus = async (orderId, status) => {
    try {
      await ordersAPI.supplierUpdateStatus(orderId, { status });
      toast.success(`Order marked as ${status.replace(/_/g, ' ')}`);
      fetchOrders(meta.current_page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const formatPrice = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      confirmed: 'info',
      processing: 'info',
      shipped: 'primary',
      out_for_delivery: 'primary',
      delivered: 'success',
      cancelled: 'danger',
      refunded: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  if (loading && orders.length === 0) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Orders (Your Products)</h1>
      <p className="text-gray-600 mb-4">Supplier-managed flow: confirm, process, fulfill (ship), or reject incoming orders</p>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <p className="p-8 text-gray-500 text-center">No orders yet</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{order.order_number}</td>
                      <td className="px-6 py-4">
                        {order.user ? `${order.user.first_name} ${order.user.last_name}` : '-'}
                        <br />
                        <span className="text-sm text-gray-500">{order.shipping_email}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 font-medium">{formatPrice(order.total)}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateSupplierStatus(order.id, 'confirmed')}
                            >
                              Confirm
                            </Button>
                          )}
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => updateSupplierStatus(order.id, 'processing')}
                            >
                              Set Processing
                            </Button>
                          )}
                          {order.status === 'processing' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => updateSupplierStatus(order.id, 'shipped')}
                            >
                              Fulfill (Ship)
                            </Button>
                          )}
                          {['pending', 'confirmed', 'processing'].includes(order.status) && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => updateSupplierStatus(order.id, 'cancelled')}
                            >
                              Reject
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t">
              <Pagination
                currentPage={meta.current_page}
                totalPages={meta.last_page}
                onPageChange={fetchOrders}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupplierOrders;
