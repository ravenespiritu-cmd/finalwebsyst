import { Link } from 'react-router-dom';
import { FaMinus, FaPlus, FaTrash, FaShoppingCart, FaTag } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toAbsoluteImageUrl, PLACEHOLDER_PRODUCT } from '../utils/imageUrl';
import { formatShadeOptionLabel } from '../utils/productShades';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import { useState, useEffect } from 'react';

const Cart = () => {
  const { cart, items, loading, updateQuantity, removeFromCart, clearCart, applyCoupon, removeCoupon, fetchCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Refetch cart when visiting this page so we never show stale items (e.g. after order was placed and backend cleared cart)
  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated, fetchCart]);

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    await applyCoupon(couponCode);
    setCouponCode('');
    setApplyingCoupon(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Please login to view your cart</p>
          <Link to="/login">
            <Button variant="primary">Login to Continue</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return <Loading fullScreen />;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Looks like you haven&apos;t added anything yet</p>
          <Link to="/products">
            <Button variant="primary">Start Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-gray-800 mb-8">Shopping Cart</h1>

        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {items.map((item) => (
                <div key={item.id} className="p-6 border-b border-gray-100 last:border-0">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link to={`/products/${item.product?.slug}`} className="flex-shrink-0">
                      <img
                        src={toAbsoluteImageUrl(item.product?.thumbnail)}
                        alt={item.product?.name}
                        className="w-24 h-24 object-cover rounded-lg"
                        onError={(e) => {
                          if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                            e.target.dataset.failed = '1';
                            e.target.src = PLACEHOLDER_PRODUCT;
                          }
                        }}
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-grow">
                      <Link 
                        to={`/products/${item.product?.slug}`}
                        className="font-medium text-gray-800 hover:text-primary-600"
                      >
                        {item.product?.name}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.product?.category?.name}
                      </p>
                      {formatShadeOptionLabel(item.options) && (
                        <p className="text-sm text-primary-600 mt-1 font-medium">
                          {formatShadeOptionLabel(item.options)}
                        </p>
                      )}
                      <p className="text-primary-600 font-semibold mt-2">
                        {formatPrice(item.unit_price)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-2 hover:bg-gray-100 transition-colors"
                            disabled={loading}
                          >
                            <FaMinus className="w-3 h-3" />
                          </button>
                          <span className="px-4 py-1 font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-2 hover:bg-gray-100 transition-colors"
                            disabled={loading || item.quantity >= item.product?.stock_quantity}
                          >
                            <FaPlus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-600 p-2"
                          disabled={loading}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        {formatPrice(item.total_price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear Cart */}
              <div className="p-4 bg-gray-50">
                <button
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-600 text-sm font-medium"
                  disabled={loading}
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-8 lg:mt-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Order Summary</h2>

              {/* Coupon */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Code
                </label>
                {cart?.coupon_code ? (
                  <div className="flex items-center justify-between bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaTag />
                      <span className="font-medium">{cart.coupon_code}</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      loading={applyingCoupon}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>

              {/* Summary Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(cart?.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (12% VAT)</span>
                  <span className="font-medium">{formatPrice(cart?.tax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">
                    {cart?.shipping === 0 ? 'Free' : formatPrice(cart?.shipping)}
                  </span>
                </div>
                {cart?.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-{formatPrice(cart?.discount)}</span>
                  </div>
                )}
                <hr className="my-4" />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(cart?.total)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Link to="/checkout" className="block mt-6">
                <Button variant="primary" fullWidth size="lg">
                  Proceed to Checkout
                </Button>
              </Link>

              {/* Continue Shopping */}
              <Link
                to="/products"
                className="block text-center text-primary-600 hover:text-primary-700 mt-4 text-sm"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
