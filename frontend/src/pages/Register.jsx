import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaEnvelope, FaLock, FaUser, FaPhone, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const Register = () => {
  const { register: registerUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  if (isAuthenticated) {
    navigate('/');
  }

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await registerUser(data);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
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
              Create Account
            </h2>
            <p className="mt-2 text-gray-600">
              Join our beauty community today
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                icon={FaUser}
                placeholder="Ravena"
                error={errors.first_name?.message}
                {...register('first_name', {
                  required: 'First name is required',
                })}
              />
              <Input
                label="Last Name"
                icon={FaUser}
                placeholder="Gwapa"
                error={errors.last_name?.message}
                {...register('last_name', {
                  required: 'Last name is required',
                })}
              />
            </div>

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

            <Input
              label="Phone Number (Optional)"
              type="tel"
              icon={FaPhone}
              placeholder="+63 964 988 7606"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                icon={FaLock}
                placeholder="Create a password"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
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

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              icon={FaLock}
              placeholder="Confirm your password"
              error={errors.password_confirmation?.message}
              {...register('password_confirmation', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === password || 'Passwords do not match',
              })}
            />

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 mt-1 text-primary-600 rounded focus:ring-primary-500"
                {...register('terms', {
                  required: 'You must accept the terms and conditions',
                })}
              />
              <span className="text-sm text-gray-600">
                I agree to the{' '}
                <Link to="/terms-of-service" className="text-primary-600 hover:text-primary-700" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" className="text-primary-600 hover:text-primary-700" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p className="text-sm text-red-500">{errors.terms.message}</p>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Create Account
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="mt-8 text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
