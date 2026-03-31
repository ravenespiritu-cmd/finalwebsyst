import { Link } from 'react-router-dom';
import { FaHeart, FaShoppingCart } from 'react-icons/fa';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { toAbsoluteImageUrl, PLACEHOLDER_PRODUCT } from '../utils/imageUrl';
import Button from '../components/common/Button';

const Wishlist = () => {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart, loading: cartLoading } = useCart();

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const handleAddToCart = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(productId, 1);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaHeart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">Save items you love by clicking the heart icon</p>
          <Link to="/products">
            <Button variant="primary">Explore Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-display font-bold text-gray-800 mb-8">My Wishlist</h1>
        <p className="text-gray-600 mb-6">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => {
            const effectivePrice = product.sale_price || product.price;
            const isOnSale = product.sale_price && product.sale_price < product.price;
            const inStock = (product.stock_quantity ?? 1) > 0;

            return (
              <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
                <Link to={`/products/${product.slug}`} className="block">
                  <div className="aspect-square overflow-hidden bg-gray-100 relative">
                    <img
                      src={toAbsoluteImageUrl(product.thumbnail)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        if (e.target.src !== PLACEHOLDER_PRODUCT && !e.target.dataset.failed) {
                          e.target.dataset.failed = '1';
                          e.target.src = PLACEHOLDER_PRODUCT;
                        }
                      }}
                    />
                    {isOnSale && (
                      <span className="absolute top-3 left-3 badge badge-danger">Sale</span>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <p className="text-xs text-primary-500 font-medium uppercase tracking-wide mb-1">
                    {product.category?.name || 'Cosmetics'}
                  </p>
                  <Link to={`/products/${product.slug}`}>
                    <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-2 min-h-[48px]">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-bold text-primary-600">
                      {formatPrice(effectivePrice)}
                    </span>
                    {isOnSale && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={(e) => handleAddToCart(e, product.id)}
                      loading={cartLoading}
                      disabled={!inStock}
                    >
                      <FaShoppingCart />
                      Add to Cart
                    </Button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeFromWishlist(product.id);
                      }}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex-shrink-0"
                      title="Remove from wishlist"
                    >
                      <FaHeart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link to="/products" className="text-primary-600 hover:text-primary-700 font-medium">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
