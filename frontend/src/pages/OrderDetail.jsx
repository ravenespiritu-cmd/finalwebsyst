import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaArrowLeft, FaTruck, FaCheckCircle, FaBox, FaStar } from 'react-icons/fa';
import { ordersAPI, reviewsAPI } from '../services/api';
import { toAbsoluteImageUrl, PLACEHOLDER_PRODUCT } from '../utils/imageUrl';
import { formatShadeOptionLabel } from '../utils/productShades';
import Loading from '../components/common/Loading';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { toast } from 'react-toastify';

const StarRating = ({ value, onChange, readonly = false, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star)}
          className={`${sizeClass} ${value >= star ? 'text-amber-400' : 'text-gray-300'} hover:opacity-80 transition`}
        >
          <FaStar className={value >= star ? 'fill-current' : ''} />
        </button>
      ))}
    </div>
  );
};

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [riderRating, setRiderRating] = useState(0);
  const [riderComment, setRiderComment] = useState('');
  const [submittingRider, setSubmittingRider] = useState(false);
  const [productRatings, setProductRatings] = useState({});
  const [productComments, setProductComments] = useState({});
  const [submittingProduct, setSubmittingProduct] = useState(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getOne(id);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    try {
      setCancelling(true);
      await ordersAPI.cancel(id);
      toast.success('Order cancelled successfully');
      fetchOrder();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to cancel order';
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const handleRateRider = async (e) => {
    e.preventDefault();
    if (!riderRating) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmittingRider(true);
    try {
      await ordersAPI.rateRider(id, { rating: riderRating, comment: riderComment.trim() || null });
      toast.success('Thank you for rating your rider!');
      setRiderRating(0);
      setRiderComment('');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRider(false);
    }
  };

  const handleRateProduct = async (e, productId, productName) => {
    e.preventDefault();
    const rating = productRatings[productId];
    if (!rating) {
      toast.error('Please select a star rating for ' + productName);
      return;
    }
    setSubmittingProduct(productId);
    try {
      await reviewsAPI.create({
        product_id: productId,
        order_id: parseInt(id, 10),
        rating,
        comment: (productComments[productId] || '').trim() || null,
      });
      toast.success('Review submitted. It may appear after approval.');
      setProductRatings((prev) => ({ ...prev, [productId]: 0 }));
      setProductComments((prev) => ({ ...prev, [productId]: '' }));
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingProduct(null);
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
      hour: '2-digit',
      minute: '2-digit',
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
    return <Badge variant={variants[status] || 'default'} size="lg">{status.replace(/_/g, ' ')}</Badge>;
  };

  const orderStatuses = [
    { key: 'pending', label: 'Order Placed', icon: FaBox },
    { key: 'confirmed', label: 'Confirmed', icon: FaCheckCircle },
    { key: 'processing', label: 'Processing', icon: FaBox },
    { key: 'shipped', label: 'Shipped', icon: FaTruck },
    { key: 'delivered', label: 'Delivered', icon: FaCheckCircle },
  ];

  const getCurrentStatusIndex = () => {
    if (order?.status === 'cancelled' || order?.status === 'refunded') return -1;
    if (order?.status === 'out_for_delivery') {
      return orderStatuses.findIndex((s) => s.key === 'shipped');
    }
    return orderStatuses.findIndex((s) => s.key === order?.status);
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Order Not Found</h2>
          <Link to="/orders" className="text-primary-600 hover:text-primary-700">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getCurrentStatusIndex();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
        >
          <FaArrowLeft />
          Back to Orders
        </Link>

        {/* Order Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-800">
                Order #{order.order_number}
              </h1>
              <p className="text-gray-600 mt-1">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(order.status)}
              {(order.status === 'pending' || order.status === 'confirmed') && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancelOrder}
                  loading={cancelling}
                >
                  Cancel Order
                </Button>
              )}
            </div>
          </div>

          {/* Order Progress */}
          {currentStatusIndex >= 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                {orderStatuses.map((status, index) => {
                  const Icon = status.icon;
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  
                  return (
                    <div key={status.key} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-primary-200' : ''}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-xs mt-2 text-center ${
                        isCompleted ? 'text-primary-600 font-medium' : 'text-gray-400'
                      }`}>
                        {status.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="relative mt-2">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2" />
                <div
                  className="absolute top-1/2 left-0 h-1 bg-primary-500 -translate-y-1/2 transition-all"
                  style={{ width: `${(currentStatusIndex / (orderStatuses.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h2>
          <div className="divide-y divide-gray-100">
            {order.items?.map((item) => (
              <div key={item.id} className="py-4 flex gap-4">
                <img
                  src={toAbsoluteImageUrl(item.product?.thumbnail)}
                  alt={item.product_name}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                      e.target.dataset.failed = '1';
                      e.target.src = PLACEHOLDER_PRODUCT;
                    }
                  }}
                />
                <div className="flex-grow">
                  <p className="font-medium text-gray-800">{item.product_name}</p>
                  <p className="text-sm text-gray-500">SKU: {item.product_sku}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-600">
                      {formatPrice(item.unit_price)} x {item.quantity}
                    </p>
                    <p className="font-semibold text-primary-600">
                      {formatPrice(item.total_price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rate your experience - only when delivered */}
        {order.status === 'delivered' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Rate your experience</h2>

            {/* Rate rider */}
            {order.delivery?.rider && (
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Rate your rider</h3>
                <p className="text-gray-600 text-sm mb-2">
                  {order.delivery.rider.first_name} {order.delivery.rider.last_name}
                </p>
                {order.rider_rating ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <StarRating value={order.rider_rating.rating} readonly size="sm" />
                    <span className="text-sm">You rated this rider</span>
                    {order.rider_rating.comment && (
                      <p className="text-sm text-gray-500 mt-1 w-full">{order.rider_rating.comment}</p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleRateRider} className="space-y-2">
                    <StarRating value={riderRating} onChange={setRiderRating} />
                    <textarea
                      placeholder="Optional: How was your delivery?"
                      value={riderComment}
                      onChange={(e) => setRiderComment(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <Button type="submit" variant="primary" size="sm" loading={submittingRider} disabled={!riderRating}>
                      Submit rider rating
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* Rate products */}
            <h3 className="text-sm font-medium text-gray-700 mb-3">Rate your products</h3>
            <div className="space-y-4">
              {order.items?.map((item) => {
                const productId = item.product_id;
                const productName = item.product_name || item.product?.name || 'Product';
                const userReview = item.user_review;
                return (
                  <div key={item.id} className="flex flex-wrap gap-4 items-start p-4 bg-gray-50 rounded-lg">
                    <img
                      src={toAbsoluteImageUrl(item.product?.thumbnail)}
                      alt=""
                      className="w-14 h-14 object-cover rounded"
                      onError={(e) => { if (e.target.src !== PLACEHOLDER_PRODUCT) e.target.src = PLACEHOLDER_PRODUCT; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{productName}</p>
                      {formatShadeOptionLabel(item.options) && (
                        <p className="text-xs text-primary-600 font-medium mt-0.5">
                          {formatShadeOptionLabel(item.options)}
                        </p>
                      )}
                      {userReview ? (
                        <div className="mt-2">
                          <StarRating value={userReview.rating} readonly size="sm" />
                          {userReview.comment && (
                            <p className="text-sm text-gray-600 mt-1">{userReview.comment}</p>
                          )}
                          {!userReview.is_approved && (
                            <p className="text-xs text-amber-600 mt-1">Your review is pending approval</p>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={(e) => handleRateProduct(e, productId, productName)} className="mt-2 space-y-2">
                          <StarRating
                            value={productRatings[productId] || 0}
                            onChange={(v) => setProductRatings((prev) => ({ ...prev, [productId]: v }))}
                            size="sm"
                          />
                          <input
                            type="text"
                            placeholder="Optional: Add a comment"
                            value={productComments[productId] || ''}
                            onChange={(e) => setProductComments((prev) => ({ ...prev, [productId]: e.target.value }))}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                          />
                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            loading={submittingProduct === productId}
                            disabled={!(productRatings[productId] >= 1)}
                          >
                            Submit review
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Shipping Address */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h2>
            <p className="font-medium text-gray-800">
              {order.shipping_first_name} {order.shipping_last_name}
            </p>
            <p className="text-gray-600 mt-1">{order.shipping_address}</p>
            <p className="text-gray-600">
              {order.shipping_city}, {order.shipping_state} {order.shipping_zip_code}
            </p>
            <p className="text-gray-600">{order.shipping_country}</p>
            <p className="text-gray-600 mt-2">{order.shipping_phone}</p>
            <p className="text-gray-600">{order.shipping_email}</p>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">{formatPrice(order.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">{formatPrice(order.shipping_fee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-{formatPrice(order.discount)}</span>
                </div>
              )}
              <hr className="my-3" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(order.total)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Payment Method:</span>{' '}
                {order.payment?.payment_method?.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Payment Status:</span>{' '}
                <Badge variant={order.payment?.status === 'completed' ? 'success' : 'warning'}>
                  {order.payment?.status}
                </Badge>
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        {order.delivery && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Delivery Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Tracking Number</p>
                <p className="font-medium text-gray-800">{order.delivery.tracking_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant="primary">{order.delivery.status?.replace(/_/g, ' ')}</Badge>
              </div>
              {order.delivery.rider && (
                <div>
                  <p className="text-sm text-gray-500">Rider</p>
                  <p className="font-medium text-gray-800">
                    {order.delivery.rider.first_name} {order.delivery.rider.last_name}
                  </p>
                </div>
              )}
              {order.delivery.estimated_delivery && (
                <div>
                  <p className="text-sm text-gray-500">Estimated Delivery</p>
                  <p className="font-medium text-gray-800">
                    {formatDate(order.delivery.estimated_delivery)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
