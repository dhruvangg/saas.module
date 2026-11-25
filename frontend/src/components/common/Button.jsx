import React from 'react';

const variants = {
  primary: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm focus:ring-sky-500',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm focus:ring-slate-400',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-400',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};
