import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaCreditCard, FaMoneyBill, FaMobile, FaCheckCircle } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, paymentsAPI } from '../services/api';
import { toast } from 'react-toastify';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';

const PAYMENT_STEP = 'checkout';
const PAYMENT_FORM_STEP = 'payment';

// Luhn algorithm for card validation
const luhnCheck = (value) => {
  const digits = value.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, items, clearCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [step, setStep] = useState(PAYMENT_STEP);
  const [placedOrder, setPlacedOrder] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      shipping_first_name: user?.first_name || '',
      shipping_last_name: user?.last_name || '',
      shipping_email: user?.email || '',
      shipping_phone: user?.phone || '',
      shipping_address: user?.address || '',
      shipping_city: user?.city || '',
      shipping_state: user?.state || '',
      shipping_zip_code: user?.zip_code || '',
    },
  });

  const paymentForm = useForm({
    defaultValues: {
      // Credit card
      card_number: '',
      cardholder_name: '',
      card_expiry: '',
      card_cvv: '',
      // GCash
      gcash_number: '',
      gcash_name: '',
      // Maya
      maya_number: '',
      maya_name: '',
    },
  });

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const paymentMethods = [
    { id: 'cod', name: 'Cash on Delivery', icon: FaMoneyBill, description: 'Pay when you receive' },
    { id: 'gcash', name: 'GCash', icon: FaMobile, description: 'Pay via GCash' },
    { id: 'maya', name: 'Maya', icon: FaMobile, description: 'Pay via Maya' },
    { id: 'credit_card', name: 'Credit Card', icon: FaCreditCard, description: 'Visa, Mastercard' },
  ];

  const needsPaymentStep = ['gcash', 'maya', 'credit_card'].includes(paymentMethod);

  const onSubmit = async (data) => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        ...data,
        payment_method: paymentMethod,
      };

      const response = await ordersAPI.create(orderData);
      const order = response.data.data;

      if (needsPaymentStep) {
        setPlacedOrder(order);
        setStep(PAYMENT_FORM_STEP);
        toast.success('Order created! Complete your payment below.');
      } else {
        toast.success('Order placed successfully! Pay on delivery.');
        clearCart();
        navigate(`/orders/${order.id}`);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to place order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onPaymentSubmit = async (data) => {
    if (!placedOrder) return;
    try {
      setLoading(true);
      const payload = {
        payment_method: paymentMethod,
        ...(paymentMethod === 'credit_card' && {
          card_number: data.card_number.replace(/\s/g, ''),
          cardholder_name: data.cardholder_name,
          card_expiry: data.card_expiry,
          card_cvv: data.card_cvv,
        }),
        ...(paymentMethod === 'gcash' && {
          gcash_number: data.gcash_number?.replace(/\s/g, ''),
          gcash_name: data.gcash_name,
        }),
        ...(paymentMethod === 'maya' && {
          maya_number: data.maya_number?.replace(/\s/g, ''),
          maya_name: data.maya_name,
        }),
      };
      await paymentsAPI.process(placedOrder.id, payload);
      toast.success('Payment successful!');
      clearCart();
      navigate(`/orders/${placedOrder.id}`);
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors || {}).flat().join(' ')
        : 'Payment failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (cartLoading) {
    return <Loading fullScreen />;
  }

  if (items.length === 0 && !placedOrder) {
    navigate('/cart');
    return null;
  }

  // Payment form step (for GCash, Maya, Credit Card)
  if (step === PAYMENT_FORM_STEP && placedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-green-600 mb-6">
            <FaCheckCircle className="w-6 h-6" />
            <h1 className="text-2xl font-display font-bold">Complete Your Payment</h1>
          </div>
          <p className="text-gray-600 mb-8">
            Order #{placedOrder.order_number} • {formatPrice(placedOrder.total)}
          </p>

          <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}>
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">
                {paymentMethod === 'credit_card' && 'Credit Card Details'}
                {paymentMethod === 'gcash' && 'GCash Payment'}
                {paymentMethod === 'maya' && 'Maya Payment'}
              </h2>

              {/* Credit Card - Real requirements: Card number, Cardholder name, Expiry, CVV */}
              {paymentMethod === 'credit_card' && (
                <div className="space-y-4">
                  <Input
                    label="Card Number"
                    placeholder="4111 1111 1111 1111"
                    error={paymentForm.formState.errors.card_number?.message}
                    {...paymentForm.register('card_number', {
                      required: 'Card number is required',
                      validate: (v) => {
                        const digits = v.replace(/\s/g, '');
                        if (digits.length < 13 || digits.length > 19) return 'Card number must be 13-19 digits';
                        if (!/^\d+$/.test(digits)) return 'Card number must contain only digits';
                        if (!luhnCheck(v)) return 'Invalid card number';
                        return true;
                      },
                    })}
                  />
                  <Input
                    label="Cardholder Name"
                    placeholder="Name as shown on card"
                    error={paymentForm.formState.errors.cardholder_name?.message}
                    {...paymentForm.register('cardholder_name', {
                      required: 'Cardholder name is required',
                      minLength: { value: 2, message: 'Enter the full name on the card' },
                    })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Expiry Date (MM/YY)"
                      placeholder="12/28"
                      error={paymentForm.formState.errors.card_expiry?.message}
                      {...paymentForm.register('card_expiry', {
                        required: 'Expiry date is required',
                        pattern: {
                          value: /^(0[1-9]|1[0-2])\/([0-9]{2})$/,
                          message: 'Use MM/YY format (e.g. 12/28)',
                        },
                        validate: (v) => {
                          const [mm, yy] = v.split('/');
                          const exp = new Date(2000 + parseInt(yy), parseInt(mm) - 1);
                          if (exp < new Date()) return 'Card has expired';
                          return true;
                        },
                      })}
                    />
                    <Input
                      label="CVV / Security Code"
                      type="password"
                      placeholder="123"
                      maxLength={4}
                      error={paymentForm.formState.errors.card_cvv?.message}
                      {...paymentForm.register('card_cvv', {
                        required: 'CVV is required',
                        pattern: {
                          value: /^\d{3,4}$/,
                          message: 'CVV must be 3 or 4 digits',
                        },
                      })}
                    />
                  </div>
                  <p className="text-xs text-gray-500">CVV is the 3 or 4-digit code on the back of your card.</p>
                </div>
              )}

              {/* GCash - Real requirements: Registered mobile number, Name as registered in GCash */}
              {paymentMethod === 'gcash' && (
                <div className="space-y-4">
                  <Input
                    label="GCash-Registered Mobile Number"
                    placeholder="0917 123 4567"
                    error={paymentForm.formState.errors.gcash_number?.message}
                    {...paymentForm.register('gcash_number', {
                      required: 'Mobile number is required',
                      validate: (v) => /^09\d{9}$/.test((v || '').replace(/\s/g, '')) || 'Enter 11-digit number starting with 09 (e.g. 0917 123 4567)',
                    })}
                  />
                  <Input
                    label="Full Name (as registered in GCash)"
                    placeholder="Juan Dela Cruz"
                    error={paymentForm.formState.errors.gcash_name?.message}
                    {...paymentForm.register('gcash_name', {
                      required: 'Name is required for verification',
                      minLength: { value: 2, message: 'Enter your full name as registered in GCash' },
                    })}
                  />
                  <p className="text-sm text-gray-600">
                    You will receive a payment request on your GCash app. Name must match your GCash registration.
                  </p>
                </div>
              )}

              {/* Maya - Real requirements: Registered mobile number, Name as registered in Maya */}
              {paymentMethod === 'maya' && (
                <div className="space-y-4">
                  <Input
                    label="Maya-Registered Mobile Number"
                    placeholder="0917 123 4567"
                    error={paymentForm.formState.errors.maya_number?.message}
                    {...paymentForm.register('maya_number', {
                      required: 'Mobile number is required',
                      validate: (v) => /^09\d{9}$/.test((v || '').replace(/\s/g, '')) || 'Enter 11-digit number starting with 09 (e.g. 0917 123 4567)',
                    })}
                  />
                  <Input
                    label="Full Name (as registered in Maya)"
                    placeholder="Juan Dela Cruz"
                    error={paymentForm.formState.errors.maya_name?.message}
                    {...paymentForm.register('maya_name', {
                      required: 'Name is required for verification',
                      minLength: { value: 2, message: 'Enter your full name as registered in Maya' },
                    })}
                  />
                  <p className="text-sm text-gray-600">
                    You will receive a payment request on your Maya app. Name must match your Maya registration.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
              >
                Pay {formatPrice(placedOrder.total)}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-gray-800 mb-8">Checkout</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Information */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">
                  Shipping Information
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    placeholder="Cy"
                    error={errors.shipping_first_name?.message}
                    {...register('shipping_first_name', {
                      required: 'First name is required',
                    })}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Ong"
                    error={errors.shipping_last_name?.message}
                    {...register('shipping_last_name', {
                      required: 'Last name is required',
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="cyven@example.com"
                    error={errors.shipping_email?.message}
                    {...register('shipping_email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  <Input
                    label="Phone"
                    placeholder="+63 912 345 6789"
                    error={errors.shipping_phone?.message}
                    {...register('shipping_phone', {
                      required: 'Phone is required',
                    })}
                  />
                </div>

                <div className="mt-4">
                  <Input
                    label="Address"
                    placeholder="123 Main Street, Barangay Example"
                    error={errors.shipping_address?.message}
                    {...register('shipping_address', {
                      required: 'Address is required',
                    })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <Input
                    label="City"
                    placeholder="Makati City"
                    error={errors.shipping_city?.message}
                    {...register('shipping_city', {
                      required: 'City is required',
                    })}
                  />
                  <Input
                    label="State/Province"
                    placeholder="Metro Manila"
                    error={errors.shipping_state?.message}
                    {...register('shipping_state')}
                  />
                  <Input
                    label="ZIP Code"
                    placeholder="1234"
                    error={errors.shipping_zip_code?.message}
                    {...register('shipping_zip_code', {
                      required: 'ZIP code is required',
                    })}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">
                  Payment Method
                </h2>

                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <label
                        key={method.id}
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                          paymentMethod === method.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <Icon className="w-6 h-6 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-800">{method.name}</p>
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Order Notes (Optional)
                </h2>
                <textarea
                  placeholder="Any special instructions for your order..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                  {...register('notes')}
                />
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">
                  Order Summary
                </h2>

                {/* Items */}
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={item.product?.thumbnail || '/placeholder-product.jpg'}
                        alt={item.product?.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">
                          {item.product?.name}
                        </p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        <p className="text-sm font-medium text-primary-600">
                          {formatPrice(item.total_price)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="my-4" />

                {/* Totals */}
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

                {/* Place Order Button */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  className="mt-6"
                  loading={loading}
                >
                  Place Order
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By placing this order, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
