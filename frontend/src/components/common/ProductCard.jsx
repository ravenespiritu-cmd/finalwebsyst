import { Link } from 'react-router-dom';
import { FaStar, FaShoppingCart, FaHeart } from 'react-icons/fa';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { toAbsoluteImageUrl, PLACEHOLDER_PRODUCT } from '../../utils/imageUrl';
import Button from './Button';

const ProductCard = ({ product }) => {
  const { addToCart, loading } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const {
    id,
    name,
    slug,
    thumbnail,
    price,
    sale_price,
    average_rating,
    review_count,
    is_featured,
    stock_quantity,
  } = product;

  const effectivePrice = sale_price || price;
  const isOnSale = sale_price && sale_price < price;
  const inStock = stock_quantity > 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(id, 1);
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <Link to={`/products/${slug}`} className="group">
      <div className="card relative">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img
            src={toAbsoluteImageUrl(thumbnail)}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                e.target.dataset.failed = '1';
                e.target.src = PLACEHOLDER_PRODUCT;
              }
            }}
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {isOnSale && (
              <span className="badge badge-danger">
                Sale
              </span>
            )}
            {is_featured && (
              <span className="badge badge-primary">
                Featured
              </span>
            )}
            {!inStock && (
              <span className="badge bg-gray-800 text-white">
                Out of Stock
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              className={`p-2 bg-white rounded-full shadow-md hover:bg-primary-50 transition-colors ${isInWishlist(id) ? 'text-primary-600' : 'hover:text-primary-600'}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(product);
              }}
              title={isInWishlist(id) ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <FaHeart className={`w-4 h-4 ${isInWishlist(id) ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Add to Cart Button */}
          {inStock && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                loading={loading}
                onClick={handleAddToCart}
              >
                <FaShoppingCart />
                Add to Cart
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Category */}
          <p className="text-xs text-primary-500 font-medium uppercase tracking-wide mb-1">
            {product.category?.name || 'Cosmetics'}
          </p>

          {/* Name */}
          <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 min-h-[48px]">
            {name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2">
            <div className="flex items-center text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <FaStar
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.round(average_rating) ? 'fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              ({review_count})
            </span>
          </div>

          {/* Price */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-lg font-bold text-primary-600">
              {formatPrice(effectivePrice)}
            </span>
            {isOnSale && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(price)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
