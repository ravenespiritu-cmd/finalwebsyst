import { FaSpinner } from 'react-icons/fa';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 disabled:bg-primary-300',
    secondary: 'bg-white text-primary-600 border-2 border-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    outline: 'bg-transparent border-2 border-gray-300 text-gray-700 hover:border-primary-500 hover:text-primary-600 focus:ring-primary-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 disabled:bg-red-300',
    success: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 disabled:bg-green-300',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${disabled || loading ? 'cursor-not-allowed opacity-70' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && <FaSpinner className="animate-spin" />}
      {children}
    </button>
  );
};

export default Button;
