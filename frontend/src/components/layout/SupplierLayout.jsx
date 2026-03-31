import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHome,
  FaBox,
  FaShoppingCart,
  FaEnvelope,
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaStore,
  FaTruck,
  FaStar,
  FaWarehouse,
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { storesAPI } from '../../services/api';

const SupplierLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [storeSlug, setStoreSlug] = useState('');

  const menuItems = [
    { name: 'Dashboard', path: '/supplier', icon: FaHome },
    { name: 'My Products', path: '/supplier/products', icon: FaBox },
    { name: 'Inventory', path: '/supplier/inventory', icon: FaWarehouse },
    { name: 'Stock Requests', path: '/supplier/stock-requests', icon: FaTruck },
    { name: 'Logistics', path: '/supplier/logistics', icon: FaTruck },
    { name: 'Reviews', path: '/supplier/reviews', icon: FaStar },
    { name: 'Orders', path: '/supplier/orders', icon: FaShoppingCart },
    { name: 'Messages', path: '/supplier/messages', icon: FaEnvelope },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const loadStore = async () => {
      try {
        const res = await storesAPI.getAll();
        const data = res.data.data;
        const store = Array.isArray(data) ? data[0] : data;
        if (store?.slug) {
          setStoreSlug(store.slug);
        }
      } catch {
        setStoreSlug('');
      }
    };
    loadStore();
  }, []);

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Supplier';
  const initials = (user?.first_name?.[0] && user?.last_name?.[0])
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : (user?.email?.slice(0, 2) || 'SU').toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 min-w-[16rem] bg-emerald-900 transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between h-16 px-5 bg-emerald-800">
          <Link to="/supplier" className="flex items-center">
            <FaStore className="w-6 h-6 text-white mr-2" />
            <span className="text-lg font-bold text-white">My Store</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-emerald-200 hover:text-white"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-2 px-2 py-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/supplier'
              ? location.pathname === '/supplier' || location.pathname === '/supplier/'
              : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 mt-2 p-2 border-t border-emerald-800">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium text-xs truncate">{displayName}</p>
              <p className="text-emerald-300 text-[10px] truncate">{user?.email ?? '—'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-red-300 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
          >
            <FaSignOutAlt className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-64 transition-all duration-300">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <FaBars className="w-6 h-6" />
          </button>
          {storeSlug && (
            <Link to={`/stores/${storeSlug}`} className="text-sm text-emerald-600 hover:text-emerald-700">
              View Main Store
            </Link>
          )}
        </header>

        <main className="p-4 lg:p-5">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default SupplierLayout;
