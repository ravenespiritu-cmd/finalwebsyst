import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  type = 'text',
  error,
  helperText,
  icon: Icon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`
            w-full px-4 py-3 rounded-lg border transition-all duration-200 outline-none
            ${Icon ? 'pl-10' : ''}
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
            }
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
