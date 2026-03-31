import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaMoneyBill, FaMobile, FaCheckCircle, FaHome, FaBriefcase, FaMapMarkerAlt } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, addressesAPI, cartAPI, paymentsAPI } from '../services/api';
import { toAbsoluteImageUrl, PLACEHOLDER_PRODUCT } from '../utils/imageUrl';
import { formatShadeOptionLabel } from '../utils/productShades';
import { reverseGeocode } from '../utils/geocode';
import { toast } from 'react-toastify';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import MapPinPicker from '../components/checkout/MapPinPicker';

const PAYMENT_STEP = 'checkout';
const PAYMENT_FORM_STEP = 'payment';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, items, clearCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [step, setStep] = useState(PAYMENT_STEP);
  const [checkoutData, setCheckoutData] = useState(null); // For GCash: shipping info before payment (order not created until payment)
  const [gcashQrImageUrl, setGcashQrImageUrl] = useState('');
  const [gcashReceiverName, setGcashReceiverName] = useState('Ganda Hub Cosmetics');
  const [gcashReceiverNumber, setGcashReceiverNumber] = useState('');
  const [gcashOrderId, setGcashOrderId] = useState(null);
  const [creatingGcashOrder, setCreatingGcashOrder] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      payment_method: 'cod',
    },
  });

  // Sync payment method into form so we always use submit-time value (avoids race if user selects GCash and quickly clicks Place Order)
  useEffect(() => {
    setValue('payment_method', paymentMethod);
  }, [paymentMethod, setValue]);

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [pin, setPin] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [saveAddressLabel, setSaveAddressLabel] = useState('home');
  const [saveAddressAsDefault, setSaveAddressAsDefault] = useState(false);
  const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const watchShipping = watch(['shipping_address', 'shipping_city', 'shipping_zip_code']);

  useEffect(() => {
    let cancelled = false;
    addressesAPI.getAll().then((res) => {
      if (!cancelled && res?.data?.data) setSavedAddresses(Array.isArray(res.data.data) ? res.data.data : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedAddressId) return;
    const addr = savedAddresses.find((a) => a.id === selectedAddressId);
    if (addr) {
      setValue('shipping_address', addr.address);
      setValue('shipping_city', addr.city);
      setValue('shipping_state', addr.state || '');
      setValue('shipping_zip_code', addr.zip_code);
      setPin(addr.lat != null && addr.lng != null ? { lat: addr.lat, lng: addr.lng } : null);
    }
  }, [selectedAddressId, savedAddresses, setValue]);

  const handleMapPin = async (lat, lng) => {
    setPin({ lat, lng });
    setGeocoding(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (result) {
        setValue('shipping_address', result.address || '');
        setValue('shipping_city', result.city || '');
        setValue('shipping_state', result.state || '');
        setValue('shipping_zip_code', result.zip_code || '');
      }
    } catch (_) {}
    setGeocoding(false);
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await addressesAPI.setDefault(id);
      setSavedAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.id === id }))
      );
      toast.success('Default address updated.');
    } catch (_) {
      toast.error('Could not set default address.');
    }
  };

  const handleSaveAddressNow = async () => {
    const [address, city, zip_code] = watchShipping || [];
    if (!address?.trim() || !city?.trim() || !zip_code?.trim()) {
      toast.error('Please fill in address, city, and ZIP code first.');
      return;
    }
    setSavingAddress(true);
    try {
      const res = await addressesAPI.create({
        label: saveAddressLabel,
        address: address.trim(),
        city: city.trim(),
        state: watch('shipping_state') || null,
        zip_code: String(zip_code).trim(),
        country: 'Philippines',
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        is_default: saveAddressAsDefault,
      });
      const newAddr = res?.data?.data;
      if (newAddr) setSavedAddresses((prev) => [newAddr, ...prev]);
      toast.success('Address saved. You can select it above next time.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const paymentForm = useForm({
    defaultValues: {
      // GCash
      gcash_number: '',
      gcash_name: '',
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
  ];

  const onSubmit = async (data) => {
    // Use payment_method from form data (submit-time value), not state - avoids race where state hasn't updated yet
    const method = data.payment_method || paymentMethod;
    const needsPaymentStep = ['gcash'].includes(method);
    // Prefer fresh cart from API; fall back to context if API fails (e.g. network issue)
    let latestItems = [];
    try {
      const cartRes = await cartAPI.get();
      latestItems = cartRes?.data?.data?.items ?? [];
    } catch (_) {
      latestItems = items;
    }
    if (latestItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        ...data,
        payment_method: method,
      };

      if (needsPaymentStep) {
        // Don't create order yet - wait until payment is submitted so we don't get pending orders from abandoned checkouts
        if (saveAddressForNextTime && data.shipping_address && data.shipping_city && data.shipping_zip_code) {
          try {
            await addressesAPI.create({
              label: saveAddressLabel,
              address: data.shipping_address,
              city: data.shipping_city,
              state: data.shipping_state || null,
              zip_code: data.shipping_zip_code,
              country: 'Philippines',
              lat: pin?.lat ?? null,
              lng: pin?.lng ?? null,
              is_default: saveAddressAsDefault,
            });
            toast.success('Address saved for next time.');
          } catch (_) {}
        }
        setCheckoutData(orderData);
        setStep(PAYMENT_FORM_STEP);
        toast.success('Complete your payment below.');
      } else {
        const response = await ordersAPI.create(orderData);
        const order = response.data.data;
        if (saveAddressForNextTime && data.shipping_address && data.shipping_city && data.shipping_zip_code) {
          try {
            await addressesAPI.create({
              label: saveAddressLabel,
              address: data.shipping_address,
              city: data.shipping_city,
              state: data.shipping_state || null,
              zip_code: data.shipping_zip_code,
              country: 'Philippines',
              lat: pin?.lat ?? null,
              lng: pin?.lng ?? null,
              is_default: saveAddressAsDefault,
            });
            toast.success('Address saved for next time.');
          } catch (_) {}
        }
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

  if (cartLoading) {
    return <Loading fullScreen />;
  }

  if (items.length === 0 && !checkoutData) {
    navigate('/cart');
    return null;
  }

  useEffect(() => {
    if (step !== PAYMENT_FORM_STEP || paymentMethod !== 'gcash') return;
    let cancelled = false;
    const loadGcashSettings = async () => {
      try {
        const methodsRes = await paymentsAPI.getMethods();
        const gcash = methodsRes?.data?.data?.gcash || {};
        if (!cancelled) {
          setGcashQrImageUrl(String(gcash.qr_image_url || '').trim());
          setGcashReceiverName(String(gcash.receiver_name || 'Ganda Hub Cosmetics'));
          setGcashReceiverNumber(String(gcash.receiver_number || '').trim());
        }
      } catch (_) {
        if (!cancelled) {
          setGcashQrImageUrl('');
        }
      }
    };

    loadGcashSettings();
    return () => {
      cancelled = true;
    };
  }, [step, paymentMethod]);

  // Auto-create GCash order once user reaches QR step (no "I have paid" button).
  useEffect(() => {
    if (step !== PAYMENT_FORM_STEP || paymentMethod !== 'gcash' || !checkoutData || gcashOrderId || creatingGcashOrder) return;
    let cancelled = false;
    (async () => {
      try {
        setCreatingGcashOrder(true);
        const payload = {
          ...checkoutData,
          payment_method: 'gcash',
        };
        const response = await ordersAPI.create(payload);
        const order = response?.data?.data;
        if (!cancelled && order?.id) {
          setGcashOrderId(order.id);
          toast.info('Order created. Waiting for payment confirmation...');
        }
      } catch (error) {
        if (!cancelled) {
          const message = error.response?.data?.message || 'Failed to prepare GCash order';
          toast.error(message);
        }
      } finally {
        if (!cancelled) setCreatingGcashOrder(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, paymentMethod, checkoutData, gcashOrderId, creatingGcashOrder]);

  // Auto-continue when payment is confirmed.
  useEffect(() => {
    if (!gcashOrderId) return;
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const res = await ordersAPI.getOne(gcashOrderId);
        const order = res?.data?.data;
        const paymentStatus = String(order?.payment?.status || '').toLowerCase();
        const orderStatus = String(order?.status || '').toLowerCase();
        const isPaid = paymentStatus === 'completed' || ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'].includes(orderStatus);
        if (!cancelled && isPaid) {
          toast.success('Payment confirmed. Continuing...');
          clearCart();
          setCheckoutData(null);
          setGcashOrderId(null);
          navigate(`/orders/${order.id}`);
        }
      } catch (_) {}
    };
    checkStatus();
    const id = setInterval(checkStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [gcashOrderId, clearCart, navigate]);

  if (step === PAYMENT_FORM_STEP && checkoutData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => { setStep(PAYMENT_STEP); setCheckoutData(null); setGcashOrderId(null); }}
            className="text-primary-600 hover:text-primary-700 text-sm mb-4"
          >
            ← Back to checkout
          </button>
          <div className="flex items-center gap-2 text-green-600 mb-6">
            <FaCheckCircle className="w-6 h-6" />
            <h1 className="text-2xl font-display font-bold">Complete Your Payment</h1>
          </div>
          <p className="text-gray-600 mb-8">
            Scan the GCash QR below and pay the exact amount.
          </p>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">
                {paymentMethod === 'gcash' && 'GCash Payment'}
              </h2>

              {/* Direct GCash QR payment (no PayMongo redirect) */}
              {paymentMethod === 'gcash' && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    {!gcashQrImageUrl ? (
                      <>
                        <p className="text-sm text-gray-700">
                          Pay amount: <span className="font-semibold">{formatPrice(cart?.total)}</span>
                        </p>
                        <p className="text-sm text-red-600 mt-2">
                          GCash QR is not configured yet. Ask admin to set `gcash_qr_image_url` in Settings.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 mb-3">
                          Open your GCash app and scan this merchant QR to pay.
                        </p>
                        <div className="flex justify-center my-3">
                          <img
                            src={gcashQrImageUrl}
                            alt="GCash QR"
                            className="w-64 h-64 rounded-lg border border-gray-200 bg-white p-2"
                          />
                        </div>
                        <p className="text-sm text-gray-700">
                          Receiver: <span className="font-semibold">{gcashReceiverName}</span>
                        </p>
                        <p className="text-sm text-gray-700">
                          Number: <span className="font-semibold">{gcashReceiverNumber || '-'}</span>
                        </p>
                        <p className="text-sm text-gray-700 mt-2">
                          Amount: <span className="font-semibold">{formatPrice(cart?.total)}</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {gcashQrImageUrl ? (
                <p className="text-sm text-center text-gray-600">
                  {creatingGcashOrder
                    ? 'Preparing your order...'
                    : gcashOrderId
                      ? 'Waiting for payment confirmation... This will continue automatically.'
                      : 'Initializing payment...'}
                </p>
              ) : (
                <p className="text-sm text-center text-gray-600">
                  Configure GCash QR first in admin settings.
                </p>
              )}
            </div>
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

                {savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">Use a saved address</p>
                    <div className="space-y-2">
                      {savedAddresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === addr.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-primary-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="saved_address"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-primary-600">
                            {addr.label === 'home' && <FaHome className="inline mr-2" />}
                            {addr.label === 'work' && <FaBriefcase className="inline mr-2" />}
                            {addr.label === 'other' && <FaMapMarkerAlt className="inline mr-2" />}
                            {addr.label === 'home' ? 'Home' : addr.label === 'work' ? 'Work' : 'Other'}
                            {addr.is_default && <span className="ml-2 text-xs text-gray-500">(default)</span>}
                          </span>
                          <span className="text-gray-600 truncate flex-1">{addr.address}, {addr.city}</span>
                          {!addr.is_default && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); handleSetDefaultAddress(addr.id); }}
                              className="text-xs text-primary-600 hover:text-primary-700"
                            >
                              Set as default
                            </button>
                          )}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Or enter a new address below.</p>
                  </div>
                )}

                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    <FaMapMarkerAlt /> {showMap ? 'Hide map' : 'Set location on map (click to drop a pin)'}
                  </button>
                  {showMap && (
                    <div className="mt-3">
                      <MapPinPicker
                        pin={pin}
                        onPinChange={handleMapPin}
                        height={260}
                      />
                      {geocoding && <p className="text-xs text-gray-500 mt-1">Looking up address...</p>}
                    </div>
                  )}
                </div>
                
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
                    placeholder="Enter your email address"
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

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm text-gray-600">Save as:</span>
                    <select
                      value={saveAddressLabel}
                      onChange={(e) => setSaveAddressLabel(e.target.value)}
                      className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                    >
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                      <option value="other">Other</option>
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAddressAsDefault}
                        onChange={(e) => setSaveAddressAsDefault(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600">Set as default</span>
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={savingAddress}
                      onClick={handleSaveAddressNow}
                    >
                      Save address now
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={saveAddressForNextTime}
                      onChange={(e) => setSaveAddressForNextTime(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Also save when I place this order</span>
                  </label>
                </div>
              </div>

              {/* Payment Method - synced to form so submit always uses current choice */}
              <input type="hidden" {...register('payment_method')} />
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
                        src={toAbsoluteImageUrl(item.product?.thumbnail)}
                        alt={item.product?.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                            e.target.dataset.failed = '1';
                            e.target.src = PLACEHOLDER_PRODUCT;
                          }
                        }}
                      />
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">
                          {item.product?.name}
                        </p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        {formatShadeOptionLabel(item.options) && (
                          <p className="text-xs text-primary-600 font-medium mt-0.5">
                            {formatShadeOptionLabel(item.options)}
                          </p>
                        )}
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

                {/* Place Order / Continue to Payment */}
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  className="mt-6"
                  loading={loading}
                >
                  {['gcash'].includes(paymentMethod) ? 'Continue to Payment' : 'Place Order'}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By placing this order, you agree to our{' '}
                  <Link to="/terms-of-service" className="text-primary-600 hover:text-primary-700 underline" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="text-primary-600 hover:text-primary-700 underline" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </Link>
                  .
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
