import { createContext, useContext, useState } from 'react';
import { toast } from 'react-toastify';

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

export const WishlistProvider = ({ children }) => {
  const [items, setItems] = useState(loadWishlist);

  const persistWishlist = (newItems) => {
    setItems(newItems);
    saveWishlist(newItems);
  };

  const isInWishlist = (productId) => {
    return items.some((item) => item.id === productId);
  };

  const addToWishlist = (product) => {
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
