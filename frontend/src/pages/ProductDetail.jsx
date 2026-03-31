import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaStar, FaMinus, FaPlus, FaShoppingCart, FaHeart, FaShare, FaChevronDown, FaFacebookF, FaFacebookMessenger, FaTwitter, FaWhatsapp, FaLink } from 'react-icons/fa';
import { productsAPI, reviewsAPI } from '../services/api';
import { toAbsoluteImageUrl, PLACEHOLDER_PRODUCT } from '../utils/imageUrl';
import { getProductShadesWithOriginal } from '../utils/productShades';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

const ProductDetail = () => {
  const { slug } = useParams();
  const { addToCart, loading: cartLoading } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedShadeIdx, setSelectedShadeIdx] = useState(0);
  const [shadeMenuOpen, setShadeMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const shadeMenuRef = useRef(null);
  const shareMenuRef = useRef(null);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    setSelectedShadeIdx(0);
    setSelectedImage(0);
    setQuantity(1);
    setShadeMenuOpen(false);
  }, [product?.id]);

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedShadeIdx]);

  useEffect(() => {
    if (!shadeMenuOpen) return;
    const close = (e) => {
      if (shadeMenuRef.current && !shadeMenuRef.current.contains(e.target)) {
        setShadeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [shadeMenuOpen]);

  useEffect(() => {
    if (!shareMenuOpen) return;
    const close = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [shareMenuOpen]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getBySlug(slug);
      setProduct(response.data.data);
      
      // Fetch reviews
      if (response.data.data?.id) {
        const reviewsRes = await reviewsAPI.getForProduct(response.data.data.id);
        setReviews(reviewsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
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

  const handleAddToCart = () => {
    if (!product) return;
    const shades = getProductShadesWithOriginal(product);
    let options = null;
    if (shades.length) {
      const s = shades[selectedShadeIdx];
      if (s) {
        if (s.isOriginal) {
          options = { shade: 'Original' };
        } else {
          options = { shade: s.name };
          if (s.hex) options.shade_hex = s.hex;
        }
      }
    }
    addToCart(product.id, quantity, options);
  };

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const canonicalPath = product?.slug ? `/products/${product.slug}` : window.location.pathname;
    return `${window.location.origin}${canonicalPath}`;
  };

  const copyShareLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyMessage('Link copied!');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      console.error('Failed to copy share link:', error);
      setCopyMessage('Failed to copy');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const openShareWindow = (platform) => {
    const shareUrl = encodeURIComponent(getShareUrl());
    const shareText = encodeURIComponent(`Check this out: ${product?.name || 'Product'}`);
    let url = '';

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
        break;
      case 'messenger':
        // Works best on devices with Messenger app installed.
        url = `fb-messenger://share?link=${shareUrl}`;
        break;
      case 'x':
        url = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${shareText}%20${shareUrl}`;
        break;
      default:
        return;
    }

    if (platform === 'messenger') {
      const opened = window.open(url, '_blank');
      if (!opened) {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank', 'noopener,noreferrer');
      }
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setShareMenuOpen(false);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      setShareMenuOpen((v) => !v);
      return;
    }
    try {
      await navigator.share({
        title: product?.name || 'Product',
        text: `Check this out: ${product?.name || 'Product'}`,
        url: getShareUrl(),
      });
    } catch (error) {
      // User cancelled share; no action needed.
      if (error?.name !== 'AbortError') {
        console.error('Native share failed:', error);
      }
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Product Not Found</h2>
          <Link to="/products" className="text-primary-600 hover:text-primary-700">
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const effectivePrice = product.sale_price || product.price;
  const isOnSale = product.sale_price && product.sale_price < product.price;
  const inStock = product.stock_quantity > 0;
  const shades = getProductShadesWithOriginal(product);
  const selectedShade = shades.length ? shades[selectedShadeIdx] : null;

  const rawImages = product.images?.length ? product.images : [product.thumbnail].filter(Boolean);
  let displayPaths = [...rawImages];
  if (selectedShade?.image && !selectedShade.isOriginal) {
    const sh = selectedShade.image;
    displayPaths = [sh, ...displayPaths.filter((p) => p && p !== sh)];
  }
  const images = displayPaths.length
    ? displayPaths.map((img) => toAbsoluteImageUrl(img))
    : [PLACEHOLDER_PRODUCT];

  const swatchFillStyle = (s) =>
    s?.hex
      ? { backgroundColor: s.hex }
      : { background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)' };

  const originalThumb = product.thumbnail || product.images?.[0];

  const renderBarSwatch = (s, sizeClass = 'w-8 h-8') => {
    if (!s) return null;
    if (s.isOriginal && originalThumb) {
      return (
        <span className={`${sizeClass} rounded-full border border-gray-200 overflow-hidden shrink-0 bg-white`}>
          <img
            src={toAbsoluteImageUrl(originalThumb)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              if (e.target.dataset.failed) return;
              e.target.dataset.failed = '1';
              e.target.src = PLACEHOLDER_PRODUCT;
            }}
          />
        </span>
      );
    }
    if (s.image) {
      return (
        <span className={`${sizeClass} rounded-full border border-gray-200 overflow-hidden shrink-0 bg-white`}>
          <img
            src={toAbsoluteImageUrl(s.image)}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              if (e.target.dataset.failed) return;
              e.target.dataset.failed = '1';
              e.target.src = PLACEHOLDER_PRODUCT;
            }}
          />
        </span>
      );
    }
    return (
      <span
        className={`${sizeClass} rounded-full border border-gray-300 shrink-0`}
        style={swatchFillStyle(s)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link to="/" className="hover:text-primary-600">Home</Link></li>
            <li>/</li>
            <li><Link to="/products" className="hover:text-primary-600">Products</Link></li>
            <li>/</li>
            <li className="text-gray-800">{product.name}</li>
          </ol>
        </nav>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 p-6 lg:p-10">
            {/* Images */}
            <div>
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                      e.target.dataset.failed = '1';
                      e.target.src = PLACEHOLDER_PRODUCT;
                    }
                  }}
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                        selectedImage === index ? 'border-primary-500' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={toAbsoluteImageUrl(img)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                            e.target.dataset.failed = '1';
                            e.target.src = PLACEHOLDER_PRODUCT;
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              {/* Category */}
              <p className="text-sm text-primary-600 font-medium uppercase tracking-wide mb-2">
                {product.category?.name}
              </p>

              {/* Name */}
              <h1 className="text-3xl font-display font-bold text-gray-800 mb-4">
                {product.name}
              </h1>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {isOnSale && <Badge variant="danger">Sale</Badge>}
                {product.is_featured && <Badge variant="primary">Featured</Badge>}
                {!inStock && <Badge variant="default">Out of Stock</Badge>}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <FaStar
                      key={i}
                      className={i < Math.round(product.average_rating) ? 'fill-current' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-gray-600">
                  {product.average_rating} ({product.review_count} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4 mb-6">
                <span className="text-3xl font-bold text-primary-600">
                  {formatPrice(effectivePrice)}
                </span>
                {isOnSale && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-gray-600 mb-6">
                  {product.short_description}
                </p>
              )}

              {/* SKU, Brand & Store */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <span className="text-gray-500">SKU:</span>
                  <span className="ml-2 text-gray-800">{product.sku}</span>
                </div>
                {product.brand && (
                  <div>
                    <span className="text-gray-500">Brand:</span>
                    <span className="ml-2 text-gray-800">{product.brand}</span>
                  </div>
                )}
                {product.store && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Market / Store:</span>
                    <Link
                      to={`/stores/${product.store.slug}`}
                      className="ml-2 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {product.store.name}
                    </Link>
                  </div>
                )}
              </div>

              {/* Shade selection — dropdown + circular swatch strip (retail-style) */}
              {shades.length >= 1 && selectedShade && (
                <div className="mb-6 max-w-lg" ref={shadeMenuRef}>
                  <p className="text-sm font-medium text-gray-800 mb-2">Shade</p>
                  <div className="relative">
                    {shades.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShadeMenuOpen((o) => !o)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 hover:bg-gray-200/90 text-left transition-colors shadow-sm"
                          aria-expanded={shadeMenuOpen}
                          aria-haspopup="listbox"
                        >
                          {renderBarSwatch(selectedShade, 'w-9 h-9')}
                          <span className="flex-1 min-w-0 font-medium text-gray-900 truncate">
                            {selectedShade.name}
                          </span>
                          <FaChevronDown
                            className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${shadeMenuOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {shadeMenuOpen && (
                          <ul
                            className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto py-1"
                            role="listbox"
                          >
                            {shades.map((s, idx) => (
                              <li key={s._key || `${s.name}-${idx}`}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={idx === selectedShadeIdx}
                                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                                    idx === selectedShadeIdx ? 'bg-primary-50/80' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedShadeIdx(idx);
                                    setShadeMenuOpen(false);
                                  }}
                                >
                                  {renderBarSwatch(s, 'w-9 h-9')}
                                  <span className="font-medium text-gray-900 truncate">{s.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-gray-100 shadow-sm">
                        {renderBarSwatch(selectedShade, 'w-9 h-9')}
                        <span className="flex-1 min-w-0 font-medium text-gray-900 truncate">
                          {selectedShade.name}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Horizontal swatch row — selected: dark ring + offset (halo) */}
                  <div className="flex gap-3 mt-4 overflow-x-auto pb-1 pt-0.5 -mx-0.5 px-0.5">
                    {shades.map((s, idx) => {
                      const active = idx === selectedShadeIdx;
                      return (
                        <button
                          key={s._key || `${s.name}-${idx}`}
                          type="button"
                          onClick={() => setSelectedShadeIdx(idx)}
                          title={s.name}
                          aria-label={`Shade ${s.name}`}
                          className={`shrink-0 rounded-full transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            active
                              ? 'ring-2 ring-gray-900 ring-offset-2 ring-offset-white'
                              : 'ring-2 ring-transparent ring-offset-2 ring-offset-white hover:ring-gray-200'
                          }`}
                        >
                          {s.isOriginal ? (
                            originalThumb ? (
                              <img
                                src={toAbsoluteImageUrl(originalThumb)}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border border-gray-100 bg-white"
                                onError={(e) => {
                                  if (e.target.dataset.failed) return;
                                  e.target.dataset.failed = '1';
                                  e.target.src = PLACEHOLDER_PRODUCT;
                                }}
                              />
                            ) : (
                              <span
                                className="w-10 h-10 rounded-full border border-gray-200 block flex items-center justify-center bg-gray-100 text-[9px] font-semibold text-gray-500 leading-tight text-center px-0.5"
                                title="Original (default listing)"
                              >
                                Orig
                              </span>
                            )
                          ) : s.image ? (
                            <img
                              src={toAbsoluteImageUrl(s.image)}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-gray-100 bg-white"
                              onError={(e) => {
                                if (e.target.dataset.failed) return;
                                e.target.dataset.failed = '1';
                                e.target.src = PLACEHOLDER_PRODUCT;
                              }}
                            />
                          ) : (
                            <span
                              className="w-10 h-10 rounded-full border border-gray-200 block"
                              style={swatchFillStyle(s)}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-gray-100 transition-colors"
                    >
                      <FaMinus className="w-3 h-3" />
                    </button>
                    <span className="px-4 py-2 font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      className="p-3 hover:bg-gray-100 transition-colors"
                      disabled={quantity >= product.stock_quantity}
                    >
                      <FaPlus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">
                    {product.stock_quantity} items available
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mb-6">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleAddToCart}
                  loading={cartLoading}
                  disabled={!inStock}
                >
                  <FaShoppingCart />
                  {inStock ? 'Add to Cart' : 'Out of Stock'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => toggleWishlist(product)}
                  className={isInWishlist(product.id) ? 'text-primary-600 border-primary-500' : ''}
                >
                  <FaHeart className={isInWishlist(product.id) ? 'fill-current' : ''} />
                  {isInWishlist(product.id) ? 'In Wishlist' : 'Add to Wishlist'}
                </Button>
                <div className="relative" ref={shareMenuRef}>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleNativeShare}
                    aria-expanded={shareMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Share product"
                  >
                    <FaShare />
                  </Button>
                  {shareMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-30 p-2"
                      role="menu"
                    >
                      <button
                        type="button"
                        onClick={() => openShareWindow('facebook')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <FaFacebookF className="text-blue-600" />
                        Share to Facebook
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareWindow('messenger')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <FaFacebookMessenger className="text-blue-500" />
                        Share to Messenger
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareWindow('x')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <FaTwitter className="text-gray-900" />
                        Share to X
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareWindow('whatsapp')}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <FaWhatsapp className="text-green-600" />
                        Share to WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={copyShareLink}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <FaLink className="text-gray-500" />
                        Copy link
                      </button>
                      {copyMessage && (
                        <p className="px-3 pt-1 text-xs text-green-600">{copyMessage}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Info */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="text-gray-600">
                  Free shipping on orders over ₱1,500. Estimated delivery: 2-5 business days.
                </p>
              </div>
            </div>
          </div>

          {/* Tabs: Description & Reviews */}
          <div className="border-t border-gray-200">
            <div className="p-6 lg:p-10">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Description</h2>
              <div className="prose max-w-none text-gray-600">
                {product.description || 'No description available.'}
              </div>

              {/* Reviews Section */}
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  Customer Reviews ({reviews.length})
                </h2>
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {review.user?.first_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {review.user?.first_name} {review.user?.last_name}
                            </p>
                            <div className="flex text-yellow-400 text-sm">
                              {[...Array(5)].map((_, i) => (
                                <FaStar
                                  key={i}
                                  className={i < review.rating ? 'fill-current' : 'text-gray-300'}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {review.title && (
                          <h4 className="font-medium text-gray-800 mb-1">{review.title}</h4>
                        )}
                        <p className="text-gray-600">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
