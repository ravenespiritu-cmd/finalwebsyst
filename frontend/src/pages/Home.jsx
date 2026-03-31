import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaStar, FaTruck, FaLock, FaUndo } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { productsAPI, categoriesAPI, newsletterAPI } from '../services/api';
import ProductCard from '../components/common/ProductCard';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  useEffect(() => {
    const FETCH_TIMEOUT_MS = 12000; // 12s so we never stick on loading

    const fetchData = async () => {
      try {
        const fetchWithTimeout = (promise) =>
          Promise.race([
            promise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS)
            ),
          ]);

        const [featuredRes, newRes, saleRes, catRes] = await Promise.all([
          fetchWithTimeout(productsAPI.getFeatured()),
          fetchWithTimeout(productsAPI.getNewArrivals()),
          fetchWithTimeout(productsAPI.getOnSale()),
          fetchWithTimeout(categoriesAPI.getAll({ root_only: true, active: true })),
        ]);

        setFeaturedProducts(featuredRes?.data?.data || []);
        setNewArrivals(newRes?.data?.data || []);
        setSaleProducts(saleRes?.data?.data || []);
        setCategories(catRes?.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
        // Show page with empty sections instead of staying on loading
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-100 to-cosmetic-champagne overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-block px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-full mb-4">
                New Collection 2026
              </span>
              <h1 className="text-4xl lg:text-6xl font-display font-bold text-gray-800 mb-4">
                Discover Your
                <span className="text-gradient"> Natural Beauty</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-lg">
                Premium cosmetics and skincare products that enhance your natural glow. 
                Because you deserve to feel beautiful every day.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/products">
                  <Button variant="primary" size="lg">
                    Shop Now
                    <FaArrowRight className="ml-2" />
                  </Button>
                </Link>
                <Link to="/products?on_sale=true">
                  <Button variant="outline" size="lg">
                    View Sale Items
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary-200 to-primary-400 rounded-full absolute inset-0 transform scale-75 opacity-50" />
              <img
                src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600"
                alt="Beauty Products"
                className="relative w-full h-auto rounded-2xl shadow-2xl"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/600x600?text=Beauty+Products';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: FaTruck, title: 'Free Shipping', desc: 'On orders over ₱1,500' },
              { icon: FaUndo, title: 'Easy Returns', desc: '30-day return policy' },
              { icon: FaLock, title: 'Secure Payment', desc: '100% secure checkout' },
              { icon: FaStar, title: 'Premium Quality', desc: 'Authentic products' },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">Find exactly what you need</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category_id=${category.id}`}
                  className="group"
                >
                  <div className="bg-white rounded-xl p-6 text-center shadow-sm hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                    <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">💄</span>
                    </div>
                    <h3 className="font-medium text-gray-800 group-hover:text-primary-600 transition-colors">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="section-title">Featured Products</h2>
                <p className="text-gray-600">Our most popular items</p>
              </div>
              <Link to="/products?featured=true" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2">
                View All
                <FaArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sale Banner */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-secondary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1 bg-white/20 text-white text-sm font-medium rounded-full mb-4">
            Limited Time Offer
          </span>
          <h2 className="text-3xl lg:text-5xl font-display font-bold text-white mb-4">
            Up to 50% Off Sale
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Don&apos;t miss out on amazing deals! Shop our sale collection and save big on premium beauty products.
          </p>
          <Link to="/products?on_sale=true">
            <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
              Shop Sale Now
              <FaArrowRight className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="section-title">New Arrivals</h2>
                <p className="text-gray-600">Fresh off the shelf</p>
              </div>
              <Link to="/products?sort_by=created_at" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2">
                View All
                <FaArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {newArrivals.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* On Sale */}
      {saleProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="section-title">On Sale</h2>
                <p className="text-gray-600">Limited time deals</p>
              </div>
              <Link to="/products?on_sale=true" className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2">
                View All
                <FaArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {saleProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="py-16 bg-cosmetic-champagne">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-gray-800 mb-4">
            Join the Ganda Hub Family
          </h2>
          <p className="text-gray-600 mb-8">
            Subscribe to our newsletter and get 15% off your first order, plus exclusive access to new products and beauty tips!
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = newsletterEmail.trim();
              if (!trimmed) {
                toast.error('Please enter your email address.');
                return;
              }
              setNewsletterSubmitting(true);
              try {
                const response = await newsletterAPI.subscribe(trimmed);
                toast.success(response?.data?.message || 'Thanks for subscribing!');
                setNewsletterEmail('');
              } catch (err) {
                toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
              } finally {
                setNewsletterSubmitting(false);
              }
            }}
            className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto"
          >
            <input
              type="email"
              placeholder="Enter your email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              disabled={newsletterSubmitting}
              className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-primary-500 disabled:opacity-70"
            />
            <Button type="submit" variant="primary" loading={newsletterSubmitting}>
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Home;
