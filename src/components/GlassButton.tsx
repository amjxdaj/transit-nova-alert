
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
    primary: 'border-electric-500/30 text-electric-400 hover:border-electric-400/50 hover:text-electric-300',
    secondary: 'border-white/20 text-white hover:border-white/40',
    success: 'border-neon-500/30 text-neon-400 hover:border-neon-400/50 hover:text-neon-300',
    danger: 'border-red-500/30 text-red-400 hover:border-red-400/50 hover:text-red-300'
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const glowColors = {
    primary: '#00D4FF',
    secondary: '#FFFFFF',
    success: '#39FF14',
    danger: '#FF4444'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'glass-button relative overflow-hidden font-medium transition-all duration-300',
        'backdrop-blur-lg bg-white/10 border rounded-xl',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
        variantStyles[variant],
        sizeStyles[size],
        glowing && 'animate-glow-pulse',
        className
      )}
      style={{
        boxShadow: glowing 
          ? `0 0 20px ${glowColors[variant]}40, 0 4px 15px rgba(0, 0, 0, 0.2)`
          : '0 4px 15px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer-bg animate-shimmer" />
      
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </span>

      {/* Ripple effect container */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </button>
  );
};

export default GlassButton;
