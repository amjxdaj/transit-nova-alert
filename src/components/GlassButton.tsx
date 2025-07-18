
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  glowing?: boolean;
}

const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  glowing = false
}) => {
  const variantStyles = {
    primary: 'border-green-500/40 text-green-700 hover:border-green-600/60 hover:text-green-800',
    secondary: 'border-green-300/30 text-green-600 hover:border-green-400/50 hover:text-green-700',
    success: 'border-emerald-500/40 text-emerald-700 hover:border-emerald-600/60 hover:text-emerald-800',
    danger: 'border-red-400/40 text-red-600 hover:border-red-500/60 hover:text-red-700'
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const glowColors = {
    primary: '#22C55E',
    secondary: '#10B981',
    success: '#059669',
    danger: '#EF4444'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'glass-button relative overflow-hidden font-medium transition-all duration-300',
        'backdrop-blur-lg bg-white/60 border rounded-xl',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
        variantStyles[variant],
        sizeStyles[size],
        glowing && 'animate-glow-pulse',
        className
      )}
      style={{
        boxShadow: glowing 
          ? `0 0 20px ${glowColors[variant]}40, 0 4px 15px rgba(34, 197, 94, 0.15)`
          : '0 4px 15px rgba(34, 197, 94, 0.15)',
      }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-green-500/10 to-transparent shimmer-bg animate-shimmer" />
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </span>

      {/* Ripple effect container */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </button>
  );
};

export default GlassButton;
