import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount (with timeout so we never hang)
  useEffect(() => {
    const AUTH_CHECK_TIMEOUT_MS = 8000;

    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));

          // Verify token is still valid, with timeout so loading never sticks
          const mePromise = authAPI.me();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), AUTH_CHECK_TIMEOUT_MS)
          );
          const response = await Promise.race([mePromise, timeoutPromise]);
          setUser(response.data.data);
          localStorage.setItem('user', JSON.stringify(response.data.data));
        }
      } catch (error) {
        // Token invalid or timeout: clear auth so user can still use the site
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user: userData, token: authToken } = response.data.data;
    
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    return userData;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { user: userData, token: authToken } = response.data.data;
    
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    }
    
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateProfile = async (data) => {
    const response = await authAPI.updateProfile(data);
    const updatedUser = response.data.data;
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  const changePassword = async (data) => {
    await authAPI.changePassword(data);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isRider = user?.role === 'rider';
  const isCustomer = user?.role === 'customer';

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    isRider,
    isCustomer,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
