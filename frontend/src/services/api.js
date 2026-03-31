import axios from 'axios';

function getBaseURL() {
  // In dev, use relative path so Vite proxy forwards to backend (avoids CORS/connection issues)
  if (import.meta.env.DEV) {
    return '/api/v1';
  }
  // Production: use config or env
  let raw =
    (typeof window !== 'undefined' && (window.__API_BASE_URL__ || window.__VITE_API_URL__)) ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000/api/v1';
  raw = String(raw).replace(/\/$/, '');
  // Common Railway misconfig: …/api/auth — API lives under …/api/v1
  if (/\/api\/auth$/i.test(raw)) {
    raw = raw.replace(/\/api\/auth$/i, '/api/v1');
  }
  return raw;
}

const api = axios.create({
  baseURL: getBaseURL(),
  /** Prevents infinite loading when the API is unreachable (no server, wrong port, hung PHP). */
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Use current base URL on every request (supports runtime config)
api.interceptors.request.use(
  (config) => {
    config.baseURL = getBaseURL();
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let browser set Content-Type with boundary for FormData (file uploads)
    if (config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Base URL for redirects (e.g. Google OAuth)
const apiBaseURL = getBaseURL;

// Auth API
export const authAPI = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
  refresh: () => api.post('/refresh'),
  updateProfile: (data) => api.put('/profile', data),
  changePassword: (data) => api.put('/change-password', data),
  forgotPassword: (email) => api.post('/forgot-password', { email }),
  resetPassword: (data) => api.post('/reset-password', data),
  /** URL to start Google sign-in (open in same window). */
  getGoogleAuthURL: () => `${apiBaseURL()}/auth/google`,
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  getBySlug: (slug) => api.get(`/products/slug/${slug}`),
  getFeatured: () => api.get('/products/featured'),
  getOnSale: () => api.get('/products/on-sale'),
  getNewArrivals: () => api.get('/products/new-arrivals'),
  getBrands: () => api.get('/products/brands'),
  // Admin
  create: (data) => api.post('/admin/products', data),
  update: (id, data) => api.put(`/admin/products/${id}`, data),
  delete: (id) => api.delete(`/admin/products/${id}`),
  updateStock: (id, data) => api.put(`/admin/products/${id}/stock`, data),
  releaseStock: (id, quantity) => api.post(`/admin/products/${id}/release-stock`, { quantity }),
  updateWarehouseStock: (id, data) => api.put(`/admin/products/${id}/warehouse-stock`, data),
  // Supplier (own store products)
  supplierCreate: (data) => api.post('/supplier/products', data),
  supplierUpdate: (id, data) => api.put(`/supplier/products/${id}`, data),
  supplierUpdateStock: (id, data) => api.put(`/supplier/products/${id}/stock`, data),
};

// Categories API
export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getOne: (id) => api.get(`/categories/${id}`),
  // Admin
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`),
};

// Saved addresses (auth required)
export const addressesAPI = {
  getAll: () => api.get('/addresses'),
  create: (data) => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  delete: (id) => api.delete(`/addresses/${id}`),
  setDefault: (id) => api.post(`/addresses/${id}/set-default`),
};

// Cart API
export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (data) => api.post('/cart/items', data),
  updateItem: (itemId, data) => api.put(`/cart/items/${itemId}`, data),
  removeItem: (itemId) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart'),
  applyCoupon: (code) => api.post('/cart/coupon', { coupon_code: code }),
  removeCoupon: () => api.delete('/cart/coupon'),
};

// Newsletter API (public + admin)
export const newsletterAPI = {
  subscribe: (email) => api.post('/newsletter/subscribe', { email }),
  getSubscribers: (params) => api.get('/admin/newsletter/subscribers', { params }),
};

// Orders API
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  placeWithPayment: (data) => api.post('/orders/place-with-payment', data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  track: (orderNumber) => api.get(`/orders/track/${orderNumber}`),
  rateRider: (orderId, data) => api.post(`/orders/${orderId}/rate-rider`, data),
  // Supplier
  supplierUpdateStatus: (id, data) => api.put(`/supplier/orders/${id}/status`, data),
};

// Payments API
export const paymentsAPI = {
  getMethods: () => api.get('/payments/methods'),
  getOne: (id) => api.get(`/payments/${id}`),
  process: (orderId, data) => api.post(`/payments/process/${orderId}`, data),
  // Admin
  getAll: (params) => api.get('/admin/payments', { params }),
};

// Logistics (admin): catalog for dropdowns
export const logisticsAPI = {
  getCatalog: () => api.get('/admin/logistics/catalog'),
  supplierGetCatalog: () => api.get('/supplier/logistics/catalog'),
};

// Deliveries API
export const deliveriesAPI = {
  track: (trackingNumber) => api.get(`/deliveries/track/${trackingNumber}`),
  // Admin
  getAll: (params) => api.get('/admin/deliveries', { params }),
  getOne: (id) => api.get(`/admin/deliveries/${id}`),
  getAvailableRiders: () => api.get('/admin/deliveries-riders'),
  // Supplier
  supplierGetAll: (params) => api.get('/supplier/deliveries', { params }),
  supplierGetOne: (id) => api.get(`/supplier/deliveries/${id}`),
  supplierArriveAtStation: (id, data) => api.post(`/supplier/deliveries/${id}/arrive-station`, data),
  // Rider
  riderGetAll: (params) => api.get('/rider/deliveries', { params }),
  riderGetClaimable: (params) => api.get('/rider/deliveries/claimable', { params }),
  riderGetOne: (id) => api.get(`/rider/deliveries/${id}`),
  riderClaim: (id) => api.post(`/rider/deliveries/${id}/claim`),
  riderUpdateStatus: (id, data) => api.put(`/rider/deliveries/${id}/status`, data),
  riderUpdateLocation: (id, data) => api.put(`/rider/deliveries/${id}/location`, data),
  riderComplete: (id, data) => api.post(`/rider/deliveries/${id}/complete`, data),
  riderStats: () => api.get('/rider/stats'),
};

// Notifications API (in-app, e.g. stock request fulfilled)
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

// Stock requests API
export const stockRequestsAPI = {
  getAll: (params) => api.get('/stock-requests', { params }),
  create: (data) => api.post('/admin/stock-requests', data),
  fulfill: (id, data) => api.post(`/stock-requests/fulfill/${id}`, data),
  decline: (id, data) => api.post(`/stock-requests/decline/${id}`, data),
  getSupplierInventory: (params) => api.get('/supplier/inventory', { params }),
};

// Inventory receipts API (Admin) – product, supplier, quantity, stocked date
export const inventoryReceiptsAPI = {
  getAll: (params) => api.get('/admin/inventory-receipts', { params }),
};

// Stores API (admin + supplier)
export const storesAPI = {
  getAll: (params) => api.get('/stores', { params }),
  getList: () => api.get('/stores/list'),
  getOne: (id) => api.get(`/stores/${id}`),
  getPublicBySlug: (slug) => api.get(`/public/stores/${slug}`),
  update: (id, data) => api.put(`/stores/${id}`, data),
  create: (data) => api.post('/admin/stores', data),
  delete: (id) => api.delete(`/admin/stores/${id}`),
};

// Conversations / Messages API
export const messagesAPI = {
  getConversations: (params) => api.get('/conversations', { params }),
  getOrCreateConversation: (data) => api.post('/conversations', data),
  getMessages: (conversationId) => api.get(`/conversations/${conversationId}/messages`),
  sendMessage: (data) => api.post('/messages', data),
};

// Reviews API
export const reviewsAPI = {
  getForProduct: (productId, params) => api.get(`/products/${productId}/reviews`, { params }),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  markHelpful: (id) => api.post(`/reviews/${id}/helpful`),
  // Admin
  getPending: (params) => api.get('/admin/reviews/pending', { params }),
  approve: (id) => api.post(`/admin/reviews/${id}/approve`),
  reject: (id) => api.post(`/admin/reviews/${id}/reject`),
  // Supplier (own store’s products only)
  getSupplierPending: (params) => api.get('/supplier/reviews/pending', { params }),
  supplierApprove: (id) => api.post(`/supplier/reviews/${id}/approve`),
  supplierReject: (id) => api.post(`/supplier/reviews/${id}/reject`),
};

// Reports API
export const reportsAPI = {
  getDashboard: () => api.get('/admin/reports/dashboard'),
  getSupplierDashboard: () => api.get('/supplier/reports/dashboard'),
  getAll: (params) => api.get('/admin/reports', { params }),
  getOne: (id) => api.get(`/admin/reports/${id}`),
  generate: (data) => api.post('/admin/reports', data),
  delete: (id) => api.delete(`/admin/reports/${id}`),
};

// Users API (Admin)
export const usersAPI = {
  getAll: (params) => api.get('/admin/users', { params }),
  getOne: (id) => api.get(`/admin/users/${id}`),
  create: (data) => api.post('/admin/users', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
  toggleStatus: (id) => api.post(`/admin/users/${id}/toggle-status`),
  getRiders: () => api.get('/admin/users-riders'),
  getCustomers: (params) => api.get('/admin/users-customers', { params }),
};

// Settings API
export const settingsAPI = {
  getPublic: () => api.get('/settings/public'),
  // Admin
  getAll: (params) => api.get('/admin/settings', { params }),
  getGroups: () => api.get('/admin/settings/groups'),
  getByGroup: (group) => api.get(`/admin/settings/group/${group}`),
  save: (data) => api.post('/admin/settings', data),
  bulkUpdate: (settings) => api.put('/admin/settings/bulk', { settings }),
  delete: (key) => api.delete(`/admin/settings/${key}`),
  clearCache: () => api.post('/admin/settings/clear-cache'),
  backup: () => api.post('/admin/settings/backup'),
  getSystemInfo: () => api.get('/admin/settings/system-info'),
};

// Upload API (do not set Content-Type so browser sets multipart/form-data with boundary)
export const uploadAPI = {
  uploadImage: (file, folder = 'products') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    return api.post('/admin/upload/image', formData);
  },
  supplierUploadImage: (file, folder = 'products') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    return api.post('/supplier/upload/image', formData);
  },
  uploadMultiple: (files, folder = 'products') => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images[]', file));
    formData.append('folder', folder);
    return api.post('/admin/upload/images', formData);
  },
  delete: (path) => api.delete('/admin/upload', { data: { path } }),
};

export default api;
