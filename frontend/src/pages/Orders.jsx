import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBox, FaEye } from 'react-icons/fa';
import { ordersAPI } from '../services/api';
import { toAbsoluteImageUrl, PLACEHOLDER_PRODUCT } from '../utils/imageUrl';
import Loading from '../components/common/Loading';
import Badge from '../components/common/Badge';
import Pagination from '../components/common/Pagination';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await ordersAPI.getAll({ page });
      setOrders(response.data.data || []);
      setMeta(response.data.meta || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
    return <Badge variant={variants[status] || 'default'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-gray-800 mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
            <Link to="/products" className="text-primary-600 hover:text-primary-700 font-medium">
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Order Number</p>
                        <p className="font-semibold text-gray-800">{order.order_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium text-gray-800">{formatDate(order.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="font-semibold text-primary-600">{formatPrice(order.total)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(order.status)}
                      <Link
                        to={`/orders/${order.id}`}
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
                      >
                        <FaEye />
                        View Details
                      </Link>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="p-6">
                    <div className="flex flex-wrap gap-4">
                      {order.items?.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img
                            src={toAbsoluteImageUrl(item.product?.thumbnail)}
                            alt={item.product_name}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                                e.target.dataset.failed = '1';
                                e.target.src = PLACEHOLDER_PRODUCT;
                              }
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800 line-clamp-1">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                      {order.items?.length > 4 && (
                        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg">
                          <span className="text-sm text-gray-600">+{order.items.length - 4}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8">
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

export default Orders;
