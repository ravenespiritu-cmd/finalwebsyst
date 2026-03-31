import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { authAPI } from '../services/api';

const Login = () => {
  const { login, isAuthenticated, isAdmin, isRider, isSupplier } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  // Handle return from Google OAuth (?token=... or ?error=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const error = params.get('error');
    if (error) {
      if (error === 'google_denied') {
        toast.error('Google sign-in was cancelled or failed.');
      } else if (error === 'google_not_configured') {
        toast.error(
          'Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend (Railway). Or use email and password.'
        );
      } else if (error === 'account_deactivated') {
        toast.error(
          'This account is disabled in the system. An admin must set the user to active again (Admin → Users), or use another Google account.'
        );
      } else {
        toast.error('Something went wrong. Please try again.');
      }
      window.history.replaceState({}, '', location.pathname);
      return;
    }
    if (token) {
      (async () => {
        try {
          localStorage.setItem('token', token);
          const response = await authAPI.me();
          const userData = response.data.data;
          localStorage.setItem('user', JSON.stringify(userData));
          window.history.replaceState({}, '', location.pathname);
          toast.success('Welcome back!');
          const target = userData.role === 'admin' ? '/admin' : userData.role === 'rider' ? '/rider' : userData.role === 'supplier' ? '/supplier' : from;
          window.location.href = target; // full navigation so AuthContext picks up token
        } catch (err) {
          toast.error('Session invalid. Please sign in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.history.replaceState({}, '', location.pathname);
        }
      })();
    }
  }, [location.search, location.pathname, from]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Redirect if already authenticated
  if (isAuthenticated) {
    if (isAdmin) {
      navigate('/admin');
    } else if (isRider) {
      navigate('/rider');
    } else if (isSupplier) {
      navigate('/supplier');
    } else {
      navigate(from);
    }
  }

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const user = await login(data.email, data.password);
      toast.success('Welcome back!');
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'rider') {
        navigate('/rider');
      } else if (user.role === 'supplier') {
        navigate('/supplier');
      } else {
        navigate(from);
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      const isNetwork = !error.response && error.request;
      const message = msg || (isNetwork
        ? 'Cannot reach server. Is the backend running? Set VITE_API_URL in .env to your backend URL and restart.'
        : 'Login failed. Please try again.');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 to-cosmetic-champagne flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="font-display text-3xl font-bold text-primary-600">
                Ganda Hub
              </h1>
            </Link>
            <h2 className="mt-4 text-2xl font-semibold text-gray-800">
              Welcome Back
            </h2>
            <p className="mt-2 text-gray-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              icon={FaEnvelope}
              placeholder="Enter your email address"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                icon={FaLock}
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="my-8 flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="space-y-3">
            <a
              href={authAPI.getGoogleAuthURL()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 no-underline"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </a>
          </div>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
