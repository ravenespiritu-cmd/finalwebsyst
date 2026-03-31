import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaEnvelope } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setSent(false);
      const res = await authAPI.forgotPassword(data.email);
      setSent(true);
      toast.success(
        res.data?.message ||
          'If that email is registered, you will receive a link shortly. Check your inbox and spam.'
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 to-cosmetic-champagne flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <h1 className="font-display text-3xl font-bold text-primary-600">Ganda Hub</h1>
            </Link>
            <h2 className="mt-4 text-2xl font-semibold text-gray-800">Forgot password?</h2>
            <p className="mt-2 text-gray-600">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Check your email for a link to reset your password. If you don&apos;t see it, check your spam folder.
              </p>
              <Button variant="outline" fullWidth onClick={() => setSent(false)}>
                Send another link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                icon={FaEnvelope}
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
              <Button type="submit" variant="primary" fullWidth loading={loading}>
                Send reset link
              </Button>
            </form>
          )}

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

export default ForgotPassword;
