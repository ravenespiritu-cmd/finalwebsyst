import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaStar, FaMinus, FaPlus, FaShoppingCart, FaHeart, FaShare } from 'react-icons/fa';
import { productsAPI, reviewsAPI } from '../services/api';
import { toAbsoluteImageUrl } from '../utils/imageUrl';
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

  useEffect(() => {
    fetchProduct();
  }, [slug]);

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
    addToCart(product.id, quantity);
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
  const rawImages = product.images?.length ? product.images : [product.thumbnail].filter(Boolean);
  const images = rawImages.length
    ? rawImages.map((img) => toAbsoluteImageUrl(img, '/placeholder-product.jpg'))
    : ['/placeholder-product.jpg'];

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
                      <img src={toAbsoluteImageUrl(img)} alt="" className="w-full h-full object-cover" />
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

              {/* SKU & Brand */}
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
              </div>

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
                <Button variant="outline" size="lg">
                  <FaShare />
                </Button>
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
