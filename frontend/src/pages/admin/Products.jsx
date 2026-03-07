import { useState, useEffect, useRef } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaImage, FaSpinner } from 'react-icons/fa';
import { productsAPI, categoriesAPI, uploadAPI } from '../../services/api';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/common/Pagination';
import Badge from '../../components/common/Badge';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    short_description: '',
    price: '',
    sale_price: '',
    stock_quantity: '',
    brand: '',
    thumbnail: '',
    is_featured: false,
    is_active: true,
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search) params.search = search;
      const response = await productsAPI.getAll(params);
      setProducts(response.data.data || []);
      setMeta(response.data.meta || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll({ active: true });
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        category_id: product.category_id || '',
        description: product.description || '',
        short_description: product.short_description || '',
        price: product.price || '',
        sale_price: product.sale_price || '',
        stock_quantity: product.stock_quantity || '',
        brand: product.brand || '',
        thumbnail: product.thumbnail || '',
        is_featured: product.is_featured || false,
        is_active: product.is_active !== false,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: '',
        description: '',
        short_description: '',
        price: '',
        sale_price: '',
        stock_quantity: '',
        brand: '',
        thumbnail: '',
        is_featured: false,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const response = await uploadAPI.uploadImage(file, 'products');
      const imageUrl = response.data.data.url;
      setFormData({ ...formData, thumbnail: imageUrl });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(formData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      fetchProducts(meta.current_page);
    } catch (error) {
      const message = error.response?.data?.message || 'Operation failed';
      toast.error(message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productsAPI.delete(id);
      toast.success('Product deleted successfully');
      fetchProducts(meta.current_page);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete product';
      toast.error(message);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Products</h1>
        <Button variant="primary" onClick={() => openModal()}>
          <FaPlus />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-grow">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={toAbsoluteImageUrl(product.thumbnail, '/placeholder-product.jpg')}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div>
                          <p className="font-medium text-gray-800">{product.name}</p>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{formatPrice(product.price)}</p>
                      {product.sale_price && (
                        <p className="text-sm text-green-600">{formatPrice(product.sale_price)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={product.stock_quantity > 10 ? 'success' : product.stock_quantity > 0 ? 'warning' : 'danger'}>
                        {product.stock_quantity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={product.is_active ? 'success' : 'danger'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t">
          <Pagination
            currentPage={meta.current_page}
            totalPages={meta.last_page}
            onPageChange={fetchProducts}
          />
        </div>
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Image</label>
            <div className="flex items-start gap-4">
              {/* Image Preview */}
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                {formData.thumbnail ? (
                  <img
                    src={toAbsoluteImageUrl(formData.thumbnail, '/placeholder-product.jpg')}
                    alt="Product preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaImage className="w-8 h-8 text-gray-400" />
                )}
              </div>
              
              {/* Upload Controls */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="product-image"
                />
                <label
                  htmlFor="product-image"
                  className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploading ? (
                    <>
                      <FaSpinner className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaImage className="w-4 h-4" />
                      Choose Image
                    </>
                  )}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  JPEG, PNG, GIF, or WebP. Max 5MB.
                </p>
                
                {/* Manual URL Input */}
                <div className="mt-3">
                  <Input
                    label="Or enter image URL"
                    placeholder="https://example.com/image.jpg"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
            <Input
              label="Sale Price"
              type="number"
              step="0.01"
              value={formData.sale_price}
              onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
            />
            <Input
              label="Stock Quantity"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Description</label>
            <textarea
              value={formData.short_description}
              onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span>Featured Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span>Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Products;
