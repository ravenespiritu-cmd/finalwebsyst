import { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaPlus, FaMinus, FaEdit } from 'react-icons/fa';
import { productsAPI } from '../../services/api';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';
import { toast } from 'react-toastify';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loading from '../../components/common/Loading';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockChange, setStockChange] = useState({ quantity: 0, operation: 'add' });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (filter === 'low_stock') {
        // Fetch all and filter client-side for low stock
      }
      const response = await productsAPI.getAll(params);
      let data = response.data.data || [];
      
      if (filter === 'low_stock') {
        data = data.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0);
      } else if (filter === 'out_of_stock') {
        data = data.filter(p => p.stock_quantity === 0);
      }
      
      setProducts(data);
      setMeta(response.data.meta || { current_page: 1, last_page: 1 });
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStockModal = (product) => {
    setSelectedProduct(product);
    setStockChange({ quantity: 0, operation: 'add' });
    setShowModal(true);
  };

  const handleStockUpdate = async () => {
    if (stockChange.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    
    try {
      await productsAPI.updateStock(selectedProduct.id, stockChange);
      toast.success('Stock updated successfully');
      setShowModal(false);
      fetchProducts(meta.current_page);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update stock';
      toast.error(message);
    }
  };

  const getStockBadge = (product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="danger">Out of Stock</Badge>;
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return <Badge variant="warning">Low Stock</Badge>;
    }
    return <Badge variant="success">In Stock</Badge>;
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
        <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FaPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {products.filter(p => p.stock_quantity > p.low_stock_threshold).length}
              </p>
              <p className="text-sm text-gray-500">In Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FaExclamationTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {products.filter(p => p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0).length}
              </p>
              <p className="text-sm text-gray-500">Low Stock</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FaMinus className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {products.filter(p => p.stock_quantity === 0).length}
              </p>
              <p className="text-sm text-gray-500">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All Products' },
            { value: 'low_stock', label: 'Low Stock' },
            { value: 'out_of_stock', label: 'Out of Stock' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === item.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className={`hover:bg-gray-50 ${product.stock_quantity <= product.low_stock_threshold ? 'bg-yellow-50' : ''} ${product.stock_quantity === 0 ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={toAbsoluteImageUrl(product.thumbnail, '/placeholder-product.jpg')}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <p className="font-medium text-gray-800">{product.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.sku}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{formatPrice(product.price)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-lg font-bold ${
                        product.stock_quantity === 0 ? 'text-red-600' :
                        product.stock_quantity <= product.low_stock_threshold ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{product.low_stock_threshold}</td>
                    <td className="px-6 py-4">{getStockBadge(product)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openStockModal(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <FaEdit />
                      </button>
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

      {/* Stock Update Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Update Stock"
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <img
                src={toAbsoluteImageUrl(selectedProduct.thumbnail, '/placeholder-product.jpg')}
                alt={selectedProduct.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div>
                <p className="font-medium text-gray-800">{selectedProduct.name}</p>
                <p className="text-sm text-gray-500">Current Stock: {selectedProduct.stock_quantity}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Operation</label>
              <select
                value={stockChange.operation}
                onChange={(e) => setStockChange({ ...stockChange, operation: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
              >
                <option value="add">Add Stock</option>
                <option value="subtract">Remove Stock</option>
                <option value="set">Set Stock</option>
              </select>
            </div>

            <Input
              label="Quantity"
              type="number"
              min="0"
              value={stockChange.quantity}
              onChange={(e) => setStockChange({ ...stockChange, quantity: parseInt(e.target.value) || 0 })}
            />

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              {stockChange.operation === 'add' && (
                <p>New stock will be: {selectedProduct.stock_quantity + stockChange.quantity}</p>
              )}
              {stockChange.operation === 'subtract' && (
                <p>New stock will be: {Math.max(0, selectedProduct.stock_quantity - stockChange.quantity)}</p>
              )}
              {stockChange.operation === 'set' && (
                <p>Stock will be set to: {stockChange.quantity}</p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleStockUpdate}>
                Update Stock
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;
