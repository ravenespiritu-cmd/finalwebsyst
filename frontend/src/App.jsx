import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Layout Components
import Layout from './components/layout/Layout';
import AdminLayout from './components/layout/AdminLayout';
import RiderLayout from './components/layout/RiderLayout';
import SupplierLayout from './components/layout/SupplierLayout';

// Public Pages
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OrderTracking from './pages/OrderTracking';
import Messages from './pages/Messages';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import FAQs from './pages/FAQs';
import ReturnsExchanges from './pages/ReturnsExchanges';
import ShippingInfo from './pages/ShippingInfo';
import Wishlist from './pages/Wishlist';
import StoreFront from './pages/StoreFront';

// Customer Pages
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminCategories from './pages/admin/Categories';
import AdminOrders from './pages/admin/Orders';
import AdminUsers from './pages/admin/Users';
import AdminDeliveries from './pages/admin/Deliveries';
import AdminLogistics from './pages/admin/Logistics';
import AdminPayments from './pages/admin/Payments';
import AdminReports from './pages/admin/Reports';
import AdminNewsletter from './pages/admin/Newsletter';
import AdminSettings from './pages/admin/Settings';
import AdminInventory from './pages/admin/Inventory';
import AdminStores from './pages/admin/Stores';
import AdminReviews from './pages/admin/Reviews';

// Rider Pages
import RiderDashboard from './pages/rider/Dashboard';
import RiderDeliveries from './pages/rider/Deliveries';

// Supplier Pages
import SupplierDashboard from './pages/supplier/Dashboard';
import SupplierProducts from './pages/supplier/Products';
import SupplierInventory from './pages/supplier/Inventory';
import SupplierOrders from './pages/supplier/Orders';
import SupplierMessages from './pages/supplier/Messages';
import SupplierStockRequests from './pages/supplier/StockRequests';
import SupplierReviews from './pages/supplier/Reviews';
import SupplierLogistics from './pages/supplier/Logistics';

// Route Guards
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';
import RiderRoute from './components/auth/RiderRoute';
import SupplierRoute from './components/auth/SupplierRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <WishlistProvider>
        <CartProvider>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:slug" element={<ProductDetail />} />
              <Route path="stores/:slug" element={<StoreFront />} />
              <Route path="cart" element={<Cart />} />
              <Route path="wishlist" element={
                <PrivateRoute>
                  <Wishlist />
                </PrivateRoute>
              } />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
              <Route path="track-order" element={<OrderTracking />} />
              <Route path="terms-of-service" element={<TermsOfService />} />
              <Route path="privacy-policy" element={<PrivacyPolicy />} />
              <Route path="faqs" element={<FAQs />} />
              <Route path="returns-exchanges" element={<ReturnsExchanges />} />
              <Route path="shipping-info" element={<ShippingInfo />} />
              
              {/* Protected Customer Routes */}
              <Route path="checkout" element={
                <PrivateRoute>
                  <Checkout />
                </PrivateRoute>
              } />
              <Route path="profile" element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } />
              <Route path="orders" element={
                <PrivateRoute>
                  <Orders />
                </PrivateRoute>
              } />
              <Route path="orders/:id" element={
                <PrivateRoute>
                  <OrderDetail />
                </PrivateRoute>
              } />
              <Route path="messages" element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              } />
            </Route>
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="deliveries" element={<AdminDeliveries />} />
              <Route path="logistics" element={<AdminLogistics />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="stores" element={<AdminStores />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="newsletter" element={<AdminNewsletter />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            {/* Rider Routes */}
            <Route path="/rider" element={
              <RiderRoute>
                <RiderLayout />
              </RiderRoute>
            }>
              <Route index element={<RiderDashboard />} />
              <Route path="deliveries" element={<RiderDeliveries />} />
            </Route>

            {/* Supplier Routes - separate URL for store owners */}
            <Route path="/supplier" element={
              <SupplierRoute>
                <SupplierLayout />
              </SupplierRoute>
            }>
              <Route index element={<SupplierDashboard />} />
              <Route path="products" element={<SupplierProducts />} />
              <Route path="inventory" element={<SupplierInventory />} />
              <Route path="stock-requests" element={<SupplierStockRequests />} />
              <Route path="reviews" element={<SupplierReviews />} />
              <Route path="orders" element={<SupplierOrders />} />
              <Route path="logistics" element={<SupplierLogistics />} />
              <Route path="messages" element={<SupplierMessages />} />
            </Route>
          </Routes>
        </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
