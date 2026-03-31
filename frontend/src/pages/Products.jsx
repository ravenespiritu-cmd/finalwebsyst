import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaFilter, FaTimes, FaSearch } from 'react-icons/fa';
import { productsAPI, categoriesAPI, storesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/common/ProductCard';
import Loading from '../components/common/Loading';
import Pagination from '../components/common/Pagination';
import Button from '../components/common/Button';

const Products = () => {
  const { user } = useAuth();
  const isSupplier = user?.role === 'supplier';
  const [searchParams, setSearchParams] = useSearchParams();
  const [supplierStore, setSupplierStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',
    brand: searchParams.get('brand') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    on_sale: searchParams.get('on_sale') === 'true',
    featured: searchParams.get('featured') === 'true',
    in_stock: searchParams.get('in_stock') === 'true',
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: searchParams.get('sort_order') || 'desc',
    // Optional filter when coming from a store link
    store_id: searchParams.get('store_id') || '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isSupplier) return;
    fetchBrands();
  }, [isSupplier]);

  useEffect(() => {
    if (!isSupplier) {
      setSupplierStore(null);
      return;
    }
    let cancelled = false;
    storesAPI
      .getAll()
      .then((res) => {
        const d = res.data.data;
        const row = Array.isArray(d) ? d[0] : d;
        if (!cancelled) setSupplierStore(row || null);
      })
      .catch(() => {
        if (!cancelled) setSupplierStore(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isSupplier]);

  useEffect(() => {
    if (!isSupplier) return;
    setFilters((f) => (f.brand ? { ...f, brand: '' } : f));
    if (searchParams.get('brand')) {
      const p = new URLSearchParams(searchParams);
      p.delete('brand');
      setSearchParams(p, { replace: true });
    }
  }, [isSupplier, searchParams, setSearchParams]);

  useEffect(() => {
    fetchProducts();
  }, [searchParams]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ active: true });
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await productsAPI.getBrands();
      setBrands(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const params = Object.fromEntries(searchParams.entries());
      const response = await productsAPI.getAll(params);
      setProducts(response.data.data || []);
      setMeta(response.data.meta || { current_page: 1, last_page: 1, total: 0 });
    } catch (error) {
      console.error('Failed to fetch products:', error);
      const msg = error.response?.data?.message;
      const isTimeout = error.code === 'ECONNABORTED';
      const isNetwork = !error.response && error.request;
      setFetchError(
        msg ||
          (isTimeout
            ? 'Request timed out — the API did not respond. Start the Laravel backend (e.g. php artisan serve on port 8000) so the Vite proxy can reach it.'
            : isNetwork
              ? 'Cannot reach the backend. Make sure the backend is running (e.g. php artisan serve on port 8000, or set VITE_API_URL in .env to your backend URL) and restart the dev server.'
              : 'Could not load products. Check your connection.')
      );
      setProducts([]);
      setMeta({ current_page: 1, last_page: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.brand && !isSupplier) params.set('brand', filters.brand);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.on_sale) params.set('on_sale', 'true');
    if (filters.featured) params.set('featured', 'true');
    if (filters.in_stock) params.set('in_stock', 'true');
    if (filters.sort_by) params.set('sort_by', filters.sort_by);
    if (filters.sort_order) params.set('sort_order', filters.sort_order);
    if (filters.store_id) params.set('store_id', filters.store_id);
    
    setSearchParams(params);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category_id: '',
      brand: '',
      min_price: '',
      max_price: '',
      on_sale: false,
      featured: false,
      in_stock: false,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    setSearchParams({});
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
  };

  const sortOptions = [
    { value: 'created_at-desc', label: 'Newest First' },
    { value: 'created_at-asc', label: 'Oldest First' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'name-asc', label: 'Name: A to Z' },
    { value: 'name-desc', label: 'Name: Z to A' },
    { value: 'average_rating-desc', label: 'Top Rated' },
  ];

  const handleSortChange = (value) => {
    const [sort_by, sort_order] = value.split('-');
    setFilters({ ...filters, sort_by, sort_order });
    const params = new URLSearchParams(searchParams);
    params.set('sort_by', sort_by);
    params.set('sort_order', sort_order);
    setSearchParams(params);
  };

  const pageTitle = (() => {
    if (isSupplier) {
      const name = supplierStore?.name || 'My store';
      if (filters.search) return `${name} · Search: "${filters.search}"`;
      return name;
    }
    if (filters.search) return `Search: "${filters.search}"`;
    return 'All Products';
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-display font-bold text-gray-800">
            {pageTitle}
          </h1>
          <p className="text-gray-600 mt-2">
            {isSupplier ? `${meta.total} products in your catalog` : `${meta.total} products found`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-gray-800">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Clear All
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                  />
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category_id}
                  onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {!isSupplier && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                <select
                  value={filters.brand}
                  onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  <option value="">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
              )}

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.min_price}
                    onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                  />
                  <input
                    type="number"
                    value={filters.max_price}
                    onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.on_sale}
                    onChange={(e) => setFilters({ ...filters, on_sale: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-gray-700">On Sale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.in_stock}
                    onChange={(e) => setFilters({ ...filters, in_stock: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-gray-700">In Stock Only</span>
                </label>
              </div>

              <Button variant="primary" fullWidth onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-grow">
            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FaFilter />
                Filters
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={`${filters.sort_by}-${filters.sort_order}`}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <Loading />
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                <div className="mt-8">
                  <Pagination
                    currentPage={meta.current_page}
                    totalPages={meta.last_page}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                {fetchError ? (
                  <>
                    <p className="text-red-600 text-lg font-medium">{fetchError}</p>
                    <p className="text-gray-500 text-sm mt-2">Make sure the backend is running and VITE_API_URL is set correctly.</p>
                    <button
                      onClick={() => { setFetchError(null); fetchProducts(); }}
                      className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                      Try again
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 text-lg">No products found</p>
                    <button
                      onClick={clearFilters}
                      className="mt-4 text-primary-600 hover:text-primary-700"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-white shadow-xl animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-lg">Filters</h2>
              <button onClick={() => setShowFilters(false)}>
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100vh-120px)]">
              {/* Same filter content as desktop */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category_id}
                  onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <div className="flex gap-4">
                <Button variant="outline" fullWidth onClick={clearFilters}>
                  Clear
                </Button>
                <Button variant="primary" fullWidth onClick={applyFilters}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
