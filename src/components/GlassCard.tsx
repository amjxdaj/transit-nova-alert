
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glowColor?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverable = false,
  glowColor = '#00D4FF',
  blur = 'xl'
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
        'relative rounded-2xl border border-white/10 bg-white/5',
        blurClasses[blur],
        hoverable && 'floating-card cursor-pointer',
        className
      )}
      style={{
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.3),
          0 0 1px rgba(255, 255, 255, 0.1) inset,
          ${hoverable ? `0 0 20px ${glowColor}20` : ''}
        `,
      }}
    >
      {/* Holographic gradient overlay */}
      <div className="absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-br from-electric-500/20 via-transparent to-purple-500/20 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default GlassCard;
