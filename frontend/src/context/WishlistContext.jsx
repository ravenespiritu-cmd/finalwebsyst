import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

const WISHLIST_STORAGE_KEY = 'gandaHubWishlist';

const WishlistContext = createContext(null);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

const loadWishlist = () => {
  try {
    const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveWishlist = (items) => {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
};

const clearWishlistStorage = () => {
  localStorage.removeItem(WISHLIST_STORAGE_KEY);
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);

  // Load wishlist only when authenticated; clear when logged out
  useEffect(() => {
    if (isAuthenticated) {
      setItems(loadWishlist());
    } else {
      setItems([]);
      clearWishlistStorage();
    }
  }, [isAuthenticated]);

  const persistWishlist = (newItems) => {
    setItems(newItems);
    saveWishlist(newItems);
  };

  const isInWishlist = (productId) => {
    return items.some((item) => item.id === productId);
  };

  const addToWishlist = (product) => {
    if (!isAuthenticated) {
      toast.info('Please login to add items to your wishlist');
      return;
    }
    if (isInWishlist(product.id)) {
      toast.info('Already in your wishlist');
      return;
    }
    const newItems = [...items, product];
    persistWishlist(newItems);
    toast.success('Added to wishlist');
  };

  const removeFromWishlist = (productId) => {
    const newItems = items.filter((item) => item.id !== productId);
    persistWishlist(newItems);
    toast.success('Removed from wishlist');
  };

  const toggleWishlist = (product) => {
    if (!isAuthenticated) {
      toast.info('Please login to add items to your wishlist');
      return;
    }
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const value = {
    items,
    itemsCount: items.length,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};
