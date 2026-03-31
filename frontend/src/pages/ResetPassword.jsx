import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: email || '' },
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid reset link. Please request a new one from the forgot password page.');
      return;
    }
    try {
      setLoading(true);
      await authAPI.resetPassword({
        token,
        email: data.email || email,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
      toast.success('Your password has been reset. You can now sign in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to reset password. Please try again or request a new link.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-100 to-cosmetic-champagne flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-primary-600">Invalid reset link</h1>
          <p className="mt-4 text-gray-600">
            This link is missing or invalid. Please request a new password reset from the sign-in page.
          </p>
          <Link to="/forgot-password" className="mt-6 inline-block text-primary-600 hover:text-primary-700 font-medium">
            Forgot password
          </Link>
          <br />
          <Link to="/login" className="mt-4 inline-block text-gray-600 hover:text-gray-800">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 to-cosmetic-champagne flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="font-display text-3xl font-bold text-primary-600">Ganda Hub</h1>
            </Link>
            <h2 className="mt-4 text-2xl font-semibold text-gray-800">Set new password</h2>
            <p className="mt-2 text-gray-600">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
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
                label="New password"
                type={showPassword ? 'text' : 'password'}
                icon={FaLock}
                placeholder="At least 8 characters"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
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

            <Input
              label="Confirm new password"
              type="password"
              icon={FaLock}
              placeholder="Confirm your password"
              error={errors.password_confirmation?.message}
              {...register('password_confirmation', {
                required: 'Please confirm your password',
                validate: (val, form) => val === form.password || 'Passwords do not match',
              })}
            />

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Reset password
            </Button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
