
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glowColor?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  style?: React.CSSProperties;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverable = false,
  glowColor = '#22C55E',
  blur = 'xl',
  style,
  onClick
}) => {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-green-200/50 bg-white/80',
        blurClasses[blur],
        hoverable && 'floating-card cursor-pointer',
        className
      )}
      style={{
        boxShadow: `
          0 8px 32px rgba(34, 197, 94, 0.1),
          0 0 1px rgba(34, 197, 94, 0.2) inset,
          ${hoverable ? `0 0 20px ${glowColor}20` : ''}
        `,
        ...style
      }}
      onClick={onClick}
    >
      {/* Holographic gradient overlay */}
      <div className="absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-br from-emerald-500/10 via-transparent to-green-500/10 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
