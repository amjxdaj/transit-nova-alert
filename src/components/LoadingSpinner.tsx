
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#00D4FF',
  text,
  className = ''
}) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Orbital Spinner */}
      <div className={`relative ${sizes[size]}`}>
        {/* Central dot */}
        <div 
          className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}80`
          }}
        />
        
        {/* Orbiting particles */}
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="absolute inset-0 animate-spin"
            style={{
              animationDuration: `${1.5 + index * 0.3}s`,
              animationDelay: `${index * 0.2}s`,
            }}
          >
            <div
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}60`,
                top: '0',
                left: '50%',
                transform: 'translateX(-50%)',
                opacity: 0.8 - index * 0.2,
              }}
            />
          </div>
        ))}
        
        {/* Outer ring */}
        <div 
          className="absolute inset-0 rounded-full border-2 opacity-20"
          style={{ borderColor: color }}
        />
      </div>
      
      {text && (
        <div className="text-center">
          <p className="text-sm text-gray-400 animate-pulse">{text}</p>
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;
